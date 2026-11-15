"""Stage 3: evaluate every candidate pair of scenes and choose one compatible pair.

A pair is `compatible` only if, from catalog/UMM metadata: same collection (maturity), same product
version, same track/frame/pass/look side, same frequencies and HV polarisation available, different
acquisition dates, and common AOI coverage >= threshold. Missing critical metadata -> needs_review.
Compatibility is re-verified against the HDF5 metadata at processing time.
"""
import hashlib
from datetime import datetime

from util import to_crs


def _dt(s):
    return datetime.strptime(s[:19], "%Y-%m-%dT%H:%M:%S")


def _pair_id(a, b):
    return "pair-" + hashlib.sha1((a["id"] + "|" + b["id"]).encode()).hexdigest()[:10]


def evaluate_pair(a, b, aoi_m, min_cov_pct, metric_crs):
    """a is initial (earlier), b is final. Returns dict with status/reason/common_coverage_pct."""
    reasons_inc, reasons_rev = [], []
    cov = None
    if a["_poly"] is None or b["_poly"] is None:
        reasons_rev.append("footprint missing in catalog")
    else:
        inter = (to_crs(a["_poly"], "EPSG:4326", metric_crs)
                 .intersection(to_crs(b["_poly"], "EPSG:4326", metric_crs)).intersection(aoi_m))
        cov = 100.0 * inter.area / aoi_m.area
        if cov <= 0:
            reasons_inc.append("no common footprint area inside the AOI")
        elif cov < min_cov_pct:
            reasons_inc.append(f"common AOI coverage {cov:.1f}% below minimum {min_cov_pct:g}%")
    if a["collection"] != b["collection"]:
        reasons_inc.append(f"different collection/maturity ({a['maturity']} vs {b['maturity']}); "
                           "no documented justification for mixing")
    for key, label in (("track", "track"), ("frame", "frame"), ("pass", "pass direction"),
                       ("look_side", "look side"), ("frequency", "frequency set")):
        va, vb = a[key], b[key]
        if va is None or vb is None:
            reasons_rev.append(f"{label} unknown")
        elif va != vb:
            reasons_inc.append(f"different {label} ({va} vs {vb})")
    for s, tag in ((a, "initial"), (b, "final")):
        if s["hvhv_expected"] is None:
            reasons_rev.append(f"HV polarisation unknown for {tag}")
        elif not s["hvhv_expected"]:
            reasons_inc.append(f"HV polarisation not listed for {tag}")
    if a["polarizations_by_frequency"] != b["polarizations_by_frequency"]:
        reasons_inc.append("different polarisation sets")
    if a["product_version"] is not None and b["product_version"] is not None \
            and a["product_version"] != b["product_version"]:
        reasons_rev.append(f"different product version ({a['product_version']} vs {b['product_version']})")
    elif a["product_version"] is None or b["product_version"] is None:
        reasons_rev.append("product version unknown")
    if a["crid"] and b["crid"] and a["crid"] != b["crid"]:
        reasons_rev.append(f"different processing release CRID ({a['crid']} vs {b['crid']}); "
                           "radiometric consistency not documented")
    if a["acquired_at"] and b["acquired_at"]:
        days = (_dt(b["acquired_at"]) - _dt(a["acquired_at"])).total_seconds() / 86400
        if days < 1:
            reasons_inc.append("acquisitions less than one day apart (same pass)")
    else:
        days = None
        reasons_rev.append("acquisition time unknown")
    if reasons_inc:
        status, reason = "incompatible", "; ".join(reasons_inc + reasons_rev)
    elif reasons_rev:
        status, reason = "needs_review", "; ".join(reasons_rev)
    else:
        status = "compatible"
        reason = "same collection, product version, track, frame, pass, look side, frequencies and HV; common coverage ok"
    return {"id": _pair_id(a, b), "initial_id": a["id"], "final_id": b["id"], "status": status,
            "reason": reason, "common_coverage_pct": cov, "processed": False,
            "collection": a["collection"] if a["collection"] == b["collection"] else None,
            "interval_days": days}


def evaluate_all(scenes, cfg):
    from util import aoi_polygon_wgs84
    metric = cfg["processing"]["metric_crs"]
    aoi_m = to_crs(aoi_polygon_wgs84(cfg), "EPSG:4326", metric)
    min_cov = cfg["processing"]["min_common_coverage_pct"]
    # only scenes that actually intersect the AOI take part (others are listed as scenes, not paired)
    cand = [s for s in scenes if (s.get("aoi_intersection_km2") or 0) > 0 and s["acquired_at"]]
    cand.sort(key=lambda s: s["acquired_at"])
    pairs = []
    for i in range(len(cand)):
        for j in range(i + 1, len(cand)):
            a, b = cand[i], cand[j]
            if a["acquired_at"][:19] == b["acquired_at"][:19]:
                continue
            pairs.append(evaluate_pair(a, b, aoi_m, min_cov, metric))
    return pairs


def choose_pair(pairs, scenes, cfg):
    """Among compatible pairs in the highest-priority collection tier that has any: keep those with common
    coverage >= 90% of the tier maximum, then the most recent final date, then the longer interval."""
    prio = {c["short_name"]: c["priority"] for c in cfg["search"]["collections"]}
    byid = {s["id"]: s for s in scenes}
    comp = [p for p in pairs if p["status"] == "compatible" and p["collection"]]
    if not comp:
        return None, "no pair passed all compatibility checks"
    best_tier = min(prio[p["collection"]] for p in comp)
    tier = [p for p in comp if prio[p["collection"]] == best_tier]
    mx = max(p["common_coverage_pct"] for p in tier)
    tier = [p for p in tier if p["common_coverage_pct"] >= 0.9 * mx]
    tier.sort(key=lambda p: (byid[p["final_id"]]["acquired_at"], -(p["interval_days"] or 1e9),
                             p["common_coverage_pct"]), reverse=True)
    return tier[0], ("highest-priority collection tier with a compatible pair; coverage within 90% of the tier "
                     "maximum; most recent final date; then shortest interval (fewest temporal confounders)")
