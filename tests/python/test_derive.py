import copy

import numpy as np
import pytest
from shapely.geometry import box

import derive
import places as PL

TR = (100.0, 0.0, 500000.0, 0.0, -100.0, 1600000.0)


def test_cluster_components_and_merge():
    c = np.zeros((20, 20), bool)
    c[2, 2] = c[3, 3] = True          # diagonal neighbours -> one component (8-connected)
    c[3, 6] = True                    # gap of 2 empty cells from (3,3) -> merged
    c[10, 10] = True                  # isolated
    c[10, 14] = True                  # gap of 3 cells -> not merged
    comps = sorted(derive.cluster_cells(c), key=len, reverse=True)
    assert [len(x) for x in comps] == [3, 1, 1]


def test_zones_exact_area_and_order():
    cand = np.zeros((20, 20), bool)
    cand[2, 2:4] = True
    cand[15, 15] = True
    delta = np.full(cand.shape, np.nan)
    delta[cand] = -4.0
    fc, zone_of = derive.build_zones(cand, delta, TR, 10000.0, "EPSG:32616", 1000, [], None)
    ps = [f["properties"] for f in fc["features"]]
    assert [p["zone_id"] for p in ps] == ["Z1", "Z2"]
    assert sum(p["area_ha"] for p in ps) == 3.0 and sum(p["cell_count"] for p in ps) == 3
    assert ps[0]["area_ha"] == 2.0 and ps[0]["nearest_place"] is None and len(zone_of) == 3


def test_nearest_place_priority():
    pl = [{"id": "osm:node/1", "name": "Barrio", "kind": "neighbourhood", "lat": 14.0, "lon": -87.0},
          {"id": "osm:node/2", "name": "Aldea", "kind": "village", "lat": 14.0, "lon": -87.0 + 0.0135},  # ~1.45 km
          {"id": "osm:node/3", "name": "Lejos", "kind": "town", "lat": 14.0, "lon": -86.9}]
    n = PL.nearest_place(14.0, -87.0 + 0.0001, pl)  # barrio ~0.01 km; village ~1.5 km -> barrio
    assert n["name"] == "Barrio"
    n = PL.nearest_place(14.0, -87.0 + 0.0070, pl)  # barrio 0.77, village 0.68 -> major within 1.5x
    assert n["name"] == "Aldea" and n["osm_ref"] == "osm:node/2"
    assert PL.nearest_place(14.0, -87.0, []) is None


def test_within_area():
    fc = {"features": [{"geometry": box(-87.1, 14.0, -87.0, 14.1).__geo_interface__,
                        "properties": {"name": "P", "kind": "national_park", "osm_ref": "osm:way/1"}}]}
    assert PL.within_area(14.05, -87.05, fc)["name"] == "P"
    assert PL.within_area(14.5, -87.05, fc) is None


def _pair(valid, cand, px=10000.0):
    return {"pair_id": "p", "valid_cells": int(valid.sum()), "candidate_cells": int(cand.sum()),
            "metrics": {"valid_area_ha": valid.sum() * px / 1e4, "candidate_area_ha": cand.sum() * px / 1e4}}


def _sectors(valid, cand, aoi):
    cnt = derive.sector_counts(valid, cand, aoi, TR, 1000)
    return {"features": [{"properties": {"sector_id": k, "metrics_by_pair": {"p": {
        "valid_area_ha": v, "candidate_area_ha": c}}}} for k, (v, c) in cnt.items()]}


def test_verify_ok_and_abort():
    valid = np.ones((20, 20), bool)
    cand = np.zeros((20, 20), bool)
    cand[2, 2] = True
    aoi = np.ones((20, 20), bool)
    pair, sec = _pair(valid, cand), _sectors(valid, cand, aoi)
    assert derive.verify(valid, cand, aoi, TR, 10000.0, pair, sec, 1000)["ok"]
    bad = copy.deepcopy(pair)
    bad["candidate_cells"] += 1
    with pytest.raises(derive.DeriveMismatch):
        derive.verify(valid, cand, aoi, TR, 10000.0, bad, sec, 1000)
    bad_sec = copy.deepcopy(sec)
    bad_sec["features"][0]["properties"]["metrics_by_pair"]["p"]["valid_area_ha"] += 1
    with pytest.raises(derive.DeriveMismatch):
        derive.verify(valid, cand, aoi, TR, 10000.0, pair, bad_sec, 1000)


def test_valid_area_exact():
    valid = np.zeros((20, 20), bool)
    valid[2:10, 2:10] = True
    valid[5, 5] = False
    fc = derive.build_valid_area(valid, TR, 10000.0, "EPSG:32616")
    assert fc["features"][0]["properties"]["area_ha"] == 63.0
