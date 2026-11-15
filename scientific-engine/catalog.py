"""Stage 1-2: CMR catalog (public) + UMM-G metadata enrichment + AOI intersection per scene."""
import importlib.util
import json
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from util import ROOT, aoi_polygon_wgs84, parse_cmr_polygon, to_crs, sanitize, atomic_write_json, iso, utc_now

UMM_ENDPOINT = "https://cmr.earthdata.nasa.gov/search/granules.umm_json"
CONCEPT_URL = "https://cmr.earthdata.nasa.gov/search/concepts/{cid}.umm_json"


def _search_module():
    spec = importlib.util.spec_from_file_location("search_cmr", ROOT / "scripts" / "search_cmr.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def run_cmr_search(cfg, work_dir):
    """Reuse scripts/search_cmr.search (single implementation). Returns the same report structure."""
    mod = _search_module()
    s = cfg["search"]
    bbox = ",".join(str(v) for v in cfg["aoi"]["bbox_wsen"])
    report = {"retrieved_at": utc_now().isoformat(), "scope": "CMR metadata only; not processed measurements",
              "bbox": bbox, "start": s["start"], "end": s["end"], "collections": []}
    for c in s["collections"]:
        try:
            res = mod.search(c["short_name"], bbox, s["start"], s["end"], int(s.get("max_pages", 3)))
        except (HTTPError, URLError, TimeoutError, ValueError, RuntimeError, OSError) as exc:
            res = {"collection": c["short_name"], "status": "error", "error_type": type(exc).__name__,
                   "message": sanitize(exc), "retrieved_count": None}
        report["collections"].append(res)
    return report


def load_catalog_report(path):
    return json.loads(open(path, encoding="utf-8").read())


def _http_json(url, timeout=60, retries=2):
    last = None
    for attempt in range(retries + 1):
        try:
            req = Request(url, headers={"Accept": "application/json", "User-Agent": "FOREST_SAR_HN-engine/0.1"})
            with urlopen(req, timeout=timeout) as r:
                return json.load(r)
        except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
            last = exc
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"UMM request failed: {type(last).__name__}")


