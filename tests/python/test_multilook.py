"""Synthetic tests of multilook aggregation. They do NOT validate NISAR data."""
import numpy as np
import pytest

import metrics as M


def test_block_mean_is_linear_not_db():
    ini = np.ones((2, 2))
    fin = np.array([[1.0, 1.0], [1.0, 0.01]])       # mean linear = 0.7525 (-1.2 dB); mean of dB would be -5 dB
    ok = np.ones((2, 2), bool)
    mi, mf, cv, frac = M.multilook_blocks(ini, fin, ok, 2, 1.0)
    assert mf[0, 0] == pytest.approx(0.7525) and mi[0, 0] == pytest.approx(1.0)
    delta, valid, cand = M.delta_candidates(mi, mf, cv, cv)
    assert delta[0, 0] == pytest.approx(10 * np.log10(0.7525)) and not cand[0, 0]


def test_cell_with_insufficient_valid_fraction_is_invalid():
    a = np.ones((4, 4))
    v = np.ones((4, 4), bool)
    v[0, 0] = v[0, 1] = False                        # first block: 2/4 valid
    mi, mf, cv, frac = M.multilook_blocks(a, a * 0.1, v, 2, 0.9)
    assert not cv[0, 0] and cv[0, 1] and cv[1, 0] and cv[1, 1]
    assert frac[0, 0] == 0.5 and np.isnan(mi[0, 0])
    _, _, cv2, _ = M.multilook_blocks(a, a * 0.1, v, 2, 0.5)
    assert cv2[0, 0]


def test_only_pixels_valid_in_both_dates_contribute():
    ini = np.array([[1.0, 100.0], [1.0, 1.0]])
    fin = np.array([[1.0, 1.0], [1.0, 1.0]])
    v = np.array([[True, False], [True, True]])
    mi, mf, cv, _ = M.multilook_blocks(ini, fin, v, 2, 0.75)
    assert cv[0, 0] and mi[0, 0] == pytest.approx(1.0)   # the 100.0 pixel is excluded


def test_nonpositive_and_nan_excluded_and_remainder_dropped():
    ini = np.ones((5, 5))
    ini[0, 0] = np.nan
    ini[0, 1] = 0.0
    mi, mf, cv, frac = M.multilook_blocks(ini, np.ones((5, 5)), np.ones((5, 5), bool), 2, 1.0)
    assert mi.shape == (2, 2) and not cv[0, 0] and frac[0, 0] == 0.5


def test_db_input_converted_before_averaging():
    db = np.array([[0.0, -10.0], [0.0, -10.0]])      # linear 1, 0.1 -> mean 0.55
    ok = np.ones((2, 2), bool)
    mi, _, _, _ = M.multilook_blocks(db, db, ok, 2, 1.0, unit="dB")
    assert mi[0, 0] == pytest.approx(0.55)


def test_cell_area_from_aggregated_transform():
    tr = M.aggregate_transform((10.0, 0, 500000.0, 0, -10.0, 1500000.0), 10)
    assert tr[0] == 100.0 and tr[4] == -100.0 and M.pixel_area_m2(tr) == 10000.0
    r = M.area_metrics(7, 2, M.pixel_area_m2(tr), 20.0)
    assert r["valid_area_ha"] == pytest.approx(7.0) and r["candidate_area_ha"] == pytest.approx(2.0)


def test_bad_parameters():
    a = np.ones((4, 4))
    v = np.ones((4, 4), bool)
    for n, f in ((0, 1.0), (2, 0.0), (2, 1.5)):
        with pytest.raises(ValueError):
            M.multilook_blocks(a, a, v, n, f)
    with pytest.raises(ValueError):
        M.multilook_blocks(a, a, v, 8, 1.0)
