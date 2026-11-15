"""Comparison index, --pair-id validation and manifest safety. Synthetic fixtures in tmp, no network."""
import hashlib
import json
import types

import pytest

import export
import pipeline
import snapshot_index as si

CFG = {"algorithm_version": "alg-1", "processing": {"polarization": "HVHV", "threshold_db": 3.0, "multilook_px": 10,
                                                      "multilook_min_valid_fraction": 0.9}}


def _snap(public, sid, pair_id, fin, days, ini="2026-07-01", multilook=10, thr=3.0, alg="alg-1", ready=True):
    d = public / "snapshots" / sid
    d.mkdir(parents=True)
    scene = {"id": "I", "track": 98, "frame": 81, "pass": "DESCENDING", "collection": "C"}
    (d / "catalog.json").write_text(json.dumps({"scenes": [scene], "pairs": [
        {"id": pair_id, "common_coverage_pct": 94.7, "collection": "C", "interval_days": days}]}))
    if not ready:
        return
    params = {"threshold_db": thr, "multilook_px": multilook, "multilook_min_valid_fraction": 0.9}
    pair = {"pair_id": pair_id, "initial_id": "I", "final_id": "F", "initial_date": ini, "final_date": fin,
            "maturity": "provisional", "polarization": "HVHV", "interval_days": days, "params": params,
            "metrics": {"valid_area_ha": 1.0, "candidate_area_ha": 0.1, "candidate_pct": 10.0, "coverage_pct": 99.0}}
    (d / "results.json").write_text(json.dumps({"snapshot_id": sid, "algorithm_version": alg, "pairs": [pair]}))


def test_index_inclusion_exclusion_duplicates_order(tmp_path):
    _snap(tmp_path, "20260101T000000Z-a", "pA", "2026-10-19", 83.6)
    _snap(tmp_path, "20260101T000001Z-a", "pB", "2026-10-19", 36.0)
    _snap(tmp_path, "20260101T000002Z-a", "pC", "2026-09-01", 10.0)
    _snap(tmp_path, "20260101T000003Z-a", "pOld", "2026-10-19", 12.0, multilook=1)     # native 10 m -> excluded
    _snap(tmp_path, "20260101T000004Z-a", "pT", "2026-10-19", 12.0, thr=5.0)           # other threshold
    _snap(tmp_path, "20260101T000005Z-a", "pA", "2026-10-19", 83.6)                    # duplicate, newer wins
    _snap(tmp_path, "20260101T000006Z-a", "pAlg", "2026-10-19", 5.0, alg="alg-2")
    _snap(tmp_path, "20260101T000007Z-a", "pCat", "2026-10-19", 5.0, ready=False)      # catalog_only: ignored
    idx = si.build(tmp_path, CFG)
    comps = idx["comparisons"]
    assert [(c["pair_id"], c["snapshot_id"][-8:]) for c in comps] == [
        ("pB", "01Z-a"[-8:].rjust(8, "0")), ("pA", "05Z-a"[-8:].rjust(8, "0")), ("pC", "02Z-a"[-8:].rjust(8, "0"))]
    assert comps[1]["interval_days"] == 84 and isinstance(comps[1]["interval_days"], int)
    assert comps[0]["track"] == 98 and comps[0]["collection"] == "C" and comps[0]["common_coverage_pct"] == 94.7
    assert comps[0]["results_path"] == "snapshots/20260101T000001Z-a/results.json"
    ex = {e["snapshot_id"]: e["reason"] for e in idx["excluded"]}
    assert set(ex) == {"20260101T000000Z-a", "20260101T000003Z-a", "20260101T000004Z-a", "20260101T000006Z-a"}
    assert "multilook_px" in ex["20260101T000003Z-a"] and "duplicate" in ex["20260101T000000Z-a"]
    assert idx["method"]["multilook_px"] == 10 and idx["schema_version"] == 1
    si.rebuild(tmp_path, CFG)
    assert (tmp_path / "snapshots/index.json").is_file()


def test_ensure_manifest_index_path_only_adds_field(tmp_path):
    m = {"schema_version": 1, "status": "ready", "snapshot_id": "x", "message": None}
    (tmp_path / "manifest.json").write_text(json.dumps(m))
    assert si.ensure_manifest_index_path(tmp_path)
    got = json.loads((tmp_path / "manifest.json").read_text())
    assert got == {**m, "index_path": "snapshots/index.json"}


def _pairs():
    return [{"id": "ok", "status": "compatible"}, {"id": "bad", "status": "incompatible"}]


def test_pair_id_rejects_unknown_and_incompatible():
    sel, errs = pipeline.validate_pair_ids(["ok", "bad", "ghost"], _pairs())
    assert [p["id"] for p in sel] == ["ok"] and len(errs) == 2


def _scene(i, date):
    return {"id": i, "acquired_at": date + "T00:16:20", "track": 98, "frame": 81, "pass": "D", "look_side": "R",
            "frequency": "A", "hvhv_expected": True}


def test_pair_mode_blocked_does_not_touch_manifest(tmp_path, monkeypatch):
    import acquisition
    (tmp_path / "manifest.json").write_text('{"snapshot_id": "keep"}')
    before = hashlib.sha256((tmp_path / "manifest.json").read_bytes()).hexdigest()

    def boom(*a, **k):
        raise RuntimeError("no EARTHDATA_TOKEN")
    monkeypatch.setattr(acquisition, "acquire", boom)
    scenes = [_scene("I", "2026-07-27"), _scene("F", "2026-10-19")]
    pairs = [{"id": "p1", "status": "compatible", "initial_id": "I", "final_id": "F", "interval_days": 84,
              "common_coverage_pct": 94.7, "collection": "C"}]
    args = types.SimpleNamespace(dry_run=False, local_input=None)
    status, det = pipeline._execute_pairs(args, {}, _Slog(), tmp_path, tmp_path, tmp_path, scenes, pairs, {}, {},
                                          {}, ["p1"])
    assert status == "blocked" and "p1" in det["blocked"] and det["manifest_touched"] is False
    assert hashlib.sha256((tmp_path / "manifest.json").read_bytes()).hexdigest() == before
    assert not (tmp_path / "snapshots").exists()
    st, det = pipeline._execute_pairs(args, {}, _Slog(), tmp_path, tmp_path, tmp_path, scenes, pairs, {}, {}, {},
                                      ["nope"])
    assert st == "usage"


class _Slog:
    def __init__(self):
        self.errors = []

    def stage(self, *a, **k):
        pass

    def error(self, name, exc):
        self.errors.append(name)
