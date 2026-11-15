"""Export transactionality, catalog schema, demo-data guard. Synthetic fixtures only (tmp dirs)."""
import json

import pytest

import export
import util


def _catalog(n=2):
    scenes = [{k: None for k in export.SCENE_KEYS} | {"id": f"S{i}", "collection": "X"} for i in range(n)]
    pairs = [{"id": "p1", "initial_id": "S0", "final_id": "S1", "status": "needs_review",
              "reason": "unit test", "common_coverage_pct": None}]
    return {"schema_version": 1, "source": "NASA-ISRO NISAR", "query": {}, "scenes": scenes, "pairs": pairs}


def test_publish_catalog_only_and_preserve_previous(tmp_path):
    m1 = export.publish(tmp_path, "snapA", "catalog_only", _catalog(), {"x": 1})
    assert m1["results_path"] is None and (tmp_path / "snapshots/snapA/catalog.json").is_file()
    bad = _catalog()
    bad["pairs"][0]["initial_id"] = "ghost"
    with pytest.raises(export.ExportError):
        export.publish(tmp_path, "snapB", "catalog_only", bad, {})
    man = json.loads((tmp_path / "manifest.json").read_text())
    assert man["snapshot_id"] == "snapA"
    assert (tmp_path / "snapshots/snapA/catalog.json").is_file()
    assert not (tmp_path / "snapshots/snapB").exists() and not (tmp_path / "snapshots/.tmp-snapB").exists()


def test_demo_data_never_published(tmp_path):
    with pytest.raises(export.ExportError):
        export.publish(tmp_path, "d", "catalog_only", _catalog(), {}, data_mode="demo")
    assert not (tmp_path / "manifest.json").exists()


def test_ready_requires_results_and_real(tmp_path):
    with pytest.raises(export.ExportError):
        export.publish(tmp_path, "r", "ready", _catalog(), {})
    r = {"schema_version": 1, "snapshot_id": "r", "data_mode": "demo", "processed_at": "t",
         "algorithm_version": "a", "pairs": []}
    with pytest.raises(export.ExportError):
        export.publish(tmp_path, "r2", "ready", _catalog(), {}, results=r, sectors={})
    assert not (tmp_path / "manifest.json").exists()


def test_sanitize_hides_tokens(monkeypatch):
    monkeypatch.setenv("EARTHDATA_TOKEN", "abcdefgh12345678")
    s = util.sanitize("Authorization: Bearer abcdefgh12345678 and https://x/y?X-Amz-Signature=abc")
    assert "abcdefgh12345678" not in s and "X-Amz" not in s


def test_png_writer(tmp_path):
    import numpy as np
    n = util.write_png_palette(tmp_path / "a.png", np.zeros((4, 4), np.uint8), [(0, 0, 0, 0), (255, 0, 0, 255)])
    assert (tmp_path / "a.png").read_bytes()[:8] == b"\x89PNG\r\n\x1a\n" and n > 0
