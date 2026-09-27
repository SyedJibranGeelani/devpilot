"""
Tests for the file_reader service.
"""
from pathlib import Path
from services.file_reader import walk_project, build_file_tree


def test_walk_project(tmp_path):
    (tmp_path / "app.py").write_text("print('hello')")
    (tmp_path / "node_modules").mkdir()
    (tmp_path / "node_modules" / "dep.js").write_text("module.exports={}")

    files = walk_project(str(tmp_path))
    paths = [f["relative_path"] for f in files]

    assert "app.py" in paths
    # node_modules must be pruned
    assert not any("node_modules" in p for p in paths)


def test_walk_project_invalid_path():
    import pytest
    with pytest.raises(ValueError):
        walk_project("/nonexistent/path/xyz")


def test_build_file_tree(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "main.ts").write_text("export {}")

    tree = build_file_tree(str(tmp_path))
    assert tree["type"] == "directory"
    names = [c["name"] for c in tree["children"]]
    assert "src" in names
