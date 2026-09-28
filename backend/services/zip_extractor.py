"""
ZIP Extractor — secure extraction of uploaded project archives.

Security measures:
  - Path traversal prevention (every member is resolved inside the target dir)
  - Total extraction size limit
  - Ignored directory filtering (node_modules, .git, __pycache__, dist, …)
  - File count limit
"""

from __future__ import annotations

import os
import shutil
import tempfile
import zipfile
from pathlib import Path

# Directories to skip entirely during extraction
IGNORED_DIRS: set[str] = {
    "node_modules", ".git", "__pycache__", ".venv", "venv", "env",
    "dist", "build", ".next", ".nuxt", "coverage", ".pytest_cache",
    ".mypy_cache", ".tox", ".eggs", ".ruff_cache", "vendor",
}

# Maximum uncompressed bytes allowed (200 MB)
MAX_EXTRACT_BYTES: int = 200 * 1024 * 1024

# Maximum number of files to extract
MAX_EXTRACT_FILES: int = 5_000


class ZipExtractionError(ValueError):
    """Raised when the ZIP cannot be safely extracted."""


def _should_skip_member(member_path: str) -> bool:
    """Return True if any path component is an ignored directory."""
    parts = Path(member_path).parts
    for part in parts:
        clean = part.strip("/\\")
        if clean in IGNORED_DIRS or clean.startswith("."):
            return True
    return False


def extract_zip(zip_bytes: bytes) -> str:
    """
    Write *zip_bytes* to a temporary file, validate it, and extract it
    into a freshly created temporary directory.

    Returns the path to the extracted project root (the single top-level
    directory inside the archive, or the extraction directory itself if
    there are multiple top-level entries).

    Raises ZipExtractionError for any safety violation.
    """
    # ── Write to temp file so zipfile can seek ────────────────────────────────
    tmp_zip = tempfile.NamedTemporaryFile(suffix=".zip", delete=False)
    try:
        tmp_zip.write(zip_bytes)
        tmp_zip.flush()
        tmp_zip.close()

        if not zipfile.is_zipfile(tmp_zip.name):
            raise ZipExtractionError("Uploaded file is not a valid ZIP archive.")

        extract_dir = tempfile.mkdtemp(prefix="devpilot_")

        with zipfile.ZipFile(tmp_zip.name, "r") as zf:
            members = zf.infolist()

            # ── Safety checks ─────────────────────────────────────────────────
            total_size = 0
            file_count = 0
            for member in members:
                if member.is_dir():
                    continue
                if _should_skip_member(member.filename):
                    continue

                # Path traversal check
                target = (Path(extract_dir) / member.filename).resolve()
                if not str(target).startswith(str(Path(extract_dir).resolve())):
                    raise ZipExtractionError(
                        f"Path traversal detected in ZIP member: {member.filename}"
                    )

                total_size += member.file_size
                file_count += 1

                if total_size > MAX_EXTRACT_BYTES:
                    raise ZipExtractionError(
                        f"ZIP extraction would exceed the {MAX_EXTRACT_BYTES // (1024*1024)} MB limit."
                    )
                if file_count > MAX_EXTRACT_FILES:
                    raise ZipExtractionError(
                        f"ZIP contains more than {MAX_EXTRACT_FILES} files after filtering."
                    )

            if file_count == 0:
                raise ZipExtractionError(
                    "ZIP archive contains no extractable source files "
                    "(all entries were empty or in ignored directories)."
                )

            # ── Extract allowed members ───────────────────────────────────────
            for member in members:
                if _should_skip_member(member.filename):
                    continue
                zf.extract(member, extract_dir)

    finally:
        try:
            os.unlink(tmp_zip.name)
        except OSError:
            pass

    # ── Determine project root ────────────────────────────────────────────────
    # If the archive has a single top-level directory, use it as the root so
    # the analysis services see a clean project tree without the wrapping folder.
    top_entries = [
        e for e in Path(extract_dir).iterdir()
        if not e.name.startswith(".")
    ]
    if len(top_entries) == 1 and top_entries[0].is_dir():
        return str(top_entries[0])

    return extract_dir


def cleanup_extract_dir(path: str) -> None:
    """Remove a temporary extraction directory, ignoring errors."""
    try:
        root = Path(path)
        # Walk up one level if we were given the single top-level subdir
        candidate = root.parent
        if candidate.name.startswith("devpilot_"):
            shutil.rmtree(str(candidate), ignore_errors=True)
        else:
            shutil.rmtree(str(root), ignore_errors=True)
    except Exception:
        pass
