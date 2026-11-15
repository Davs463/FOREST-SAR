"""Stage 4: acquire a spatial subset of one granule. Order: Harmony subset (COG per variable), then
remote partial HDF5 read via earthaccess (HTTP range requests, only the AOI window), then, only if the size
fits the budget, full download. Never copies HDF5 to public/. Credentials come from EARTHDATA_TOKEN (env)."""
import json
import os
import re
import time
from pathlib import Path

import numpy as np

from util import sanitize, to_crs, aoi_polygon_wgs84, atomic_write_json, log

HARMONY = "https://harmony.earthdata.nasa.gov"
FREQ_PATH = "/science/LSAR/GCOV/grids/frequency{f}"
IDENT_PATH = "/science/LSAR/identification"


class AcquisitionError(RuntimeError):
    pass


def _token():
    t = os.environ.get("EARTHDATA_TOKEN")
    if not t:
        raise AcquisitionError("EARTHDATA_TOKEN not set in environment")
    return t


def _hdr():
    return {"Authorization": "Bearer " + _token(), "User-Agent": "FOREST_SAR_HN-engine/0.1"}


def _retry(fn, retries, backoff, what):
    last = None
    for i in range(retries + 1):
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 - sanitized and re-raised below
            last = exc
            log(f"{what}: attempt {i + 1} failed ({type(exc).__name__}: {sanitize(exc, 160)})")
            if i < retries:
                time.sleep(backoff * (2 ** i))
    raise AcquisitionError(f"{what} failed after {retries + 1} attempts: {type(last).__name__}: {sanitize(last, 200)}")


def harmony_capabilities(collection_id, timeout=60):
    import requests
    r = requests.get(f"{HARMONY}/capabilities", params={"collectionid": collection_id, "format": "json"},
                     headers=_hdr(), timeout=timeout)
    r.raise_for_status()
    j = r.json()
    return {"subsetting": j.get("capabilities", j).get("subsetting") if isinstance(j, dict) else None,
            "output_formats": j.get("outputFormats"), "services": [s.get("name") for s in j.get("services", [])],
            "variable_subsetting": j.get("variableSubsetting"), "bbox_subsetting": j.get("bboxSubsetting")}


def harmony_subset(scene, cfg, outdir, max_bytes):
    """Request all gridded variables trimmed to the AOI. Returns list of local tif paths."""
    import requests
    b = cfg["download_budget"]
    w, s, e, n = cfg["aoi"]["bbox_wsen"]
    cid = scene["collection_concept_id"]
    gid = scene["cmr_concept_id"]
    url = f"{HARMONY}/{cid}/ogc-api-coverages/1.0.0/collections/all/coverage/rangeset"
    params = [("granuleId", gid), ("subset", f"lat({s}:{n})"), ("subset", f"lon({w}:{e})"),
              ("forceAsync", "true"), ("skipPreview", "true"), ("format", "image/tiff")]

    def submit():
        r = requests.get(url, params=params, headers=_hdr(), timeout=b["timeout_s"], allow_redirects=True)
        if r.status_code >= 400:
            raise AcquisitionError(f"Harmony HTTP {r.status_code}: {sanitize(r.text, 300)}")
        return r.json()

    job = _retry(submit, b["retries"], b["backoff_s"], "harmony submit")
    job_id = job.get("jobID")
    if not job_id:
        raise AcquisitionError("Harmony response without jobID")
    deadline = time.time() + b["harmony_job_timeout_s"]
    while True:
        r = requests.get(f"{HARMONY}/jobs/{job_id}", headers=_hdr(), timeout=b["timeout_s"])
        r.raise_for_status()
        job = r.json()
        st = job.get("status")
        if st in ("successful", "complete_with_errors"):
            break
        if st in ("failed", "canceled"):
            raise AcquisitionError(f"Harmony job {st}: {sanitize(job.get('message'), 300)}")
        if time.time() > deadline:
            raise AcquisitionError("Harmony job timeout")
        time.sleep(10)
    links = [l for l in job.get("links", []) if l.get("rel") == "data" and str(l.get("href", "")).split("?")[0].lower().endswith((".tif", ".tiff"))]
    if not links:
        raise AcquisitionError("Harmony job produced no GeoTIFF outputs")
    outdir.mkdir(parents=True, exist_ok=True)
    total, files = 0, []
    for l in links:
        name = Path(l["href"].split("?")[0]).name
        dest = outdir / name

        def dl(href=l["href"], dest=dest):
            with requests.get(href, headers=_hdr(), stream=True, timeout=b["timeout_s"]) as r:
                r.raise_for_status()
                with open(dest.with_suffix(".part"), "wb") as fh:
                    for chunk in r.iter_content(1 << 20):
                        fh.write(chunk)
            os.replace(dest.with_suffix(".part"), dest)
        _retry(dl, b["retries"], b["backoff_s"], "harmony download")
        total += dest.stat().st_size
        if total > max_bytes:
            raise AcquisitionError("Harmony outputs exceed byte budget")
        files.append(dest)
    return files


# ------------------------------------------------------------------ HDF5 window -> GeoTIFF subset
def _epsg(g):
    import h5py
    if "projection" not in g:
        return None
    p = g["projection"]
    for k in ("epsg_code", "epsg"):
        if k in p.attrs:
            return int(np.asarray(p.attrs[k]).ravel()[0])
    try:
        v = int(np.asarray(p[()]).ravel()[0])
        return v if v > 0 else None
    except (TypeError, ValueError):
        return None


def _attr(v):
    v = np.asarray(v).ravel()
    x = v[0] if v.size else None
    return x.decode() if isinstance(x, bytes) else (x.item() if hasattr(x, "item") else x)


