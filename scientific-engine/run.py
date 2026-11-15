"""FOREST_SAR_HN scientific engine: single entrypoint.

Exit codes: 0 ready | 3 catalog_only (valid degraded outcome) | 4 no_data | 1 error | 2 usage
(also: unknown/non-compatible --pair-id) | 5 blocked (--pair-id mode: no requested pair could be acquired/processed;
nothing published, manifest.json untouched, details in .bosquevivo-work/science/processing-log.last.json).
--pair-id ID[,ID...] (repeatable): process exactly those compatible pairs, one snapshot each; manifest moves only
to the first requested pair's snapshot if published. --rebuild-index: rebuild snapshots/index.json offline.
Network happens only here (CMR public, Harmony/earthaccess with EARTHDATA_TOKEN from the environment).
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import catalog as cat  # noqa: E402
import pairing  # noqa: E402
from util import ROOT, atomic_write_json, clean, iso, load_config, log, sanitize, utc_now  # noqa: E402

EXIT = {"ready": 0, "catalog_only": 3, "no_data": 4, "error": 1, "usage": 2, "blocked": 5}


class StageLog:
    def __init__(self):
        self.stages, self.errors = [], []

    def stage(self, name, status, **info):
        entry = {"stage": name, "status": status, "at": iso(), **clean(info)}
        self.stages.append(entry)
        log(f"[{name}] {status} " + sanitize(json.dumps(clean(info), default=str), 300))

    def error(self, name, exc):
        self.errors.append({"stage": name, "error_type": type(exc).__name__, "message": sanitize(exc)})


def build_parser():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--config", default="config/science.json")
    p.add_argument("--catalog-only", action="store_true", help="stop after catalog/pair evaluation and publish catalog_only")
    p.add_argument("--dry-run", action="store_true", help="no downloads and no writes under public/data")
    p.add_argument("--local-input", default=None, help="directory with local <granule_id>.h5 files")
    p.add_argument("--max-granules", type=int, default=2)
    p.add_argument("--catalog-file", default=None, help="reuse an existing CMR report JSON instead of searching")
    p.add_argument("--pair-id", action="append", default=[], help="compatible pair id(s); repeatable or comma list")
    p.add_argument("--rebuild-index", action="store_true", help="only rebuild snapshots/index.json (no network)")
    p.add_argument("--derive-snapshot", default=None, metavar="SNAPSHOT_ID",
                   help="write derived/ visualisation products for a published snapshot from the local cache (no network)")
    p.add_argument("--force-derived", action="store_true", help="with --derive-snapshot: replace an existing derived/")
    p.add_argument("--fetch-places", action="store_true", help="fetch OSM gazetteer via Overpass into public/data/places")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    slog = StageLog()
    try:
        cfg = load_config(args.config)
    except (OSError, ValueError) as exc:
        log(f"config error: {type(exc).__name__}")
        return 2
    work = ROOT / cfg["paths"]["work"]
    cache = ROOT / cfg["paths"]["cache"]
    public = ROOT / cfg["paths"]["public_data"]
    args.pair_id = [x.strip() for v in args.pair_id for x in v.split(",") if x.strip()]
    if args.fetch_places:
        import places
        try:
            places.fetch(public, work)
        except Exception as exc:  # noqa: BLE001
            log(f"fetch-places error: {type(exc).__name__}: {sanitize(exc, 200)}")
            return 1
        return 0
    if args.derive_snapshot:
        import derive
        try:
            doc = derive.derive_snapshot(cfg, public, cache, args.derive_snapshot, force=args.force_derived)
        except Exception as exc:  # noqa: BLE001
            log(f"derive error: {type(exc).__name__}: {sanitize(exc, 300)}")
            return 1
        log("derived written: " + json.dumps(clean(doc["verification"])))
        return 0
    if args.rebuild_index:
        import snapshot_index
        idx = snapshot_index.rebuild(public, cfg)
        snapshot_index.ensure_manifest_index_path(public)
        log(f"index rebuilt: comparisons={len(idx['comparisons'])} excluded={len(idx['excluded'])}")
        return 0
    max_g = min(args.max_granules, cfg["download_budget"]["max_granules_per_attempt"])
    started = utc_now()
    try:
        import pipeline
        status, detail = pipeline.execute(args, cfg, slog, work, cache, public, max_g, started)
    except Exception as exc:  # controlled failure: never traceback with secrets
        slog.error("pipeline", exc)
        slog.stage("pipeline", "error", error_type=type(exc).__name__)
        status, detail = "error", {"message": sanitize(exc)}
    atomic_write_json(work / "processing-log.last.json",
                      {"status": status, "detail": clean(detail), "stages": slog.stages, "errors": slog.errors,
                       "finished_at": iso()}, indent=2)
    log(f"FINAL status={status}")
    return EXIT.get(status, 1)


if __name__ == "__main__":
    raise SystemExit(main())
