"""Comparison index public/data/snapshots/index.json, rebuilt by scanning snapshots/*/ with results.json.

Only snapshots whose parameters match the current config enter `comparisons`; the rest go to `excluded`
with a reason. Same pair_id in several snapshots: the most recent wins. No network.
"""
import json
from pathlib import Path

from util import atomic_write_json, clean, iso

INDEX_REL = "snapshots/index.json"


def _read(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def method_of(cfg):
    pc = cfg["processing"]
    return {"algorithm_version": cfg["algorithm_version"], "polarization": pc["polarization"],
            "threshold_db": pc["threshold_db"], "multilook_px": pc["multilook_px"],
            "multilook_min_valid_fraction": pc["multilook_min_valid_fraction"]}


def _mismatches(res, pair, method):
    p = pair.get("params") or {}
    out = []
    if res.get("algorithm_version") != method["algorithm_version"]:
        out.append(f"algorithm_version {res.get('algorithm_version')} != {method['algorithm_version']}")
    if pair.get("polarization") != method["polarization"]:
        out.append(f"polarization {pair.get('polarization')} != {method['polarization']}")
    for k in ("threshold_db", "multilook_px", "multilook_min_valid_fraction"):
        if p.get(k) != method[k]:
            out.append(f"{k} {p.get(k)} != {method[k]} (not comparable with current method)")
    return out


def _entry(sid, base, res, pair, snap_dir):
    cat, scene, cpair = {}, {}, {}
    try:
        cat = _read(snap_dir / "catalog.json")
        cpair = next((x for x in cat.get("pairs", []) if x["id"] == pair["pair_id"]), {})
        scene = next((s for s in cat.get("scenes", []) if s["id"] == pair["initial_id"]), {})
    except (OSError, ValueError):
        pass
    days = pair.get("interval_days") or cpair.get("interval_days")
    m = pair["metrics"]
    return {"snapshot_id": sid, "pair_id": pair["pair_id"], "initial_id": pair["initial_id"],
            "final_id": pair["final_id"], "initial_date": pair["initial_date"], "final_date": pair["final_date"],
            "interval_days": int(round(days)) if days is not None else None,
            "track": scene.get("track"), "frame": scene.get("frame"), "pass": scene.get("pass"),
            "collection": cpair.get("collection") or scene.get("collection"), "maturity": pair.get("maturity"),
            "common_coverage_pct": cpair.get("common_coverage_pct"),
            "catalog_path": f"{base}/catalog.json", "results_path": f"{base}/results.json",
            "sectors_path": f"{base}/sectors.geojson",
            "derived_path": (f"{base}/derived/derived.json" if (snap_dir / "derived" / "derived.json").is_file() else None),
            "processing_log_path": f"{base}/processing-log.json",
            "metrics": {k: m.get(k) for k in ("valid_area_ha", "candidate_area_ha", "candidate_pct", "coverage_pct")}}


def build(public, cfg):
    public = Path(public)
    snaps = public / "snapshots"
    method = method_of(cfg)
    cands, excluded = [], []
    for d in sorted(snaps.iterdir() if snaps.is_dir() else [], key=lambda p: p.name):
        if not d.is_dir() or d.name.startswith(".") or not (d / "results.json").is_file():
            continue
        try:
            res = _read(d / "results.json")
            pair = res["pairs"][0]
            bad = _mismatches(res, pair, method)
            entry = None if bad else _entry(d.name, f"snapshots/{d.name}", res, pair, d)
        except (OSError, ValueError, KeyError, IndexError) as exc:
            excluded.append({"snapshot_id": d.name, "reason": f"unreadable results ({type(exc).__name__})"})
            continue
        if bad:
            excluded.append({"snapshot_id": d.name, "reason": "; ".join(bad)})
        else:
            cands.append(entry)
    cands.sort(key=lambda e: e["snapshot_id"], reverse=True)  # newest first
    comps, seen = [], {}
    for e in cands:
        if e["pair_id"] in seen:
            excluded.append({"snapshot_id": e["snapshot_id"],
                             "reason": f"duplicate pair_id {e['pair_id']}: superseded by {seen[e['pair_id']]}"})
        else:
            seen[e["pair_id"]] = e["snapshot_id"]
            comps.append(e)
    comps.sort(key=lambda e: e["interval_days"] if e["interval_days"] is not None else 1e9)
    comps.sort(key=lambda e: e["final_date"], reverse=True)  # stable: final_date desc, interval asc
    excluded.sort(key=lambda x: x["snapshot_id"])
    has_places = (public / "places" / "places.json").is_file()
    return clean({"schema_version": 1, "updated_at": iso(), "method": method,
                  "places_path": "places/places.json" if has_places else None,
                  "comparisons": comps, "excluded": excluded})


def rebuild(public, cfg):
    idx = build(public, cfg)
    atomic_write_json(Path(public) / INDEX_REL, idx, indent=2)
    return idx


def ensure_manifest_index_path(public):
    """Add only `index_path` to an existing manifest (no other field changes)."""
    mp = Path(public) / "manifest.json"
    if not mp.is_file():
        return False
    m = _read(mp)
    if m.get("index_path") == INDEX_REL:
        return False
    m["index_path"] = INDEX_REL
    atomic_write_json(mp, m, indent=2)
    return True


def point_manifest_to(public, snapshot_id):
    """Point manifest at a ready snapshot (other fields as export.publish would write)."""
    import export
    export.write_manifest(public, snapshot_id, "ready")
