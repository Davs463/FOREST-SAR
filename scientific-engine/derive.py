"""Derived visualisation products for a published snapshot (no change to scientific results).

Recomputes the multilook matrices from the local subset cache with the same functions/parameters as
process_pair.run, VERIFIES them against results.json and sectors.geojson, and only then writes
snapshots/<id>/derived/ (zones, cells, valid area, viz rasters, derived.json). No network.
"""
import json
import os
import shutil
from pathlib import Path

import numpy as np

import metrics as M
import places as PL
import processing as P
import render
from util import aoi_polygon_wgs84, atomic_write_json, clean, iso, log, to_crs, write_png_palette

CLUSTER_GAP_CELLS = 2
OUTLINE_NOTE = ("Display outline: union of 100 m candidate cells buffered for legibility; "
                "area_ha is the exact sum of cells")
CLUSTER_RULE = ("Zones = connected components of candidate cells (8-neighbourhood), merged when separated by "
                "<= 2 empty cells (<= 200 m). Outline = union of cells buffered +50 m, simplified 10 m.")
VIZ_MIN, VIZ_MAX = -25.0, -5.0
DELTA_CLIP = 6.0
# 9-step cividis-like sequential palette (dark blue-violet = low signal -> yellow = high)
SEQ_COLORS = ["#00204d", "#00306f", "#31446b", "#4d576b", "#6a6c72", "#868178", "#a29a76", "#c3b56a", "#ffea46"]
N_DELTA_BINS = 24


class DeriveMismatch(ValueError):
    pass


