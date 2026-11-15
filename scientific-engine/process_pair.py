"""Stage 5-7 for one acquired pair: align, delta/candidates, areas, sectors, layers, transactional export."""
import math
import platform
import shutil
import sys
from pathlib import Path

import numpy as np

import export
import metrics as M
import processing as P
import render
from util import (aoi_polygon_wgs84, atomic_write_json, clean, iso, log, sanitize, sha256_file, to_crs, utc_now,
                  ROOT)
import catalog as cat


def _sectors(aln, valid, cand, cfg, aoi_wgs):
    size = cfg["processing"]["sector_size_m"]
    metric = cfg["processing"]["metric_crs"]
    aoi_m = to_crs(aoi_wgs, "EPSG:4326", metric)
    tr, shape = aln["transform"], aln["shape"]
    px_area = M.pixel_area_m2(tr)
    gx, gy = P.sector_labels(tr, shape, size)
    GX, GY = np.meshgrid(gx, gy)
    inside = aln["aoi_mask"]
    from shapely.geometry import box
    feats, per_sector, areas = [], [], []
    keys = sorted({(int(a), int(b)) for a, b in zip(GX[inside], GY[inside])})
    for (kx, ky) in keys:
        poly = box(kx * size, ky * size, (kx + 1) * size, (ky + 1) * size).intersection(aoi_m)
        if poly.is_empty or poly.area <= 0:
            continue
        sel = inside & (GX == kx) & (GY == ky)
        area_ha = poly.area / 1e4
        met = M.area_metrics(int((valid & sel).sum()), int((cand & sel).sum()), px_area, area_ha)
        per_sector.append(met)
        areas.append(area_ha)
        geom = to_crs(poly, metric, "EPSG:4326").__geo_interface__
        feats.append({"type": "Feature", "geometry": geom,
                      "properties": {"sector_id": f"E{kx}_N{ky}", "region_id": cfg["aoi"]["id"],
                                     "kind": "analysis_grid_cell_1km (not an official neighbourhood or boundary)",
                                     "sector_area_ha": area_ha, "metrics_by_pair": {"__PAIR__": met}}})
    return feats, per_sector, areas, px_area


