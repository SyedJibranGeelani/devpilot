"""
File system utilities for reading a local project.

Walks the project directory, skips ignored paths, and reads file content
up to the configured size limit.
"""

import os
from pathlib import Path
from config import settings

IGNORED_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt", "coverage", ".pytest_cache",
    ".mypy_cache", ".tox", "eggs", "*.egg-info",
}

IGNORED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2",
    ".ttf", ".eot", ".mp4", ".mp3", ".zip", ".tar", ".gz", ".lock",
    ".bin", ".exe", ".dll", ".so", ".pyc",
}


def walk_project(project_path: str) -> list[dict]:
    """
    Return a flat list of dicts describing every readable source file:
        { path, relative_path, extension, size_kb }
    """
    root = Path(project_path).resolve()
    if not root.exists():
        raise ValueError(f"Project path does not exist: {project_path}")
    if not root.is_dir():
        raise ValueError(f"Project path is not a directory: {project_path}")

    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        # Prune ignored directories in-place
        dirnames[:] = [
            d for d in dirnames
            if d not in IGNORED_DIRS and not d.startswith(".")
        ]
        for filename in filenames:
            ext = Path(filename).suffix.lower()
            if ext in IGNORED_EXTENSIONS:
                continue
            abs_path = Path(dirpath) / filename
            rel_path = abs_path.relative_to(root)
            size_kb = abs_path.stat().st_size / 1024
            files.append({
                "path": str(abs_path),
                "relative_path": str(rel_path),
                "extension": ext,
                "size_kb": round(size_kb, 2),
            })

    return files[: settings.max_files_per_analysis]


def read_file_content(file_path: str) -> str | None:
    """
    Read and return the text content of a file.
    Returns None if the file exceeds the size limit or cannot be decoded.
    """
    path = Path(file_path)
    size_kb = path.stat().st_size / 1024
    if size_kb > settings.max_file_size_kb:
        return None
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None


def build_file_tree(project_path: str) -> dict:
    """
    Build a nested dict representing the directory tree (for the API response).
    """
    root = Path(project_path).resolve()

    def _node(p: Path) -> dict:
        node: dict = {"name": p.name, "path": str(p.relative_to(root)), "type": "file", "children": []}
        if p.is_dir():
            node["type"] = "directory"
            children = []
            for child in sorted(p.iterdir()):
                if child.name in IGNORED_DIRS or child.name.startswith("."):
                    continue
                if child.is_file() and child.suffix.lower() in IGNORED_EXTENSIONS:
                    continue
                children.append(_node(child))
            node["children"] = children
        return node

    return _node(root)
