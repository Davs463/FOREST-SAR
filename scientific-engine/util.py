"""Shared helpers: config, UTC time, sanitising, atomic writes, geometry, PNG encoding."""
import hashlib
import json
import os
import re
import struct
import sys
import zlib
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]

_SECRET_PATTERNS = [
    re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._\-~+/=]{8,}"),
    re.compile(r"(?i)(token|authorization|password|secret|signature|x-amz-[a-z\-]+|access_?key)(=|:)\s*[^\s&\"']+"),
    re.compile(r"https?://[^\s\"']*[?&](?:X-Amz-|Signature=|token=|AWSAccessKeyId=)[^\s\"']*"),
    re.compile(r"eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]*"),
]


def utc_now():
    return datetime.now(timezone.utc)


def iso(dt=None):
    return (dt or utc_now()).strftime("%Y-%m-%dT%H:%M:%SZ")


def sanitize(text, limit=400):
    """Remove anything that looks like a credential or a signed URL; also the live token value."""
    s = str(text)
    tok = os.environ.get("EARTHDATA_TOKEN")
    if tok and len(tok) > 8:
        s = s.replace(tok, "[redacted]")
    for pat in _SECRET_PATTERNS:
        s = pat.sub(lambda m: (m.group(1) + "[redacted]") if m.lastindex else "[redacted-url]", s)
    return s[:limit]


def load_config(path):
    p = Path(path)
    if not p.is_absolute():
        p = ROOT / p
    cfg = json.loads(p.read_text(encoding="utf-8"))
    cfg["_config_sha256"] = hashlib.sha256(p.read_bytes()).hexdigest()
    return cfg


def atomic_write_json(path, obj, indent=None):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=indent, allow_nan=False), encoding="utf-8")
    os.replace(tmp, path)


def sha256_file(path, chunk=1 << 20):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        while True:
            b = fh.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def clean(obj):
    """Make JSON-safe: numpy scalars -> python, NaN/inf -> None."""
    if isinstance(obj, dict):
        return {str(k): clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [clean(v) for v in obj]
    if isinstance(obj, np.ndarray):
        return clean(obj.tolist())
    if isinstance(obj, (np.floating, float)):
        v = float(obj)
        return v if np.isfinite(v) else None
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.bool_):
        return bool(obj)
    return obj


# ---------------------------------------------------------------- geometry
def aoi_polygon_wgs84(cfg):
    from shapely.geometry import box
    w, s, e, n = cfg["aoi"]["bbox_wsen"]
    return box(w, s, e, n)


def to_crs(geom, src, dst):
    from rasterio.warp import transform_geom
    from shapely.geometry import shape
    return shape(transform_geom(src, dst, geom.__geo_interface__, precision=-1))


def parse_cmr_polygon(ring_str):
    """CMR polygon strings are 'lat lon lat lon ...'. Returns shapely Polygon in lon/lat."""
    from shapely.geometry import Polygon
    vals = [float(v) for v in ring_str.split()]
    if len(vals) < 8 or len(vals) % 2:
        raise ValueError("bad polygon")
    pts = [(vals[i + 1], vals[i]) for i in range(0, len(vals), 2)]
    poly = Polygon(pts)
    return poly if poly.is_valid else poly.buffer(0)


# ---------------------------------------------------------------- PNG writer (no PIL available)
def _chunk(tag, data):
    c = struct.pack(">I", len(data)) + tag + data
    return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png_gray_alpha(path, gray, alpha):
    """8-bit grey+alpha PNG. gray, alpha: uint8 (H,W)."""
    h, w = gray.shape
    raw = np.stack([gray, alpha], axis=-1).reshape(h, w * 2)
    return _write(path, w, h, 4, raw, b"")


def write_png_palette(path, idx, palette_rgba):
    """8-bit palette PNG with tRNS. idx uint8 (H,W); palette_rgba list of (r,g,b,a), index 0 usually transparent."""
    h, w = idx.shape
    plte = b"".join(bytes(c[:3]) for c in palette_rgba)
    trns = bytes(c[3] for c in palette_rgba)
    extra = _chunk(b"PLTE", plte) + _chunk(b"tRNS", trns)
    return _write(path, w, h, 3, idx, extra)


def _write(path, w, h, ctype, rows, extra):
    rows = np.ascontiguousarray(rows, dtype=np.uint8)
    filt = np.zeros((h, 1), dtype=np.uint8)
    raw = np.concatenate([filt, rows], axis=1).tobytes()
    data = (b"\x89PNG\r\n\x1a\n" + _chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, ctype, 0, 0, 0))
            + extra + _chunk(b"IDAT", zlib.compress(raw, 9)) + _chunk(b"IEND", b""))
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_bytes(data)
    return len(data)


def log(msg):
    print(sanitize(msg, 600), flush=True)
