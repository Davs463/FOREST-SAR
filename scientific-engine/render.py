"""PNG overlay layers (Leaflet ImageOverlay): data warped to EPSG:3857 over the AOI bounding box."""
from pathlib import Path

import numpy as np

from util import aoi_polygon_wgs84, to_crs, write_png_gray_alpha, write_png_palette

DB_MIN, DB_MAX = -25.0, -5.0
DELTA_LIM = 10.0
N_DELTA = 20


def _grid(cfg, max_w):
    poly = to_crs(aoi_polygon_wgs84(cfg), "EPSG:4326", "EPSG:3857")
    bx = poly.bounds
    res = (bx[2] - bx[0]) / max_w
    h = int(np.ceil((bx[3] - bx[1]) / res))
    return (res, 0.0, bx[0], 0.0, -res, bx[3]), (h, max_w), bx


def _warp(arr, src_tr, src_crs, dst_tr, dst_shape, resampling, nodata=np.nan, dtype=np.float32):
    from rasterio.transform import Affine
    from rasterio.warp import reproject
    dst = np.full(dst_shape, nodata, dtype=dtype)
    reproject(np.ascontiguousarray(arr, dtype=dtype), dst, src_transform=Affine(*src_tr), src_crs=src_crs,
              src_nodata=nodata, dst_transform=Affine(*dst_tr), dst_crs="EPSG:3857", dst_nodata=nodata,
              resampling=resampling)
    return dst


def _delta_palette():
    pal = [(0, 0, 0, 0)]
    for i in range(N_DELTA):
        t = (i + 0.5) / N_DELTA * 2 - 1          # -1 .. +1
        if t < 0:   # decrease -> dark red to white
            f = -t
            c = (255 - int(75 * f), 255 - int(225 * f), 255 - int(225 * f))
        else:       # increase -> white to blue
            c = (255 - int(215 * t), 255 - int(165 * t), 255 - int(35 * t))
        pal.append((*c, 215))
    return pal


def render_layers(cfg, outdir, url_prefix, src_tr, src_crs, before_db, after_db, delta, candidate, valid, aoi_mask,
                  max_w=1000):
    """All inputs share the source grid. Returns dict of layer objects."""
    from rasterio.enums import Resampling
    from rasterio.warp import transform_bounds
    outdir = Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    dst_tr, dst_shape, bx = _grid(cfg, max_w)
    w, s, e, n = transform_bounds("EPSG:3857", "EPSG:4326", *bx)
    bounds = [[s, w], [n, e]]
    avg = Resampling.average
    layers = {}

    def meta(name, legend, unit, nbytes):
        return {"url": f"{url_prefix}/{name}.png", "bounds": bounds, "crs": "EPSG:3857", "legend": legend,
                "unit": unit, "size_bytes": nbytes}

    for name, db in (("before", before_db), ("after", after_db)):
        a = np.where(aoi_mask & np.isfinite(db), db, np.nan)
        wa = _warp(a, src_tr, src_crs, dst_tr, dst_shape, avg)
        ok = np.isfinite(wa)
        g = np.clip((wa - DB_MIN) / (DB_MAX - DB_MIN), 0, 1)
        g = 1 + np.round(np.nan_to_num(g) * 62).astype(np.uint8) * 4      # 63 levels -> better compression
        nb = write_png_gray_alpha(outdir / f"{name}.png", np.where(ok, g, 0).astype(np.uint8),
                                  np.where(ok, 255, 0).astype(np.uint8))
        layers[name] = meta(name, {"type": "gradient", "min": DB_MIN, "max": DB_MAX, "colors": ["#000000", "#ffffff"],
                                   "note": "HVHV gamma0, dB, fixed stretch; averaged to display resolution"}, "dB", nb)
    d = np.where(valid & aoi_mask, delta, np.nan)
    wd = _warp(d, src_tr, src_crs, dst_tr, dst_shape, avg)
    idx = np.where(np.isfinite(wd), 1 + np.clip(np.floor((np.nan_to_num(wd) + DELTA_LIM) / (2 * DELTA_LIM) * N_DELTA),
                                                0, N_DELTA - 1), 0).astype(np.uint8)
    nb = write_png_palette(outdir / "delta.png", idx, _delta_palette())
    layers["delta"] = meta("delta", {"type": "gradient", "min": -DELTA_LIM, "max": DELTA_LIM,
                                     "colors": ["#b40000", "#ffffff", "#0a5ae0"],
                                     "note": "delta_db = final - initial; clipped to +/-10 dB for display; "
                                             "negative = signal decrease, positive = increase (not recovery)"}, "dB", nb)
    c = np.where(valid & aoi_mask, candidate.astype(np.float32), np.nan)
    wc = _warp(c, src_tr, src_crs, dst_tr, dst_shape, avg)
    idx = (np.nan_to_num(wc) >= 0.5).astype(np.uint8)
    nb = write_png_palette(outdir / "candidates.png", idx, [(0, 0, 0, 0), (230, 40, 20, 210)])
    layers["candidates"] = meta("candidates", {"type": "categorical", "items": [
        {"label": "Radar backscatter decrease candidate (delta_db <= -threshold)", "color": "#e62814"}],
        "note": "Majority of source pixels within each display pixel; area figures come from source pixels, not from this image"},
        "class", nb)
    q = np.where(aoi_mask, np.where(valid, 1, 2), 0).astype(np.uint8)
    wq = _warp(q, src_tr, src_crs, dst_tr, dst_shape, Resampling.mode, nodata=0, dtype=np.uint8)
    nb = write_png_palette(outdir / "quality.png", wq.astype(np.uint8),
                           [(0, 0, 0, 0), (40, 170, 90, 120), (120, 120, 120, 150)])
    layers["quality"] = meta("quality", {"type": "categorical", "items": [
        {"label": "Valid in both dates", "color": "#28aa5a"},
        {"label": "Not valid (mask, fill, NaN or non-positive power in at least one date)", "color": "#787878"}]},
        "class", nb)
    return layers
