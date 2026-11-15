"""Orchestration of stages: catalog -> inspect -> pairs -> acquire -> process -> metrics -> export."""
import json
from collections import Counter

import catalog as cat
import pairing
from util import ROOT, aoi_polygon_wgs84, atomic_write_json, clean, to_crs


def execute(args, cfg, slog, work, cache, public, max_g, started):
    # ---- 1. catalog
    if args.catalog_file:
        path = ROOT / args.catalog_file if not args.catalog_file.startswith(("/", "C:", "c:")) else args.catalog_file
        report = cat.load_catalog_report(path)
        slog.stage("catalog", "ok", source="file", file=str(args.catalog_file), retrieved_at=report.get("retrieved_at"))
    else:
        report = cat.run_cmr_search(cfg, work)
        slog.stage("catalog", "ok", source="cmr_live", retrieved_at=report.get("retrieved_at"))
    bad = [c["collection"] for c in report["collections"] if c.get("status") != "ok"]
    if bad:
        slog.stage("catalog", "error", failed_collections=bad)
    # ---- 2. inspect
    scenes, summary, notes = cat.build_scenes(report, cfg, cache / "umm")
    slog.stage("inspect", "ok", scenes=len(scenes), notes=notes,
               in_aoi=sum(1 for s in scenes if (s["aoi_intersection_km2"] or 0) > 0))
    # ---- 3. pairs
    pairs = pairing.evaluate_all(scenes, cfg)
    cnt = Counter(p["status"] for p in pairs)
    chosen, why = pairing.choose_pair(pairs, scenes, cfg)
    slog.stage("pairing", "ok", evaluated=len(pairs), by_status=dict(cnt), chosen=chosen and chosen["id"], rule=why)
    atomic_write_json(work / "catalog-inspection.json",
                      {"summary": summary, "scenes": [cat.public_scene(s) for s in scenes], "pairs": pairs}, indent=1)
    pair_ids = getattr(args, "pair_id", None) or []
    if pair_ids:
        return _execute_pairs(args, cfg, slog, work, cache, public, scenes, pairs, summary, report, cnt, pair_ids)
    if args.dry_run:
        slog.stage("export", "skipped", reason="dry-run")
        return "catalog_only", {"pairs": dict(cnt), "dry_run": True}
    if not args.catalog_only and chosen and max_g >= 2:
        try:
            res = _process(args, cfg, slog, work, cache, public, scenes, pairs, summary, report, chosen, cnt)
            if res[0] == "ready":
                _derive(cfg, slog, cache, public, res[1]["snapshot_id"])
                _rebuild_index(cfg, slog, public)
            return res
        except Exception as exc:  # noqa: BLE001
            slog.error("acquire_process", exc)
            slog.stage("acquire_process", "blocked", error_type=type(exc).__name__, message=str(exc)[:300])
            return _publish_catalog_only(cfg, slog, public, scenes, pairs, summary, report, chosen, cnt,
                                         "acquisition/processing blocked: " + type(exc).__name__ + ": "
                                         + str(exc)[:300])
    return _publish_catalog_only(cfg, slog, public, scenes, pairs, summary, report, chosen, cnt,
                                 "catalog-only requested" if args.catalog_only else "acquisition/processing not completed")


def _process(args, cfg, slog, work, cache, public, scenes, pairs, summary, report, chosen, cnt,
             update_manifest=True):
    import acquisition
    from util import sanitize
    byid = {s["id"]: s for s in scenes}
    ini, fin = byid[chosen["initial_id"]], byid[chosen["final_id"]]
    subsets = {}
    for tag, sc in (("initial", ini), ("final", fin)):
        d, meta, method = acquisition.acquire(sc, cfg, cache, args.local_input)
        subsets[tag] = (d, meta)
        slog.stage("acquire", "ok", scene=sc["id"], tag=tag, method=method)
    import process_pair
    return process_pair.run(cfg, slog, work, public, scenes, pairs, summary, report, chosen, cnt, ini, fin, subsets,
                            update_manifest=update_manifest)


