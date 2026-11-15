"""Synthetic tests of numeric logic. They do NOT validate NISAR data."""
import numpy as np
import pytest

import metrics as m

T = np.ones((2, 2), bool)


def test_drop_ten_db_is_candidate():
    d, v, c = m.delta_candidates(np.array([[1.0]]), np.array([[0.1]]), T[:1, :1], T[:1, :1])
    assert d[0, 0] == pytest.approx(-10.0) and v[0, 0] and c[0, 0]


def test_equal_is_zero_not_candidate():
    a = np.full((2, 2), 0.05)
    d, v, c = m.delta_candidates(a, a.copy(), T, T)
    assert np.all(d == 0) and not c.any()


def test_nan_and_nonpositive_invalid():
    a = np.array([[np.nan, np.inf], [0.0, -1.0]])
    b = np.ones((2, 2))
    d, v, c = m.delta_candidates(a, b, T, T)
    assert not v.any() and not c.any() and np.isnan(d).all()


def test_mask_excludes():
    a = np.ones((2, 2))
    mask = np.array([[True, False], [True, True]])
    d, v, c = m.delta_candidates(a, a * 0.1, mask, T)
    assert v.sum() == 3 and not v[0, 1]


def test_exact_threshold_is_candidate_and_positive_not():
    ini = np.array([[-10.0, -10.0, -10.0]])
    fin = np.array([[-13.0, -12.999, -7.0]])
    ok = np.ones((1, 3), bool)
    d, v, c = m.delta_candidates(ini, fin, ok, ok, 3.0, unit="dB")
    assert c.tolist() == [[True, False, False]]


def test_db_not_reconverted():
    x = np.array([-12.5, -3.0])
    assert np.array_equal(m.to_db(x, "dB"), x)
    assert m.to_db(np.array([0.1]), "linear")[0] == pytest.approx(-10.0)
    with pytest.raises(ValueError):
        m.to_db(x, "unknown")


def test_bad_threshold_and_shapes():
    with pytest.raises(ValueError):
        m.delta_candidates(np.ones((1, 1)), np.ones((1, 1)), T[:1, :1], T[:1, :1], threshold_db=-3)
    with pytest.raises(m.GridMismatch):
        m.delta_candidates(np.ones((1, 1)), np.ones((2, 2)), T[:1, :1], T)


def test_zero_denominator_gives_null():
    r = m.area_metrics(0, 0, 400.0, 100.0)
    assert r["candidate_pct"] is None and r["valid_area_ha"] == 0
    assert m.area_metrics(10, 5, 400.0, 0)["coverage_pct"] is None


def test_area_from_pixel_area():
    tr = (20.0, 0, 500000.0, 0, -20.0, 1500000.0)
    assert m.pixel_area_m2(tr) == 400.0
    r = m.area_metrics(250, 25, 400.0, 20.0)
    assert r["valid_area_ha"] == pytest.approx(10.0) and r["candidate_pct"] == pytest.approx(10.0)
    assert r["coverage_pct"] == pytest.approx(50.0)


def test_total_uses_areas_not_mean_of_percentages():
    s1 = m.area_metrics(100, 50, 400.0, 100.0)   # 50 %
    s2 = m.area_metrics(900, 0, 400.0, 400.0)    # 0 %
    tot = m.aggregate_sectors([s1, s2], [100.0, 400.0])
    assert tot["candidate_pct"] == pytest.approx(100 * 2.0 / 40.0)  # 2 ha / 40 ha valid
    assert tot["candidate_pct"] != pytest.approx(25.0)             # mean of 50 % and 0 %


@pytest.mark.parametrize("tp,band", [(-0.01, "net_gain"), (0, "stable"), (2, "stable"), (2.0001, "watch"),
                                     (5, "watch"), (5.01, "caution"), (10, "caution"), (10.01, "high_priority"),
                                     (18, "high_priority"), (18.01, "very_high_priority"), (None, "not_evaluated")])
def test_traffic_light_limits(tp, band):
    assert m.traffic_light(tp) == band


def test_tp_requires_real_cover():
    assert m.tp_pct(None, 5) is None and m.tp_pct(0, 1) is None
    assert m.tp_pct(100, 90) == pytest.approx(10.0) and m.tp_pct(100, 110) < 0
    assert m.rhythm_12d(None, 24) is None and m.rhythm_12d(10, 0) is None
    assert m.rhythm_12d(10, 24) == pytest.approx(5.0)


def test_grid_crs_mismatch_rejected():
    g = {"crs": "EPSG:32616", "transform": (20, 0, 0, 0, -20, 0), "shape": (3, 3)}
    m.require_same_grid(g, dict(g))
    for bad in ({"crs": "EPSG:32617"}, {"crs": None}, {"shape": (4, 3)}, {"transform": (10, 0, 0, 0, -10, 0)}):
        with pytest.raises(m.GridMismatch):
            m.require_same_grid(g, {**g, **bad})
