"""Stage 5: load subsets, validity rules, unit detection, common metric grid, AOI/sector rasters."""
import re
from pathlib import Path

import numpy as np

from metrics import GridMismatch
from util import aoi_polygon_wgs84, to_crs

MASK_RULE = ("valid if mask in 1..254 (subswath number of a fully focused averaging ensemble); "
             "0 = invalid ensemble; 255 = fill/outside acquisition")


def load_subset(d, cfg):
    """Pick the first preferred frequency that has HVHV. Returns dict with arrays/transform/crs/tags."""
    import rasterio
    d = Path(d)
    for fq in cfg["processing"]["frequency_preference"]:
        f = fq[-1]
        hv = [p for p in d.glob("*.tif") if re.search(rf"frequency{f}_{cfg['processing']['polarization']}_", p.name)]
        if not hv:
            continue
        out = {"frequency": f, "files": {}}
        for var in (cfg["processing"]["polarization"], "mask", "numberOfLooks"):
            m = [p for p in d.glob("*.tif") if re.search(rf"frequency{f}_{var}_", p.name)]
            if not m:
                out[var] = None
                continue
            with rasterio.open(m[0]) as r:
                out[var] = r.read(1)
                out[var + "_nodata"] = r.nodata
                out["transform"], out["crs"] = tuple(r.transform)[:6], (r.crs.to_string() if r.crs else None)
                out[var + "_tags"] = {k: str(v)[:300] for k, v in r.tags().items()}
                out[var + "_tags_band"] = {k: str(v)[:300] for k, v in r.tags(1).items()}
                out[var + "_descr"] = r.descriptions[0]
                out["files"][var] = m[0]
        if out[cfg["processing"]["polarization"]] is None:
            continue
        out["shape"] = out[cfg["processing"]["polarization"]].shape
        return out
    raise GridMismatch("no frequency with " + cfg["processing"]["polarization"] + " found in subset")


def mask_valid(mask):
    """GCOV mask rule adopted (see MASK_RULE). uint8; fill 255 and 0 excluded."""
    return (mask >= 1) & (mask <= 254)


def detect_unit(hvhv, valid, tags):
    """Return ('linear'|'dB', evidence). Attribute first, then value distribution."""
    txt = " ".join(str(v).lower() for v in tags.values())
    v = hvhv[valid & np.isfinite(hvhv)]
    ev = {"n": int(v.size), "attr_hint": None}
    if v.size == 0:
        raise GridMismatch("no valid HVHV samples")
    ev.update({"min": float(v.min()), "p50": float(np.median(v)), "p99": float(np.percentile(v, 99)),
               "frac_le_zero": float((v <= 0).mean())})
    if re.search(r"\bdb\b|decibel", txt):
        ev["attr_hint"] = "dB"
        return "dB", ev
    if ev["frac_le_zero"] > 0.01 or (ev["p50"] < 0 and ev["p99"] < 10):
        return "dB", ev
    return "linear", ev


def common_grid(a, b, cfg, aoi_m):
    """Both subsets must share CRS; same transform -> pass-through crop to AOI. Different grids are
    reprojected to the coarsest posting on a metric grid (documented)."""
    if not a["crs"] or not b["crs"]:
        raise GridMismatch("CRS missing")
    bx = aoi_m.bounds
    if a["crs"] == b["crs"] and np.allclose(a["transform"], b["transform"]) and a["shape"] == b["shape"]:
        mode, crs, tr = "identical_grid_passthrough", a["crs"], a["transform"]
        res = abs(tr[0])
    else:
        crs = cfg["processing"]["metric_crs"]
        res = max(abs(a["transform"][0]), abs(b["transform"][0]))
        mode, tr = "reprojected_common_grid", None
    return mode, crs, res


def aligned_window(tr, shape, bounds):
    """Integer pixel window (r0,r1,c0,c1) of a north-up grid covering bounds, clipped to the array."""
    x0, y0 = tr[2], tr[5]
    dx, dy = tr[0], tr[4]
    c0 = max(0, int(np.floor((bounds[0] - x0) / dx)))
    c1 = min(shape[1], int(np.ceil((bounds[2] - x0) / dx)))
    r0 = max(0, int(np.floor((bounds[3] - y0) / dy)))
    r1 = min(shape[0], int(np.ceil((bounds[1] - y0) / dy)))
    if c1 <= c0 or r1 <= r0:
        raise GridMismatch("no overlap between scene and AOI")
    return r0, r1, c0, c1


def reproject_to(subset, var, dst_tr, dst_shape, dst_crs, resampling):
    from rasterio.transform import Affine
    from rasterio.warp import reproject
    src = subset[var]
    nod = np.nan if src.dtype.kind == "f" else subset.get(var + "_nodata")
    dst = np.full(dst_shape, np.nan if src.dtype.kind == "f" else 255, dtype=src.dtype)
    reproject(src, dst, src_transform=Affine(*subset["transform"]), src_crs=subset["crs"], src_nodata=nod,
              dst_transform=Affine(*dst_tr), dst_crs=dst_crs, dst_nodata=nod, resampling=resampling)
    return dst


def prepare_aligned(a, b, cfg, aoi_m):
    """Returns dict with aligned arrays for both dates on one grid + AOI raster, transform, crs, mode."""
    from rasterio.enums import Resampling
    from rasterio.features import geometry_mask
    from rasterio.transform import Affine
    mode, crs, res = common_grid(a, b, cfg, aoi_m)
    bx = aoi_m.bounds
    pol = cfg["processing"]["polarization"]
    if mode == "identical_grid_passthrough":
        r0, r1, c0, c1 = aligned_window(a["transform"], a["shape"], bx)
        tr0 = a["transform"]
        tr = (tr0[0], 0.0, tr0[2] + c0 * tr0[0], 0.0, tr0[4], tr0[5] + r0 * tr0[4])
        sl = (slice(r0, r1), slice(c0, c1))
        out = {k: (a[k][sl], b[k][sl]) for k in (pol, "mask", "numberOfLooks") if a.get(k) is not None and b.get(k) is not None}
        shape = out[pol][0].shape
    else:
        x0, y1 = np.floor(bx[0] / res) * res, np.ceil(bx[3] / res) * res
        w, h = int(np.ceil((bx[2] - x0) / res)), int(np.ceil((y1 - bx[1]) / res))
        tr = (res, 0.0, x0, 0.0, -res, y1)
        shape = (h, w)
        out = {}
        for k, rs in ((pol, Resampling.bilinear), ("mask", Resampling.nearest), ("numberOfLooks", Resampling.nearest)):
            if a.get(k) is not None and b.get(k) is not None:
                out[k] = (reproject_to(a, k, tr, shape, crs, rs), reproject_to(b, k, tr, shape, crs, rs))
    aoi_px = geometry_mask([aoi_m.__geo_interface__], out_shape=shape, transform=Affine(*tr), invert=True)
    return {"mode": mode, "crs": crs, "transform": tr, "shape": shape, "arrays": out, "aoi_mask": aoi_px}


def sector_labels(tr, shape, size_m):
    """Integer sector key per pixel centre (gx, gy) = floor(x/size), floor(y/size) in metric CRS."""
    cols = tr[2] + (np.arange(shape[1]) + 0.5) * tr[0]
    rows = tr[5] + (np.arange(shape[0]) + 0.5) * tr[4]
    gx = np.floor(cols / size_m).astype(np.int64)
    gy = np.floor(rows / size_m).astype(np.int64)
    return gx, gy
