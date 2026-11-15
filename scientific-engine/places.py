"""Gazetteer from OpenStreetMap (Overpass) for derived products. Network only in fetch(); everything else is local.

nearest_place rule: candidates are split in "major" (city, town, village, suburb, hamlet) and "minor"
(neighbourhood, quarter, locality, peak). The nearest major place wins unless a minor place is strictly closer by
more than the 1.5 factor, i.e. major is chosen when d_major <= 1.5 * d_minor (or there is no minor one).
Distances are great-circle (haversine) in km. Data (c) OpenStreetMap contributors, ODbL 1.0.
"""
import json
import math
from pathlib import Path

from util import atomic_write_json, iso, log

OVERPASS = "https://overpass-api.de/api/interpreter"
UA = "FOREST_SAR_HN-hackathon-prototype"
BBOX_SWNE = (13.95, -87.40, 14.40, -87.00)
BBOX_WSEN = [-87.40, 13.95, -87.00, 14.40]
MAJOR = ("city", "town", "village", "suburb", "hamlet")
PLACES_REL = "places/places.json"
AREAS_REL = "places/areas.geojson"
LICENSE = "ODbL 1.0 — © OpenStreetMap contributors"
PRIORITY_FACTOR = 1.5


def build_query():
    b = ",".join(str(v) for v in BBOX_SWNE)
    pl = "city|town|village|hamlet|suburb|neighbourhood|quarter|locality"
    return (f"[out:json][timeout:120];(node[place~\"^({pl})$\"][name]({b});node[natural=peak][name]({b});"
            f"way[boundary~\"^(protected_area|national_park)$\"][name]({b});"
            f"relation[boundary~\"^(protected_area|national_park)$\"][name]({b});"
            f"way[leisure=nature_reserve][name]({b});relation[leisure=nature_reserve][name]({b}););out geom;")


def haversine_km(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = (math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2)
    return 2 * 6371.0088 * math.asin(math.sqrt(a))


def nearest_place(lat, lon, places):
    """Returns {name, kind, distance_km, osm_ref} or None. See module docstring for the priority rule."""
    best = {"major": None, "minor": None}
    for p in places:
        d = haversine_km(lat, lon, p["lat"], p["lon"])
        grp = "major" if p["kind"] in MAJOR else "minor"
        if best[grp] is None or d < best[grp][0]:
            best[grp] = (d, p)
    maj, mnr = best["major"], best["minor"]
    if maj and (not mnr or maj[0] <= PRIORITY_FACTOR * mnr[0]):
        d, p = maj
    elif mnr:
        d, p = mnr
    else:
        return None
    return {"name": p["name"], "kind": p["kind"], "distance_km": round(d, 2), "osm_ref": p["id"]}


def within_area(lat, lon, areas_fc):
    """First named area polygon (smallest area first) containing the point, or None."""
    from shapely.geometry import Point, shape
    pt = Point(lon, lat)
    hits = []
    for f in (areas_fc or {}).get("features", []):
        g = shape(f["geometry"])
        if g.contains(pt):
            hits.append((g.area, f["properties"]))
    if not hits:
        return None
    pr = sorted(hits, key=lambda h: h[0])[0][1]
    return {"name": pr["name"], "kind": pr["kind"], "osm_ref": pr["osm_ref"]}


def _area_kind(tags):
    if tags.get("boundary") == "national_park":
        return "national_park"
    if tags.get("boundary") == "protected_area":
        return "protected_area"
    return "nature_reserve" if tags.get("leisure") == "nature_reserve" else None


def _rings_to_polygon(ways):
    from shapely.geometry import MultiLineString, MultiPolygon
    from shapely.ops import linemerge, polygonize, unary_union
    lines = [w for w in ways if len(w) >= 2]
    if not lines:
        return None
    polys = list(polygonize(linemerge(MultiLineString(lines))))
    if not polys:
        return None
    return unary_union(polys)


def parse_overpass(data):
    """Overpass JSON -> (places list, areas FeatureCollection)."""
    places, feats = [], []
    for el in data.get("elements", []):
        tags, name = el.get("tags") or {}, (el.get("tags") or {}).get("name")
        if not name:
            continue
        if el["type"] == "node" and "lat" in el:
            kind = tags.get("place") or ("peak" if tags.get("natural") == "peak" else None)
            if kind:
                places.append({"id": f"osm:node/{el['id']}", "name": name, "kind": kind,
                               "lat": round(el["lat"], 6), "lon": round(el["lon"], 6)})
            continue
        kind = _area_kind(tags)
        if not kind:
            continue
        geom = None
        if el["type"] == "way" and el.get("geometry"):
            pts = [(g["lon"], g["lat"]) for g in el["geometry"]]
            if len(pts) >= 4 and pts[0] == pts[-1]:
                from shapely.geometry import Polygon
                geom = Polygon(pts)
        elif el["type"] == "relation":
            outer = [[(g["lon"], g["lat"]) for g in m["geometry"]] for m in el.get("members", [])
                     if m.get("role") == "outer" and m.get("geometry")]
            geom = _rings_to_polygon(outer)
        if geom is None or geom.is_empty:
            continue
        if not geom.is_valid:
            geom = geom.buffer(0)
        feats.append({"type": "Feature", "geometry": geom.__geo_interface__,
                      "properties": {"name": name, "kind": kind, "osm_ref": f"osm:{el['type']}/{el['id']}"}})
    places.sort(key=lambda p: p["id"])
    feats.sort(key=lambda f: f["properties"]["osm_ref"])
    return places, {"type": "FeatureCollection", "features": feats}


def fetch(public, work):
    """One Overpass request; raw copy under work/places, products under public/data/places."""
    import requests
    r = requests.post(OVERPASS, data={"data": build_query()}, headers={"User-Agent": UA}, timeout=150)
    r.raise_for_status()
    raw = r.text
    data = json.loads(raw)
    d = Path(work) / "places"
    d.mkdir(parents=True, exist_ok=True)
    (d / "overpass-raw.json").write_text(raw, encoding="utf-8")
    places, areas = parse_overpass(data)
    retrieved = iso()
    meta = {"schema_version": 1, "retrieved_at": retrieved, "source": "OpenStreetMap via Overpass API",
            "license": LICENSE, "bbox": BBOX_WSEN, "bbox_order": "west,south,east,north", "places": places,
            "areas_path": AREAS_REL,
            "nearest_place_rule": "nearest major place (city/town/village/suburb/hamlet) unless a minor one "
                                  "(neighbourhood/quarter/locality/peak) is more than 1.5x closer; haversine"}
    areas.update({"source": "OpenStreetMap via Overpass API", "license": LICENSE, "retrieved_at": retrieved})
    atomic_write_json(Path(public) / PLACES_REL, meta, indent=1)
    atomic_write_json(Path(public) / AREAS_REL, areas)
    log(f"places fetched: places={len(places)} areas={len(areas['features'])}")
    return meta, areas


def load_local(public):
    """(places_meta, areas_fc) from local files, or (None, None). No network."""
    p, a = Path(public) / PLACES_REL, Path(public) / AREAS_REL
    if not p.is_file():
        return None, None
    meta = json.loads(p.read_text(encoding="utf-8"))
    areas = json.loads(a.read_text(encoding="utf-8")) if a.is_file() else {"features": []}
    return meta, areas
