"""Pure numeric functions (contract sections 3-4). No I/O."""
import math

import numpy as np


class GridMismatch(ValueError):
    pass


def require_same_grid(a, b):
    """a, b: dicts with crs (str|None), transform (6-tuple a,b,c,d,e,f), shape (h,w). Reject anything differing."""
    if not a.get("crs") or not b.get("crs"):
        raise GridMismatch("CRS missing")
    if str(a["crs"]) != str(b["crs"]):
        raise GridMismatch("different CRS")
    if tuple(a["shape"]) != tuple(b["shape"]):
        raise GridMismatch("different shape")
    if not np.allclose(a["transform"], b["transform"], rtol=0, atol=1e-6):
        raise GridMismatch("different transform")


def to_db(values, unit):
    """Linear gamma0 power -> dB. Values already in dB are returned unchanged (never reconverted)."""
    v = np.asarray(values, dtype=np.float64)
    if unit == "dB":
        return v.copy()
    if unit != "linear":
        raise ValueError("unit must be 'linear' or 'dB'")
    out = np.full(v.shape, np.nan)
    ok = np.isfinite(v) & (v > 0)
    out[ok] = 10.0 * np.log10(v[ok])
    return out


def delta_candidates(initial, final, valid_initial, valid_final, threshold_db=3.0, unit="linear", offset_db=0.0):
    """Inputs already aligned. delta_db = db_final - db_initial (- offset). candidate if delta <= -threshold."""
    initial, final = np.asarray(initial), np.asarray(final)
    if initial.shape != final.shape or valid_initial.shape != initial.shape or valid_final.shape != initial.shape:
        raise GridMismatch("shape mismatch")
    if not (np.isfinite(threshold_db) and threshold_db > 0):
        raise ValueError("threshold must be positive and finite")
    di, df = to_db(initial, unit), to_db(final, unit)
    valid = valid_initial.astype(bool) & valid_final.astype(bool) & np.isfinite(di) & np.isfinite(df)
    delta = np.full(initial.shape, np.nan, dtype=np.float64)
    delta[valid] = df[valid] - di[valid] - offset_db
    candidate = valid & (delta <= -threshold_db)
    return delta, valid, candidate


def multilook_blocks(initial, final, valid, n, min_valid_fraction, unit="linear"):
    """Average LINEAR power over non-overlapping n x n blocks using only pixels valid in both dates.
    A cell is valid if valid_fraction >= min_valid_fraction (and at least one pixel). Trailing rows/columns that
    do not fill a block are dropped. dB inputs are converted to linear before averaging (never averaged in dB).
    Returns (mean_initial_linear, mean_final_linear, cell_valid, valid_fraction)."""
    if n < 1 or int(n) != n:
        raise ValueError("n must be a positive integer")
    if not (0 < min_valid_fraction <= 1):
        raise ValueError("min_valid_fraction must be in (0, 1]")
    if unit == "dB":
        initial, final = 10.0 ** (np.asarray(initial, np.float64) / 10.0), 10.0 ** (np.asarray(final, np.float64) / 10.0)
    elif unit != "linear":
        raise ValueError("unit must be 'linear' or 'dB'")
    H, W = (valid.shape[0] // n) * n, (valid.shape[1] // n) * n
    if H == 0 or W == 0:
        raise ValueError("array smaller than one block")
    ok = (valid[:H, :W] & np.isfinite(initial[:H, :W]) & np.isfinite(final[:H, :W])
          & (initial[:H, :W] > 0) & (final[:H, :W] > 0))

    def blocks(a):
        return np.where(ok, np.asarray(a[:H, :W], np.float64), 0.0).reshape(H // n, n, W // n, n).sum(axis=(1, 3))

    cnt = ok.reshape(H // n, n, W // n, n).sum(axis=(1, 3))
    frac = cnt / float(n * n)
    cell_valid = (cnt > 0) & (frac >= min_valid_fraction)
    with np.errstate(invalid="ignore", divide="ignore"):
        mi, mf = blocks(initial) / cnt, blocks(final) / cnt
    mi[~cell_valid], mf[~cell_valid] = np.nan, np.nan
    return mi, mf, cell_valid, frac


def aggregate_transform(transform, n):
    a, b, c, d, e, f = transform[:6]
    return (a * n, b, c, d, e * n, f)


def pixel_area_m2(transform):
    a, b, _, d, e, _ = transform[:6]
    return abs(a * e - b * d)


def area_metrics(valid_px, candidate_px, px_area_m2, region_area_ha):
    valid_ha = valid_px * px_area_m2 / 10000.0
    cand_ha = candidate_px * px_area_m2 / 10000.0
    return {"valid_area_ha": valid_ha, "candidate_area_ha": cand_ha,
            "candidate_pct": (100.0 * cand_ha / valid_ha) if valid_ha > 0 else None,
            "coverage_pct": (100.0 * valid_ha / region_area_ha) if region_area_ha and region_area_ha > 0 else None}


def aggregate_sectors(sector_metrics, sector_areas_ha):
    """Total from summed areas of non-overlapping sectors (never a mean of percentages)."""
    valid = sum(m["valid_area_ha"] for m in sector_metrics)
    cand = sum(m["candidate_area_ha"] for m in sector_metrics)
    region = sum(sector_areas_ha)
    return {"valid_area_ha": valid, "candidate_area_ha": cand,
            "candidate_pct": (100.0 * cand / valid) if valid > 0 else None,
            "coverage_pct": (100.0 * valid / region) if region > 0 else None}


def tp_pct(cv_initial, cv_final):
    if cv_initial is None or cv_final is None or not cv_initial > 0:
        return None
    return (cv_initial - cv_final) / cv_initial * 100.0


def rhythm_12d(tp, days):
    if tp is None or days is None or not days > 0:
        return None
    return tp / (days / 12.0)


def traffic_light(tp):
    """Experimental team cuts: <0 gain; 0-2 stable; >2-5 watch; >5-10 caution; >10-18 high; >18 very high."""
    if tp is None or (isinstance(tp, float) and math.isnan(tp)):
        return "not_evaluated"
    if tp < 0:
        return "net_gain"
    if tp <= 2:
        return "stable"
    if tp <= 5:
        return "watch"
    if tp <= 10:
        return "caution"
    if tp <= 18:
        return "high_priority"
    return "very_high_priority"