def h5_subset(fileobj, cfg, outdir, freqs=("A", "B")):
    """Read identification + AOI window of HVHV/mask/numberOfLooks from an open HDF5 (local or remote file
    object) and write them as GeoTIFFs plus meta.json. Returns meta dict."""
    import h5py
    import rasterio
    from rasterio.transform import Affine
    outdir.mkdir(parents=True, exist_ok=True)
    meta = {"source": "hdf5", "identification": {}, "frequencies": {}}
    with h5py.File(fileobj, "r") as h:
        if IDENT_PATH in h:
            for k, ds in h[IDENT_PATH].items():
                if hasattr(ds, "shape") and ds.shape in ((), (1,)):
                    try:
                        meta["identification"][k] = _attr(ds[()])
                    except Exception:  # noqa: BLE001
                        pass
        for f in freqs:
            gp = FREQ_PATH.format(f=f)
            if gp not in h:
                continue
            g = h[gp]
            info = {"datasets": sorted(g.keys())}
            if "HVHV" not in g:
                meta["frequencies"][f] = info
                continue
            epsg = _epsg(g)
            if epsg is None:
                info["error"] = "projection EPSG missing"
                meta["frequencies"][f] = info
                continue
            crs = f"EPSG:{epsg}"
            x, y = g["xCoordinates"][()], g["yCoordinates"][()]
            dx, dy = float(g["xCoordinateSpacing"][()]), float(g["yCoordinateSpacing"][()])
            bx = to_crs(aoi_polygon_wgs84(cfg), "EPSG:4326", crs).bounds
            xi = np.where((x >= bx[0] - abs(dx)) & (x <= bx[2] + abs(dx)))[0]
            yi = np.where((y >= bx[1] - abs(dy)) & (y <= bx[3] + abs(dy)))[0]
            if xi.size == 0 or yi.size == 0:
                info["error"] = "AOI outside grid"
                meta["frequencies"][f] = info
                continue
            x0, x1, y0, y1 = int(xi[0]), int(xi[-1]) + 1, int(yi[0]), int(yi[-1]) + 1
            tr = Affine(dx, 0, float(x[x0]) - dx / 2, 0, dy, float(y[y0]) - dy / 2)
            info.update({"crs": crs, "spacing": [dx, dy], "window": [y0, y1, x0, x1],
                         "full_shape": list(g["HVHV"].shape), "hvhv_attrs": {k: _attr(v) for k, v in g["HVHV"].attrs.items()
                                                                              if k in ("units", "description", "long_name", "_FillValue", "grid_mapping")},
                         "mask_attrs": {k: _attr(v) if np.asarray(v).size < 20 else "array" for k, v in g["mask"].attrs.items()} if "mask" in g else None})
            for name in ("HVHV", "mask", "numberOfLooks"):
                if name not in g:
                    continue
                arr = g[name][y0:y1, x0:x1]
                with rasterio.open(outdir / f"frequency{f}_{name}.tif", "w", driver="GTiff", height=arr.shape[0],
                                   width=arr.shape[1], count=1, dtype=arr.dtype, crs=crs, transform=tr,
                                   compress="deflate") as dst:
                    dst.write(arr, 1)
            meta["frequencies"][f] = info
    atomic_write_json(outdir / "meta.json", meta, indent=1)
    return meta


def remote_h5_subset(scene, cfg, outdir):
    """Partial read through earthaccess (HTTP range requests); no full download."""
    import earthaccess
    earthaccess.login(strategy="environment", persist=False)
    res = earthaccess.search_data(concept_id=scene["cmr_concept_id"])
    if not res:
        raise AcquisitionError("granule not returned by earthaccess search")
    files = earthaccess.open(res)
    if not files:
        raise AcquisitionError("earthaccess.open returned no file handles")
    return h5_subset(files[0], cfg, outdir)


def acquire(scene, cfg, cache, local_input=None):
    """Returns (subset_dir, meta, method_log). subset_dir contains frequency*_*.tif (+ meta.json for hdf5)."""
    b = cfg["download_budget"]
    outdir = cache / "subsets" / scene["id"]
    method = []
    if (outdir / "meta.json").exists():
        method.append("cache_hit")
        return outdir, json.loads((outdir / "meta.json").read_text()), method
    if local_input:
        p = Path(local_input) / f"{scene['id']}.h5"
        if p.is_file():
            method.append("local_hdf5")
            return outdir, h5_subset(str(p), cfg, outdir), method
        method.append("local_input_missing_file")
    max_bytes = int(b["max_gb_per_attempt"] * 1e9)
    size_mb = scene.get("size_mb")
    errors = []
    if b.get("prefer_subset", True):
        try:
            try:
                method.append({"harmony_capabilities": harmony_capabilities(scene["collection_concept_id"])})
            except Exception as exc:  # noqa: BLE001
                method.append({"harmony_capabilities_error": type(exc).__name__})
            files = harmony_subset(scene, cfg, outdir, max_bytes)
            method.append({"harmony_subset": [f.name for f in files]})
            hm = {"source": "harmony", "files": [f.name for f in files]}
            atomic_write_json(outdir / "meta.json", hm)
            return outdir, hm, method
        except Exception as exc:  # noqa: BLE001
            errors.append("harmony: " + sanitize(exc, 300))
            method.append({"harmony_failed": sanitize(exc, 300)})
        try:
            meta = remote_h5_subset(scene, cfg, outdir)
            method.append("earthaccess_remote_range_read")
            return outdir, meta, method
        except Exception as exc:  # noqa: BLE001
            errors.append("earthaccess_open: " + sanitize(exc, 300))
            method.append({"earthaccess_open_failed": sanitize(exc, 300)})
    raise AcquisitionError("; ".join(errors) or "no acquisition route available (size "
                           f"{size_mb} MB exceeds partial-read options)")