def fetch_umm(concept_ids, cache_dir):
    """Batch-fetch UMM-G for granules (public CMR). Caches per concept id. Returns {cid: umm_dict}."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    out, missing = {}, []
    for cid in concept_ids:
        f = cache_dir / f"{cid}.json"
        if f.exists():
            out[cid] = json.loads(f.read_text(encoding="utf-8"))
        else:
            missing.append(cid)
    errors = []
    for i in range(0, len(missing), 20):
        batch = missing[i:i + 20]
        q = urlencode([("concept_id", c) for c in batch] + [("page_size", 50)])
        try:
            payload = _http_json(f"{UMM_ENDPOINT}?{q}")
        except RuntimeError as exc:
            errors.append(str(exc))
            continue
        for item in payload.get("items", []):
            cid = item.get("meta", {}).get("concept-id")
            if cid:
                out[cid] = item
                atomic_write_json(cache_dir / f"{cid}.json", item)
    return out, errors


def _find_key(obj, key):
    if isinstance(obj, dict):
        if key in obj:
            return obj[key]
        for v in obj.values():
            r = _find_key(v, key)
            if r is not None:
                return r
    elif isinstance(obj, list):
        for v in obj:
            r = _find_key(v, key)
            if r is not None:
                return r
    return None


def parse_umm(item):
    """Extract only what exists in UMM; everything else stays None."""
    umm = item.get("umm", {}) if item else {}
    attrs = {}
    for a in umm.get("AdditionalAttributes", []) or []:
        vals = a.get("Values") or []
        attrs[a.get("Name")] = vals[0] if len(vals) == 1 else (list(vals) if vals else None)

    def as_int(v):
        try:
            return int(v)
        except (TypeError, ValueError):
            return None

    def as_list(v):
        if v is None:
            return None
        if isinstance(v, list):
            return [str(x).strip() for x in v]
        return [x.strip() for x in str(v).replace("+", ",").split(",") if x.strip()]

    crid = None
    for ident in (umm.get("DataGranule", {}) or {}).get("Identifiers", []) or []:
        if str(ident.get("IdentifierType", "")).upper() == "CRID":
            crid = ident.get("Identifier")
    size_mb = None
    for f in (umm.get("DataGranule", {}) or {}).get("ArchiveAndDistributionInformation", []) or []:
        if str(f.get("Name", "")).endswith(".h5"):
            if f.get("SizeInBytes") is not None:
                size_mb = float(f["SizeInBytes"]) / 1e6
            elif f.get("Size") is not None:
                unit = str(f.get("SizeUnit", "MB")).upper()
                mult = {"B": 1e-6, "KB": 1e-3, "MB": 1.0, "GB": 1e3}.get(unit)
                size_mb = float(f["Size"]) * mult if mult else None
    look = None
    for plat in umm.get("Platforms", []) or []:
        for inst in plat.get("Instruments", []) or []:
            for ch in inst.get("Characteristics", []) or []:
                if ch.get("Name") == "LookDirection":
                    look = ch.get("Value")
    return {
        "track": as_int(attrs.get("TRACK_NUMBER")),
        "frame": as_int(attrs.get("FRAME_NUMBER")),
        "pass": attrs.get("ASCENDING_DESCENDING"),
        "look_side": look,
        "frequencies": as_list(attrs.get("FREQUENCIES")),
        "pol_A": as_list(attrs.get("FREQUENCY_A_POLARIZATION")),
        "pol_B": as_list(attrs.get("FREQUENCY_B_POLARIZATION")),
        "product_version": attrs.get("PRODUCT_VERSION"),
        "full_frame": attrs.get("FULL_FRAME"),
        "crid": crid,
        "size_mb": size_mb,
        "pge_version": ((umm.get("PGEVersionClass") or {}).get("PGEVersion")),
        "stack_id": attrs.get("STACK_ID"),
    }


def build_scenes(report, cfg, cache_dir, umm_fetch=True):
    """Return (scenes, collection_summary, notes). Order: V1 first, then PROVISIONAL, then BETA."""
    aoi = aoi_polygon_wgs84(cfg)
    aoi_m = to_crs(aoi, "EPSG:4326", cfg["processing"]["metric_crs"])
    meta = {c["short_name"]: c for c in cfg["search"]["collections"]}
    notes, scenes, summary = [], [], []
    by_coll = {c["collection"]: c for c in report["collections"]}
    ordered = sorted(meta, key=lambda k: meta[k]["priority"])
    all_ids = []
    for name in ordered:
        c = by_coll.get(name)
        if not c:
            summary.append({"collection": name, "status": "not_queried", "cmr_hits": None, "retrieved_count": None})
            continue
        summary.append({"collection": name, "status": c.get("status"), "cmr_hits": c.get("cmr_hits"),
                        "retrieved_count": c.get("retrieved_count"), "truncated": c.get("truncated"),
                        "maturity": meta[name]["maturity"], "exploratory": meta[name]["exploratory"]})
        for s in c.get("scenes") or []:
            all_ids.append(s["id"])
    umm_map, errs = ({}, [])
    if umm_fetch and all_ids:
        umm_map, errs = fetch_umm(all_ids, cache_dir)
        notes += [f"UMM fetch error: {e}" for e in errs]
    for name in ordered:
        c = by_coll.get(name)
        if not c:
            continue
        for s in c.get("scenes") or []:
            u = parse_umm(umm_map.get(s["id"]))
            have_umm = s["id"] in umm_map
            poly = None
            try:
                if s.get("polygons"):
                    poly = parse_cmr_polygon(s["polygons"][0][0])
            except (ValueError, IndexError, TypeError):
                poly = None
            inter_km2 = inter_pct = None
            if poly is not None:
                pm = to_crs(poly, "EPSG:4326", cfg["processing"]["metric_crs"])
                inter = pm.intersection(aoi_m)
                inter_km2 = inter.area / 1e6
                inter_pct = 100.0 * inter.area / aoi_m.area
            pols_a = u["pol_A"]
            hv = None if pols_a is None else ("HV" in pols_a)
            size = u["size_mb"] if u["size_mb"] is not None else _num(s.get("data_size"))
            scenes.append({
                "id": s["producer_granule_id"] or s["title"],
                "collection": name,
                "acquired_at": s.get("acquired_start"),
                "track": u["track"], "pass": u["pass"], "look_side": u["look_side"],
                "frequency": None if not u["frequencies"] else "+".join(u["frequencies"]),
                "polarization": None if pols_a is None else "+".join(pols_a),
                "crs": None, "spacing_m": None,
                "footprint": None if poly is None else poly.__geo_interface__,
                "quality_status": "catalog_metadata_only",
                "source_url": CONCEPT_URL.format(cid=s["id"]),
                # additive fields (not in the minimal contract)
                "maturity": meta[name]["maturity"], "exploratory": meta[name]["exploratory"],
                "acquired_end": s.get("acquired_end"), "frame": u["frame"], "cmr_concept_id": s["id"],
                "collection_concept_id": s.get("collection_concept_id"),
                "polarizations_by_frequency": {"A": u["pol_A"], "B": u["pol_B"]},
                "hvhv_expected": hv, "hvhv_verified_in_file": None,
                "aoi_intersection_km2": inter_km2, "aoi_intersection_pct": inter_pct,
                "size_mb": size, "crid": u["crid"], "product_version": u["product_version"],
                "pge_version": u["pge_version"], "full_frame": u["full_frame"],
                "umm_metadata_available": have_umm,
                "_poly": poly,
            })
    return scenes, summary, notes


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def public_scene(s):
    return {k: v for k, v in s.items() if not k.startswith("_")}


_ID_DATE = re.compile(r"_(\d{8})T\d{6}_")