def _publish_catalog_only(cfg, slog, public, scenes, pairs, summary, report, chosen, cnt, why):
    import export
    from util import iso, utc_now
    sid = utc_now().strftime("%Y%m%dT%H%M%SZ") + "-" + cfg["_config_sha256"][:8]
    catalog = export.make_catalog([cat.public_scene(s) for s in scenes], pairs, cfg, summary,
                                  report.get("retrieved_at"))
    plog = {"schema_version": 1, "snapshot_id": sid, "status": "catalog_only", "reason": why,
            "generated_at": iso(), "config_version": cfg["config_version"], "config_sha256": cfg["_config_sha256"],
            "parameters": cfg["processing"], "pairs_by_status": dict(cnt),
            "chosen_pair": chosen and chosen["id"], "stages": slog.stages}
    m = export.publish(public, sid, "catalog_only", catalog, plog, message=why)
    slog.stage("export", "ok", snapshot_id=sid, published_status="catalog_only")
    return "catalog_only", {"manifest": m["snapshot_id"], "pairs": dict(cnt)}


def _derive(cfg, slog, cache, public, sid):
    """Derived visualisation products; a failure never undoes the already published snapshot."""
    try:
        import derive
        doc = derive.derive_snapshot(cfg, public, cache, sid)
        slog.stage("derive", "ok", snapshot_id=sid, verification=doc["verification"])
    except Exception as exc:  # noqa: BLE001
        slog.stage("derive", "warn", snapshot_id=sid, error_type=type(exc).__name__, message=str(exc)[:300])


def _rebuild_index(cfg, slog, public):
    import snapshot_index
    idx = snapshot_index.rebuild(public, cfg)
    slog.stage("index", "ok", comparisons=len(idx["comparisons"]), excluded=len(idx["excluded"]))
    return idx


def validate_pair_ids(pair_ids, pairs):
    """Return (selected pair dicts in request order, errors). Only existing 'compatible' pairs are accepted."""
    byid = {p["id"]: p for p in pairs}
    sel, errs = [], []
    for pid in dict.fromkeys(pair_ids):
        p = byid.get(pid)
        if p is None:
            errs.append(f"{pid}: not found in catalog pairs")
        elif p["status"] != "compatible":
            errs.append(f"{pid}: status {p['status']} (only compatible pairs are accepted)")
        else:
            sel.append(p)
    return sel, errs


def _execute_pairs(args, cfg, slog, work, cache, public, scenes, pairs, summary, report, cnt, pair_ids):
    """--pair-id mode: one snapshot per requested compatible pair; never publishes catalog_only and never
    touches manifest.json on failure. Manifest is moved only to the first requested pair's snapshot (if it was
    published), otherwise left as is."""
    import snapshot_index
    sel, errs = validate_pair_ids(pair_ids, pairs)
    if errs:
        for e in errs:
            slog.stage("pair_select", "rejected", reason=e)
        return "usage", {"rejected": errs}
    byid = {s["id"]: s for s in scenes}
    for p in sel:
        a, b = byid[p["initial_id"]], byid[p["final_id"]]
        slog.stage("pair_select", "ok", pair=p["id"], initial=a["acquired_at"][:10], final=b["acquired_at"][:10],
                   interval_days=p["interval_days"], coverage_pct=p["common_coverage_pct"],
                   track=a["track"], frame=a["frame"], pass_=a["pass"], look=a["look_side"],
                   frequency=a["frequency"], hvhv_expected=[a["hvhv_expected"], b["hvhv_expected"]],
                   collection=p["collection"])
    if args.dry_run:
        slog.stage("export", "skipped", reason="dry-run")
        return "catalog_only", {"pairs": dict(cnt), "dry_run": True, "selected": [p["id"] for p in sel]}
    published, blocked = {}, {}
    for p in sel:
        try:
            status, det = _process(args, cfg, slog, work, cache, public, scenes, pairs, summary, report, p, cnt,
                                   update_manifest=False)
            published[p["id"]] = det["snapshot_id"]
        except Exception as exc:  # noqa: BLE001
            from util import sanitize
            blocked[p["id"]] = f"{type(exc).__name__}: {sanitize(exc, 300)}"
            slog.error("acquire_process", exc)
            slog.stage("acquire_process", "blocked", pair=p["id"], error_type=type(exc).__name__,
                       message=sanitize(exc, 300))
    if not published:
        return "blocked", {"blocked": blocked, "manifest_touched": False}
    for sid_ in published.values():
        _derive(cfg, slog, cache, public, sid_)
    _rebuild_index(cfg, slog, public)
    first = sel[0]["id"]
    manifest_to = None
    if first in published:
        snapshot_index.point_manifest_to(public, published[first])
        manifest_to = published[first]
    else:
        snapshot_index.ensure_manifest_index_path(public)
    return "ready", {"published": published, "blocked": blocked, "manifest_snapshot": manifest_to}
