"""Transactional export to public/data: temp dir -> validate -> rename -> atomic manifest replace.

The previous manifest/snapshot stays untouched until the new snapshot is complete and valid.
"""
import json
import os
import shutil
from pathlib import Path

from util import atomic_write_json, clean, iso

CATALOG_KEYS = {"schema_version", "source", "query", "scenes", "pairs"}
SCENE_KEYS = {"id", "collection", "acquired_at", "track", "pass", "look_side", "frequency", "polarization",
              "crs", "spacing_m", "footprint", "quality_status", "source_url"}
PAIR_KEYS = {"id", "initial_id", "final_id", "status", "reason", "common_coverage_pct"}
RESULTS_KEYS = {"schema_version", "snapshot_id", "data_mode", "processed_at", "algorithm_version", "pairs"}
RESULT_PAIR_KEYS = {"pair_id", "region_id", "initial_id", "final_id", "initial_date", "final_date", "source",
                    "maturity", "metrics", "params", "evidence_level", "limitations", "layers", "provenance"}
METRIC_KEYS = {"valid_area_ha", "candidate_area_ha", "candidate_pct", "coverage_pct", "cv_initial_ha",
               "cv_final_ha", "tp_pct", "rhythm_12d"}
PARAM_KEYS = {"threshold_db", "noise_floor_db", "normalization_offset_db", "mask_rule", "minimum_patch_ha"}
STATUSES = {"ready", "catalog_only", "no_data", "error"}


class ExportError(ValueError):
    pass


def make_catalog(scenes_public, pairs, cfg, summary, retrieved_at):
    s = cfg["search"]
    return {"schema_version": 1, "source": "NASA-ISRO NISAR",
            "query": {"bbox": cfg["aoi"]["bbox_wsen"], "start": s["start"], "end": s["end"]},
            "scenes": scenes_public, "pairs": pairs,
            "data_mode": "real", "cmr_retrieved_at": retrieved_at, "collections": summary,
            "aoi_label": cfg["aoi"]["label"], "config_version": cfg["config_version"]}


def validate_catalog(c):
    missing = CATALOG_KEYS - set(c)
    if missing:
        raise ExportError(f"catalog missing {sorted(missing)}")
    for s in c["scenes"]:
        if SCENE_KEYS - set(s):
            raise ExportError("scene missing keys")
    for p in c["pairs"]:
        if PAIR_KEYS - set(p) or p["status"] not in {"compatible", "incompatible", "needs_review"}:
            raise ExportError("pair malformed")
    ids = {s["id"] for s in c["scenes"]}
    if any(p["initial_id"] not in ids or p["final_id"] not in ids for p in c["pairs"]):
        raise ExportError("pair references unknown scene")


def results_sid(r):
    return r["snapshot_id"]


def validate_results(r, snapshot_dir):
    if RESULTS_KEYS - set(r):
        raise ExportError("results missing keys")
    if r["data_mode"] != "real":
        raise ExportError("only data_mode=real may be published")
    for p in r["pairs"]:
        if RESULT_PAIR_KEYS - set(p) or METRIC_KEYS - set(p["metrics"]) or PARAM_KEYS - set(p["params"]):
            raise ExportError("results pair malformed")
        for name, layer in (p["layers"] or {}).items():
            if layer is None:
                continue
            prefix = f"snapshots/{results_sid(r)}/"
            if not layer["url"].startswith(prefix):
                raise ExportError(f"layer url not under snapshot: {name}")
            f = Path(snapshot_dir) / layer["url"][len(prefix):]
            if not f.is_file():
                raise ExportError(f"layer file missing: {name}")
            if f.stat().st_size > 2_000_000:
                raise ExportError(f"layer too large: {name}")


def publish(public_dir, snapshot_id, status, catalog, processing_log, results=None, sectors=None,
            extra_files=None, data_mode="real", message=None, update_manifest=True):
    """extra_files: {relative name inside snapshot: source path to move/copy}. Returns manifest dict."""
    if data_mode != "real":
        raise ExportError("refusing to publish non-real data into public data")
    if status not in STATUSES:
        raise ExportError("bad status")
    public_dir = Path(public_dir)
    snaps = public_dir / "snapshots"
    tmp = snaps / f".tmp-{snapshot_id}"
    final = snaps / snapshot_id
    if final.exists():
        raise ExportError("snapshot id already exists")
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir(parents=True)
    try:
        validate_catalog(catalog)
        atomic_write_json(tmp / "catalog.json", clean(catalog))
        atomic_write_json(tmp / "processing-log.json", clean(processing_log), indent=1)
        for rel, src in (extra_files or {}).items():
            dst = tmp / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dst)
        if status == "ready":
            if results is None or sectors is None:
                raise ExportError("ready requires results and sectors")
            validate_results(results, tmp)
            atomic_write_json(tmp / "results.json", clean(results))
            atomic_write_json(tmp / "sectors.geojson", clean(sectors))
        os.replace(tmp, final)
    except Exception:
        shutil.rmtree(tmp, ignore_errors=True)
        raise
    if not update_manifest:
        return None
    return write_manifest(public_dir, snapshot_id, status, message)


def write_manifest(public_dir, snapshot_id, status, message=None):
    public_dir = Path(public_dir)
    base = f"snapshots/{snapshot_id}"
    manifest = {"schema_version": 1, "status": status, "snapshot_id": snapshot_id, "updated_at": iso(),
                "catalog_path": f"{base}/catalog.json",
                "results_path": f"{base}/results.json" if status == "ready" else None,
                "sectors_path": f"{base}/sectors.geojson" if status == "ready" else None,
                "processing_log_path": f"{base}/processing-log.json", "data_mode": "real", "message": message,
                "index_path": "snapshots/index.json"}
    atomic_write_json(public_dir / "manifest.json", manifest, indent=2)
    return manifest