def _hex(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


# ------------------------------------------------------------------ matrices (same code path as process_pair)
def compute_matrices(cfg, dir_initial, dir_final):
    from rasterio.features import geometry_mask
    from rasterio.transform import Affine
    pc = cfg["processing"]
    aoi_m = to_crs(aoi_polygon_wgs84(cfg), "EPSG:4326", pc["metric_crs"])
    sa, sb = P.load_subset(dir_initial, cfg), P.load_subset(dir_final, cfg)
    if sa["frequency"] != sb["frequency"]:
        raise M.GridMismatch("different frequency selected for the two dates")
    aln = P.prepare_aligned(sa, sb, cfg, aoi_m)
    pol = pc["polarization"]
    (i_raw, f_raw), (mi_raw, mf_raw) = aln["arrays"][pol], aln["arrays"]["mask"]
    vi, vf = P.mask_valid(mi_raw), P.mask_valid(mf_raw)
    unit_i, _ = P.detect_unit(i_raw, vi, sa.get("HVHV_tags_band", {}) | sa.get("HVHV_tags", {}))
    unit_f, _ = P.detect_unit(f_raw, vf, sb.get("HVHV_tags_band", {}) | sb.get("HVHV_tags", {}))
    if unit_i != unit_f:
        raise M.GridMismatch("units differ between dates")
    _, valid, _ = M.delta_candidates(i_raw, f_raw, vi & aln["aoi_mask"], vf & aln["aoi_mask"],
                                     pc["threshold_db"], unit_i, pc["normalization_offset_db"])
    n, minfrac = int(pc["multilook_px"]), float(pc["multilook_min_valid_fraction"])
    mi_l, mf_l, cv, _ = M.multilook_blocks(i_raw, f_raw, valid, n, minfrac, unit_i)
    agg_tr = M.aggregate_transform(aln["transform"], n)
    aoi_cell = geometry_mask([aoi_m.__geo_interface__], out_shape=mi_l.shape, transform=Affine(*agg_tr), invert=True)
    cv = cv & aoi_cell
    delta_c, valid_c, cand_c = M.delta_candidates(mi_l, mf_l, cv, cv, pc["threshold_db"], "linear",
                                                  pc["normalization_offset_db"])
    return {"delta": delta_c, "valid": valid_c, "cand": cand_c, "before_db": M.to_db(mi_l, "linear"),
            "after_db": M.to_db(mf_l, "linear"), "tr": agg_tr, "crs": aln["crs"], "aoi_cell": aoi_cell,
            "px_area": M.pixel_area_m2(agg_tr)}


# ------------------------------------------------------------------ verification
def sector_counts(valid, cand, aoi_cell, tr, size_m):
    gx, gy = P.sector_labels(tr, valid.shape, size_m)
    GX, GY = np.meshgrid(gx, gy)
    out = {}
    for kx, ky in {(int(a), int(b)) for a, b in zip(GX[aoi_cell], GY[aoi_cell])}:
        sel = aoi_cell & (GX == kx) & (GY == ky)
        out[f"E{kx}_N{ky}"] = (int((valid & sel).sum()), int((cand & sel).sum()))
    return out


def verify(valid, cand, aoi_cell, tr, px_area, pair, sectors_fc, size_m, tol=1e-6):
    """Raise DeriveMismatch unless counts/areas equal results.json and every sector of sectors.geojson."""
    if int(valid.sum()) != pair["valid_cells"] or int(cand.sum()) != pair["candidate_cells"]:
        raise DeriveMismatch(f"cell counts differ: valid {int(valid.sum())} vs {pair['valid_cells']}, "
                             f"candidate {int(cand.sum())} vs {pair['candidate_cells']}")
    va, ca = int(valid.sum()) * px_area / 1e4, int(cand.sum()) * px_area / 1e4
    if abs(va - pair["metrics"]["valid_area_ha"]) > tol or abs(ca - pair["metrics"]["candidate_area_ha"]) > tol:
        raise DeriveMismatch("areas differ from results.json")
    counts = sector_counts(valid, cand, aoi_cell, tr, size_m)
    pid, checked = pair["pair_id"], 0
    for f in sectors_fc["features"]:
        sid = f["properties"]["sector_id"]
        met = f["properties"]["metrics_by_pair"][pid]
        v, c = counts.get(sid, (0, 0))
        if abs(v * px_area / 1e4 - met["valid_area_ha"]) > tol or abs(c * px_area / 1e4 - met["candidate_area_ha"]) > tol:
            raise DeriveMismatch(f"sector {sid} differs")
        checked += 1
    known = {f["properties"]["sector_id"] for f in sectors_fc["features"]}
    extra = [k for k, (v, c) in counts.items() if k not in known and (v or c)]
    if extra:
        raise DeriveMismatch(f"cells in sectors absent from sectors.geojson: {extra[:3]}")
    return {"candidate_cells": int(cand.sum()), "valid_cells": int(valid.sum()), "candidate_area_ha": ca,
            "valid_area_ha": va, "sectors_checked": checked, "ok": True}


# ------------------------------------------------------------------ zones
def cluster_cells(cand, max_gap=CLUSTER_GAP_CELLS):
    """Union-find over candidate cells: connected when Chebyshev index distance <= max_gap + 1
    (distance 1 = 8-neighbours; <= max_gap empty cells in between). Returns list of lists of (row, col)."""
    cells = [tuple(int(v) for v in rc) for rc in np.argwhere(cand)]
    idx = {c: i for i, c in enumerate(cells)}
    parent = list(range(len(cells)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    d = max_gap + 1
    for (r, c), i in idx.items():
        for dr in range(-d, d + 1):
            for dc in range(-d, d + 1):
                j = idx.get((r + dr, c + dc))
                if j is not None and j != i:
                    ri, rj = find(i), find(j)
                    if ri != rj:
                        parent[rj] = ri
    groups = {}
    for c, i in idx.items():
        groups.setdefault(find(i), []).append(c)
    return list(groups.values())


def cell_poly(r, c, tr):
    from shapely.geometry import box
    x0, y0 = tr[2] + c * tr[0], tr[5] + r * tr[4]
    return box(x0, y0 + tr[4], x0 + tr[0], y0)  # tr[4] < 0


def _round_geom(g, nd=6):
    gi = g.__geo_interface__

    def rc(x):
        return [rc(v) for v in x] if isinstance(x[0], (list, tuple)) else [round(x[0], nd), round(x[1], nd)]
    return {"type": gi["type"], "coordinates": rc(gi["coordinates"])}


def build_zones(cand, delta, tr, px_area, metric_crs, size_m, places, areas_fc):
    from shapely.ops import unary_union
    gx, gy = P.sector_labels(tr, cand.shape, size_m)
    zones = []
    for cells in cluster_cells(cand):
        union = unary_union([cell_poly(r, c, tr) for r, c in cells])
        outline = union.buffer(50.0).simplify(10.0)
        cen = to_crs(union.centroid, metric_crs, "EPSG:4326")
        zones.append({"cells": cells, "area_ha": len(cells) * px_area / 1e4,
                      "geom": to_crs(outline, metric_crs, "EPSG:4326"),
                      "dv": np.array([delta[r, c] for r, c in cells]),
                      "lat": round(cen.y, 6), "lon": round(cen.x, 6),
                      "sectors": sorted({f"E{int(gx[c])}_N{int(gy[r])}" for r, c in cells})})
    zones.sort(key=lambda z: (-z["area_ha"], -z["lat"]))
    feats, zone_of = [], {}
    for i, z in enumerate(zones, 1):
        zid = f"Z{i}"
        for rc in z["cells"]:
            zone_of[rc] = zid
        feats.append({"type": "Feature", "geometry": _round_geom(z["geom"]),
                      "properties": {"zone_id": zid, "rank": i, "area_ha": z["area_ha"],
                                     "cell_count": len(z["cells"]), "mean_delta_db": float(z["dv"].mean()),
                                     "min_delta_db": float(z["dv"].min()), "centroid": [z["lat"], z["lon"]],
                                     "bbox": [round(v, 6) for v in z["geom"].bounds], "sector_ids": z["sectors"],
                                     "outline_note": OUTLINE_NOTE,
                                     "nearest_place": PL.nearest_place(z["lat"], z["lon"], places) if places else None,
                                     "within_area": PL.within_area(z["lat"], z["lon"], areas_fc) if areas_fc else None}})
    return {"type": "FeatureCollection", "features": feats}, zone_of


def build_cells(delta, tr, metric_crs, zone_of):
    feats = []
    for r, c in sorted(zone_of):
        g = to_crs(cell_poly(r, c, tr), metric_crs, "EPSG:4326")
        feats.append({"type": "Feature", "geometry": _round_geom(g),
                      "properties": {"delta_db": round(float(delta[r, c]), 3), "zone_id": zone_of[(r, c)]}})
    return {"type": "FeatureCollection", "features": feats}


def build_valid_area(valid, tr, px_area, metric_crs):
    """Dissolved valid cells (rasterio.features.shapes), simplified at 50 m (<= half a cell, topology preserved).
    Holes are kept (every hole is >= 1 cell = 1 ha). area_ha is the exact cell sum, not the polygon area."""
    from rasterio.features import shapes
    from rasterio.transform import Affine
    from shapely.geometry import shape
    from shapely.ops import unary_union
    polys = [shape(g) for g, v in shapes(valid.astype(np.uint8), mask=valid, transform=Affine(*tr)) if v == 1]
    geom = unary_union(polys).simplify(50.0, preserve_topology=True)
    g4 = to_crs(geom, metric_crs, "EPSG:4326")
    return {"type": "FeatureCollection", "features": [{
        "type": "Feature", "geometry": _round_geom(g4),
        "properties": {"area_ha": int(valid.sum()) * px_area / 1e4, "cell_count": int(valid.sum()),
                       "note": "Cells valid in both dates, dissolved; simplified 50 m; area_ha = exact cell sum"}}]}


# ------------------------------------------------------------------ rasters
def seq_palette():
    return [(0, 0, 0, 0)] + [(*_hex(h), 255) for h in SEQ_COLORS]


def delta_palette():
    pal = [(0, 0, 0, 0)]
    w = 2 * DELTA_CLIP / N_DELTA_BINS
    for i in range(N_DELTA_BINS):
        v = -DELTA_CLIP + (i + 0.5) * w
        a = abs(v)
        alpha = 12 if a < 1 else int(round(70 + 170 * min(1.0, (a - 1) / (DELTA_CLIP - 1))))
        c = (178, 24, 43) if v < 0 else (33, 102, 172)
        pal.append((*c, alpha))
    return pal


def render_viz(cfg, outdir, url_prefix, m, max_w=1000):
    from rasterio.enums import Resampling
    from rasterio.warp import transform_bounds
    outdir = Path(outdir)
    dst_tr, dst_shape, bx = render._grid(cfg, max_w)
    w, s, e, n = transform_bounds("EPSG:3857", "EPSG:4326", *bx)
    bounds = [[s, w], [n, e]]
    ok_mask = m["valid"] & m["aoi_cell"]
    viz = {}
    nsteps = len(SEQ_COLORS)
    for name, db in (("before", m["before_db"]), ("after", m["after_db"])):
        a = render._warp(np.where(ok_mask & np.isfinite(db), db, np.nan), m["tr"], m["crs"], dst_tr, dst_shape,
                         Resampling.average)
        ok = np.isfinite(a)
        t = np.clip((np.nan_to_num(a) - VIZ_MIN) / (VIZ_MAX - VIZ_MIN), 0, 1)
        idx = np.where(ok, 1 + np.minimum(np.floor(t * nsteps), nsteps - 1), 0).astype(np.uint8)
        write_png_palette(outdir / f"viz_{name}.png", idx, seq_palette())
        viz[name] = {"url": f"{url_prefix}/viz_{name}.png", "bounds": bounds,
                     "legend": {"type": "gradient", "min": VIZ_MIN, "max": VIZ_MAX, "colors": SEQ_COLORS,
                                "note": "HVHV gamma0 in dB, 100 m multilook cells; fixed stretch "
                                        f"{VIZ_MIN:g}..{VIZ_MAX:g} dB identical for both dates (comparable); "
                                        f"{nsteps} discrete steps; transparent outside the valid area"}}
    d = render._warp(np.where(ok_mask, m["delta"], np.nan), m["tr"], m["crs"], dst_tr, dst_shape, Resampling.average)
    ok = np.isfinite(d)
    t = (np.clip(np.nan_to_num(d), -DELTA_CLIP, DELTA_CLIP) + DELTA_CLIP) / (2 * DELTA_CLIP)
    idx = np.where(ok, 1 + np.minimum(np.floor(t * N_DELTA_BINS), N_DELTA_BINS - 1), 0).astype(np.uint8)
    write_png_palette(outdir / "viz_delta.png", idx, delta_palette())
    viz["delta"] = {"url": f"{url_prefix}/viz_delta.png", "bounds": bounds,
                    "legend": {"type": "diverging", "min": -DELTA_CLIP, "max": DELTA_CLIP,
                               "colors": ["#b2182b", "#ffffff", "#2166ac"],
                               "note": "delta_db = final - initial, clipped to +/-6 dB. Red = signal decrease, "
                                       "blue = signal increase (not recovery); opacity grows with |delta|, "
                                       "|delta| < 1 dB almost transparent"}}
    return viz


# ------------------------------------------------------------------ orchestration
def derive_snapshot(cfg, public, cache, snapshot_id, force=False):
    """Returns the derived.json dict. Raises DeriveMismatch / FileExistsError / OSError before writing anything."""
    public, cache = Path(public), Path(cache)
    snap = public / "snapshots" / snapshot_id
    final = snap / "derived"
    if final.exists() and not force:
        raise FileExistsError("derived/ already exists (use --force-derived)")
    res = json.loads((snap / "results.json").read_text(encoding="utf-8"))
    sectors = json.loads((snap / "sectors.geojson").read_text(encoding="utf-8"))
    pair = res["pairs"][0]
    pc = cfg["processing"]
    for k in ("threshold_db", "multilook_px", "multilook_min_valid_fraction"):
        if pair["params"].get(k) != pc[k]:
            raise DeriveMismatch(f"param {k} of snapshot differs from current config")
    d_i, d_f = cache / "subsets" / pair["initial_id"], cache / "subsets" / pair["final_id"]
    if not (d_i / "meta.json").is_file() or not (d_f / "meta.json").is_file():
        raise FileNotFoundError("scenes of the pair are not in the local subset cache")
    m = compute_matrices(cfg, d_i, d_f)
    ver = verify(m["valid"], m["cand"], m["aoi_cell"], m["tr"], m["px_area"], pair, sectors, pc["sector_size_m"])
    pmeta, areas = PL.load_local(public)
    places = pmeta["places"] if pmeta else []
    if not pmeta:
        log("warning: places/places.json missing; nearest_place/within_area will be null")
    zones, zone_of = build_zones(m["cand"], m["delta"], m["tr"], m["px_area"], pc["metric_crs"],
                                 pc["sector_size_m"], places, areas)
    zsum = sum(f["properties"]["area_ha"] for f in zones["features"])
    zcells = sum(f["properties"]["cell_count"] for f in zones["features"])
    if abs(zsum - ver["candidate_area_ha"]) > 1e-6 or zcells != ver["candidate_cells"]:
        raise DeriveMismatch("zone totals differ from candidate totals")
    cells = build_cells(m["delta"], m["tr"], pc["metric_crs"], zone_of)
    varea = build_valid_area(m["valid"], m["tr"], m["px_area"], pc["metric_crs"])
    tmp = snap / f".derived-tmp-{os.getpid()}"
    if tmp.exists():
        shutil.rmtree(tmp)
    tmp.mkdir()
    try:
        prefix = f"snapshots/{snapshot_id}/derived"
        viz = render_viz(cfg, tmp, prefix, m)
        for name, fc in (("zones", zones), ("cells", cells), ("valid_area", varea)):
            fc.update({"snapshot_id": snapshot_id, "pair_id": pair["pair_id"], "crs": "EPSG:4326"})
            atomic_write_json(tmp / f"{name}.geojson", clean(fc))
        for k in viz:
            if (tmp / f"viz_{k}.png").stat().st_size > 2_000_000:
                raise DeriveMismatch(f"viz_{k}.png exceeds 2 MB")
        doc = {"schema_version": 1, "snapshot_id": snapshot_id, "pair_id": pair["pair_id"], "generated_at": iso(),
               "method_note": "Derived visualisation products only; recomputed from the subset cache with the same "
                              "multilook code and parameters as the snapshot and verified equal to results.json and "
                              "sectors.geojson. Radar backscatter change candidates, not deforestation.",
               "cluster_rule": CLUSTER_RULE, "verification": ver,
               "files": {"zones": f"{prefix}/zones.geojson", "cells": f"{prefix}/cells.geojson",
                         "valid_area": f"{prefix}/valid_area.geojson", "viz_before": f"{prefix}/viz_before.png",
                         "viz_after": f"{prefix}/viz_after.png", "viz_delta": f"{prefix}/viz_delta.png"},
               "viz": viz,
               "places_used": ({"path": PL.PLACES_REL, "retrieved_at": pmeta["retrieved_at"], "license": PL.LICENSE}
                               if pmeta else None)}
        atomic_write_json(tmp / "derived.json", clean(doc), indent=1)
        old = None
        if final.exists():
            old = snap / f".derived-old-{os.getpid()}"
            os.replace(final, old)
        os.replace(tmp, final)
        if old:
            shutil.rmtree(old, ignore_errors=True)
    except Exception:
        shutil.rmtree(tmp, ignore_errors=True)
        raise
    return doc