def _samples_ml(init, fin, valid, mi, mf, unit, n, minfrac, ml_i, ml_f, delta_c, valid_c, cand_c, thr, k=3):
    """Independent hand recomputation of multilook cells with plain python loops (no numpy reductions)."""
    out = []
    picks = []
    for sel in (cand_c, valid_c & ~cand_c):
        rr, cc = np.where(sel)
        step = max(1, len(rr) // k)
        picks += list(zip(rr[::step][:k], cc[::step][:k]))
    for r, c in picks[:2 * k]:
        s_i = s_f = 0.0
        cnt = 0
        for y in range(r * n, r * n + n):
            for x in range(c * n, c * n + n):
                a, b = float(init[y, x]), float(fin[y, x])
                if unit == "dB":
                    a, b = 10 ** (a / 10), 10 ** (b / 10)
                if bool(valid[y, x]) and int(mi[y, x]) in range(1, 255) and int(mf[y, x]) in range(1, 255):
                    s_i += a
                    s_f += b
                    cnt += 1
        manual = 10 * math.log10(s_f / cnt) - 10 * math.log10(s_i / cnt)
        out.append({"cell_row": int(r), "cell_col": int(c), "valid_pixels_in_block": cnt, "block_pixels": n * n,
                    "mean_initial_linear": s_i / cnt, "mean_final_linear": s_f / cnt, "delta_manual_db": manual,
                    "delta_array_db": float(delta_c[r, c]), "abs_diff": abs(manual - float(delta_c[r, c])),
                    "candidate_manual": manual <= -thr, "candidate_array": bool(cand_c[r, c]),
                    "same_class": (manual <= -thr) == bool(cand_c[r, c]) and cnt / (n * n) >= minfrac})
    return out


def run(cfg, slog, work, public, scenes, pairs, summary, report, chosen, cnt, ini, fin, subsets, update_manifest=True):
    pc = cfg["processing"]
    aoi_wgs = aoi_polygon_wgs84(cfg)
    aoi_m = to_crs(aoi_wgs, "EPSG:4326", pc["metric_crs"])
    sa, sb = P.load_subset(subsets["initial"][0], cfg), P.load_subset(subsets["final"][0], cfg)
    if sa["frequency"] != sb["frequency"]:
        raise M.GridMismatch("different frequency selected for the two dates")
    for k in ("mask", "numberOfLooks"):
        slog.stage("inspect_files", "ok", var=k, initial_tags=sa.get(k + "_tags_band"), initial_descr=sa.get(k + "_descr"),
                   nodata=sa.get(k + "_nodata"))
    slog.stage("inspect_files", "ok", var="HVHV", tags_band=sa.get("HVHV_tags_band"), descr=sa.get("HVHV_descr"),
               frequency=sa["frequency"], crs=[sa["crs"], sb["crs"]], transform=[sa["transform"], sb["transform"]],
               shape=[sa["shape"], sb["shape"]])
    aln = P.prepare_aligned(sa, sb, cfg, aoi_m)
    pol = pc["polarization"]
    (i_raw, f_raw), (mi_raw, mf_raw) = aln["arrays"][pol], aln["arrays"]["mask"]
    looks = aln["arrays"].get("numberOfLooks")
    vi, vf = P.mask_valid(mi_raw), P.mask_valid(mf_raw)
    unit_i, ev_i = P.detect_unit(i_raw, vi, sa.get("HVHV_tags_band", {}) | sa.get("HVHV_tags", {}))
    unit_f, ev_f = P.detect_unit(f_raw, vf, sb.get("HVHV_tags_band", {}) | sb.get("HVHV_tags", {}))
    if unit_i != unit_f:
        raise M.GridMismatch("units differ between dates")
    unit = unit_i
    slog.stage("units", "ok", unit=unit, initial=ev_i, final=ev_f)
    # validity restricted to AOI; delta/candidates
    delta, valid, cand = M.delta_candidates(i_raw, f_raw, vi & aln["aoi_mask"], vf & aln["aoi_mask"],
                                            pc["threshold_db"], unit, pc["normalization_offset_db"])
    slog.stage("delta", "ok", grid_mode=aln["mode"], valid_px=int(valid.sum()), candidate_px=int(cand.sum()),
               aoi_px=int(aln["aoi_mask"].sum()), mask_values_initial=np.unique(mi_raw).tolist()[:12],
               mask_values_final=np.unique(mf_raw).tolist()[:12],
               looks_median_valid=(float(np.nanmedian(looks[0][valid])) if looks is not None and valid.any() else None))
    thr = pc["threshold_db"]
    # ---- native 10 m (diagnostics only)
    dv = delta[valid]
    native_px_area = M.pixel_area_m2(aln["transform"])
    nat = M.area_metrics(int(valid.sum()), int(cand.sum()), native_px_area, 1.0)
    native = {"pixel_m": abs(aln["transform"][0]), "valid_area_ha": nat["valid_area_ha"],
              "candidate_area_ha": nat["candidate_area_ha"], "candidate_pct": nat["candidate_pct"],
              "delta_db_median": float(np.median(dv)), "delta_db_p05": float(np.percentile(dv, 5)),
              "delta_db_p95": float(np.percentile(dv, 95)),
              "share_delta_le_minus_threshold_pct": float(100 * (dv <= -thr).mean()),
              "share_delta_ge_plus_threshold_pct": float(100 * (dv >= thr).mean())}
    # ---- primary product: multilook (linear power block mean)
    n, minfrac = int(pc["multilook_px"]), float(pc["multilook_min_valid_fraction"])
    mi_l, mf_l, cv, frac = M.multilook_blocks(i_raw, f_raw, valid, n, minfrac, unit)
    agg_tr = M.aggregate_transform(aln["transform"], n)
    from rasterio.features import geometry_mask
    from rasterio.transform import Affine
    aoi_cell = geometry_mask([aoi_m.__geo_interface__], out_shape=mi_l.shape, transform=Affine(*agg_tr), invert=True)
    cv = cv & aoi_cell
    delta_c, valid_c, cand_c = M.delta_candidates(mi_l, mf_l, cv, cv, thr, "linear", pc["normalization_offset_db"])
    dc = delta_c[valid_c]
    ml_diag = {"multilook_px": n, "effective_pixel_m": abs(agg_tr[0]), "cells_valid": int(valid_c.sum()),
               "cells_candidate": int(cand_c.sum()), "delta_db_median": float(np.median(dc)),
               "delta_db_p05": float(np.percentile(dc, 5)), "delta_db_p95": float(np.percentile(dc, 95)),
               "share_delta_le_minus_threshold_pct": float(100 * (dc <= -thr).mean()),
               "share_delta_ge_plus_threshold_pct": float(100 * (dc >= thr).mean())}
    diagnostics = {"native_10m": native, "multilook": ml_diag,
                   "note": "Native 10 m differences are speckle-dominated (near-symmetric shares of decreases and "
                           "increases, median near 0); the published product is the multilook one. Noise is reduced, "
                           "not separated: no claim of perfect noise separation."}
    slog.stage("diagnostics", "ok", **diagnostics)
    aln_ml = {"transform": agg_tr, "shape": mi_l.shape, "aoi_mask": aoi_cell}
    feats, per_sector, areas, px_area = _sectors(aln_ml, valid_c, cand_c, cfg, aoi_wgs)
    total = M.aggregate_sectors(per_sector, areas)
    direct = M.area_metrics(int(valid_c.sum()), int(cand_c.sum()), px_area, sum(areas))
    consistent = all(abs(total[k] - direct[k]) <= 1e-6 * max(1.0, abs(direct[k] or 0)) for k in
                     ("valid_area_ha", "candidate_area_ha"))
    samples = _samples_ml(i_raw, f_raw, valid, mi_raw, mf_raw, unit, n, minfrac, mi_l, mf_l, delta_c, valid_c, cand_c, thr)
    slog.stage("validation", "ok" if consistent else "warn", sector_sum_equals_direct=consistent,
               cell_area_m2=px_area, n_sectors=len(feats), sample_cells=samples,
               max_sample_abs_diff=max((s["abs_diff"] for s in samples), default=None))
    if not consistent or any(s["abs_diff"] > 1e-4 or not s["same_class"] for s in samples):
        raise ValueError("validation failed: sector aggregation or manual sample mismatch")
    # aligned views for layers
    delta, valid, cand = delta_c, valid_c, cand_c
    before_db, after_db = M.to_db(mi_l, "linear"), M.to_db(mf_l, "linear")
    layer_tr, layer_shape, layer_aoi = agg_tr, mi_l.shape, aoi_cell

    sid = utc_now().strftime("%Y%m%dT%H%M%SZ") + "-" + cfg["_config_sha256"][:8]
    tmpl = work / f"layers-{sid}"
    prefix = f"snapshots/{sid}/layers"
    layers = render.render_layers(cfg, tmpl, prefix, layer_tr, aln["crs"], before_db, after_db, delta, cand, valid,
                                  layer_aoi)
    slog.stage("render", "ok", layers={k: v["size_bytes"] for k, v in layers.items()})

    days = chosen["interval_days"]
    coll = next(c for c in cfg["search"]["collections"] if c["short_name"] == ini["collection"])
    limitations = [
        "Radar backscatter change only (HVHV gamma0, L-band): not a measurement of deforestation or forest loss.",
        "No forest/non-forest base mask applied: population is every valid pixel in the study window.",
        "Single compatible pair: no persistence, trend or repeat confirmation.",
        "Tillage, soil moisture, rain, phenology, slope/geometry and saturation are alternative explanations.",
        "Harmony subset COGs do not carry HDF5 identification attributes: track/frame/pass/look were verified from CMR UMM-G only.",
        "Known issue (ASF, 2026-02-27): the GCOV mask can be misaligned with the data at product edges; edge pixels may be affected.",
        "Threshold 3 dB is exploratory; noise floor not estimated; no normalisation applied.",
        f"Speckle reduced, not eliminated: linear power averaged over {n}x{n} pixel blocks ({abs(agg_tr[0]):g} m cells; "
        f"cells need >= {minfrac:g} valid fraction in both dates). Native 10 m differences were speckle-dominated "
        "(see diagnostics.native_10m); cell candidates still include residual noise, geometry and moisture effects.",
        "Candidate areas are sums of whole multilook cells; features smaller than a cell are not resolved. "
        "No minimum patch filter applied.",
        "TP, cv_initial, cv_final and rhythm_12d are null: no comparable vegetation-cover measurements.",
        f"Provisional-maturity product ({ini['collection']}); not validated release.",
        "Coverage percentages use the study-window polygon (provisional bbox), not a municipal boundary.",
    ]
    for f in feats:
        f["properties"]["metrics_by_pair"] = {chosen["id"]: f["properties"]["metrics_by_pair"].pop("__PAIR__")}
    pair_res = {
        "pair_id": chosen["id"], "region_id": cfg["aoi"]["id"], "initial_id": ini["id"], "final_id": fin["id"],
        "initial_date": ini["acquired_at"][:10], "final_date": fin["acquired_at"][:10],
        "source": "NASA-ISRO NISAR L2 GCOV", "maturity": coll["maturity"],
        "metrics": {**{k: total[k] for k in ("valid_area_ha", "candidate_area_ha", "candidate_pct", "coverage_pct")},
                    "cv_initial_ha": None, "cv_final_ha": None, "tp_pct": None, "rhythm_12d": None},
        "params": {"threshold_db": pc["threshold_db"], "noise_floor_db": pc["noise_floor_db"],
                   "normalization_offset_db": pc["normalization_offset_db"], "mask_rule": P.MASK_RULE,
                   "minimum_patch_ha": pc["minimum_patch_ha"], "multilook_px": n,
                   "effective_pixel_m": abs(agg_tr[0]), "multilook_min_valid_fraction": minfrac},
        "evidence_level": "1 - single candidate pair (radar change only; no repetition, no external confirmation)",
        "limitations": limitations, "layers": layers,
        "provenance": {"source_urls": [ini["source_url"], fin["source_url"]],
                       "processing_log": f"snapshots/{sid}/processing-log.json"},
        # additive fields
        "interval_days": days, "frequency": sa["frequency"], "polarization": pol, "unit_detected": unit,
        "grid": {"crs": aln["crs"], "mode": aln["mode"], "source_pixel_m": abs(aln["transform"][0]),
                 "pixel_size_m": abs(agg_tr[0]), "pixel_area_m2": px_area, "mask_applied": True,
                 "product": "multilook_linear_block_mean"},
        "valid_cells": int(valid.sum()), "candidate_cells": int(cand.sum()),
        "label": "Radar backscatter change candidate (not deforestation)", "traffic_light": "not_evaluated",
        "aoi_area_ha": sum(areas), "sector_count": len(feats), "diagnostics": diagnostics,
    }
    results = {"schema_version": 1, "snapshot_id": sid, "data_mode": "real", "processed_at": iso(),
               "algorithm_version": cfg["algorithm_version"], "pairs": [pair_res]}
    sectors = {"type": "FeatureCollection", "data_mode": "real", "snapshot_id": sid, "grid_crs": pc["metric_crs"],
               "features": feats}
    pairs_out = [dict(p, processed=(p["id"] == chosen["id"])) for p in pairs]
    for s in scenes:
        if s["id"] in (ini["id"], fin["id"]):
            s["quality_status"] = "processed_hvhv_verified_in_subset"
            s["hvhv_verified_in_file"] = True
            s["crs"], s["spacing_m"] = aln["crs"], abs(sa["transform"][0])
    catalog = export.make_catalog([cat.public_scene(s) for s in scenes], pairs_out, cfg, summary,
                                  report.get("retrieved_at"))
    checks = {}
    for tag, sub in (("initial", sa), ("final", sb)):
        checks[tag] = {k: {"file": p.name.split("_science_LSAR_")[-1], "sha256": sha256_file(p)}
                       for k, p in sub["files"].items()}
    plog = {"schema_version": 1, "snapshot_id": sid, "status": "ready", "generated_at": iso(),
            "algorithm_version": cfg["algorithm_version"], "config_version": cfg["config_version"],
            "config_sha256": cfg["_config_sha256"], "parameters": pc, "source_checksums_sha256": checks,
            "dependencies": {"python": sys.version.split()[0], "numpy": np.__version__,
                             **_ver(("rasterio", "shapely", "h5py", "earthaccess", "requests"))},
            "platform": platform.platform(), "stages": slog.stages,
            "validation": {"sector_sum_equals_direct": consistent, "sample_pixels": samples},
            "note": "No credentials or signed URLs are stored in this log."}
    from util import sanitize as _s
    plog = clean(plog)
    m = export.publish(public, sid, "ready", catalog, plog, results=results, sectors=sectors,
                       extra_files={f"layers/{p.name}": p for p in tmpl.glob("*.png")},
                       update_manifest=update_manifest)
    shutil.rmtree(tmpl, ignore_errors=True)
    slog.stage("export", "ok", snapshot_id=sid, published_status="ready")
    return "ready", {"snapshot_id": sid, "metrics": pair_res["metrics"]}


def _ver(names):
    import importlib.metadata as md
    out = {}
    for n in names:
        try:
            out[n] = md.version(n)
        except md.PackageNotFoundError:
            out[n] = None
    return out
