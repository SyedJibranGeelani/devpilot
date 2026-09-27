"""
Test Generator — real lightweight implementation.

Two-pass regex-based approach:
  Pass 1 — index every test file in the project.
  Pass 2 — scan source files for function definitions; flag those whose
            module has no corresponding test file as uncovered.

Then generates minimal test stubs (pytest for Python, Jest/Vitest for JS/TS)
for each uncovered source file.

No LLM, no third-party linter — only re, pathlib, and the existing
file_reader utilities.
"""

from __future__ import annotations

import re
from pathlib import Path

from models.schemas import TestsResult, UncoveredFunction, GeneratedTest
from services.file_reader import walk_project, read_file_content


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Patterns that identify a file as a test file
_TEST_FILE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r'^test_.+\.py$',       re.IGNORECASE),
    re.compile(r'^.+_test\.py$',       re.IGNORECASE),
    re.compile(r'^.+\.test\.(js|ts|jsx|tsx)$', re.IGNORECASE),
    re.compile(r'^.+\.spec\.(js|ts|jsx|tsx)$', re.IGNORECASE),
]

# Source extensions we want to analyse
_PYTHON_EXTS  = {".py"}
_JS_TS_EXTS   = {".js", ".ts", ".jsx", ".tsx"}
_SOURCE_EXTS  = _PYTHON_EXTS | _JS_TS_EXTS

# Function-detection regexes
# Python: top-level or method `def`
_PY_FUNC_RE = re.compile(r'^\s*(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(')

# JS/TS: function declarations, arrow functions, method shorthands
_JS_FUNC_RE = re.compile(
    r'(?:'
    r'(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\('   # function declaration
    r'|(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][A-Za-z0-9_$]*)\s*=>'  # arrow
    r'|^\s{0,4}(?:async\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\([^)]*\)\s*\{'       # method shorthand
    r')'
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_test_file(filename: str) -> bool:
    return any(p.match(filename) for p in _TEST_FILE_PATTERNS)


def _stem_for_lookup(filename: str) -> str:
    """
    Return the canonical module stem used to match a source file against a
    test file.  E.g. 'utils.py' → 'utils', 'api.service.ts' → 'api.service'.
    Strips the final extension only.
    """
    return Path(filename).stem.lower()


def _extract_python_functions(content: str) -> list[str]:
    names: list[str] = []
    for line in content.splitlines():
        m = _PY_FUNC_RE.match(line)
        if m:
            name = m.group(1)
            if not name.startswith("_"):   # skip private / dunder helpers
                names.append(name)
    return names


def _extract_js_functions(content: str) -> list[str]:
    names: list[str] = []
    for line in content.splitlines():
        m = _JS_FUNC_RE.search(line)
        if m:
            name = m.group(1) or m.group(2) or m.group(3)
            if name and not name.startswith("_"):
                names.append(name)
    return names


def _make_pytest_stub(relative_path: str, functions: list[str]) -> str:
    module_import = Path(relative_path).stem
    lines = [
        f"# Auto-generated test stubs for {relative_path}",
        f"# TODO: fill in real assertions",
        f"",
        f"import pytest",
        f"# from {module_import} import ...",
        f"",
    ]
    for fn in functions:
        lines += [
            f"def test_{fn}():",
            f"    # TODO: arrange, act, assert",
            f"    pass",
            f"",
        ]
    return "\n".join(lines)


def _make_jest_stub(relative_path: str, functions: list[str]) -> str:
    lines = [
        f"// Auto-generated test stubs for {relative_path}",
        f"// TODO: fill in real assertions",
        f"",
        f"import {{ describe, it, expect }} from 'vitest';",
        f"// import {{ ... }} from './{Path(relative_path).stem}';",
        f"",
        f"describe('{Path(relative_path).stem}', () => {{",
    ]
    for fn in functions:
        lines += [
            f"  it('{fn}', () => {{",
            f"    // TODO: arrange, act, assert",
            f"    expect(true).toBe(true);",
            f"  }});",
            f"",
        ]
    lines.append("});")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def generate_tests(project_path: str) -> TestsResult:
    """
    Walk *project_path*, detect untested functions, and produce test stubs.
    Coverage estimate is based on test-file presence, not executed coverage.
    """
    if not Path(project_path).exists():
        raise ValueError(f"Project path does not exist: {project_path}")

    all_files = walk_project(project_path)

    # ── Pass 1: index test file stems ────────────────────────────────────────
    # Map: stem (lower) → True, so we can check O(1) per source file
    test_stems: set[str] = set()
    for f in all_files:
        fname = Path(f["relative_path"]).name
        if _is_test_file(fname):
            stem = fname.lower()
            # strip test_ prefix or _test / .test / .spec suffix variations
            for pat, repl in [
                (r'^test_', ''), (r'_test$', ''),
                (r'\.test$', ''), (r'\.spec$', ''),
            ]:
                stem = re.sub(pat, stem, stem)   # keep original for set
            # store the raw filename stem (without final ext) for matching
            test_stems.add(_stem_for_lookup(fname))

    # ── Pass 2: scan source files ─────────────────────────────────────────────
    # source_stem → list[function_name]
    source_functions: dict[str, list[str]] = {}
    # source_stem → relative_path
    source_paths: dict[str, str] = {}
    # source_stem → extension
    source_exts: dict[str, str] = {}

    for f in all_files:
        ext = f["extension"]
        if ext not in _SOURCE_EXTS:
            continue
        fname = Path(f["relative_path"]).name
        if _is_test_file(fname):
            continue   # skip test files themselves

        content = read_file_content(f["path"])
        if not content:
            continue

        if ext in _PYTHON_EXTS:
            fns = _extract_python_functions(content)
        else:
            fns = _extract_js_functions(content)

        if not fns:
            continue

        stem = _stem_for_lookup(fname)
        source_functions[stem] = source_functions.get(stem, []) + fns
        source_paths[stem] = f["relative_path"]
        source_exts[stem] = ext

    # ── Build uncovered list ──────────────────────────────────────────────────
    total_functions = sum(len(v) for v in source_functions.values())
    uncovered: list[UncoveredFunction] = []
    uncovered_by_file: dict[str, list[str]] = {}   # relative_path → [fn, ...]

    for stem, fns in source_functions.items():
        # A test file is considered present when any test stem contains the
        # source stem (e.g. source 'utils' matched by 'test_utils' stem 'utils')
        has_test = any(
            stem in t or t in stem
            for t in test_stems
        )
        if not has_test:
            rel = source_paths[stem]
            uncovered_by_file[rel] = fns
            for fn in fns:
                uncovered.append(UncoveredFunction(
                    file=rel,
                    function_name=fn,
                    reason="No test file found for this module",
                ))

    # ── Generate stubs ────────────────────────────────────────────────────────
    generated: list[GeneratedTest] = []
    for rel_path, fns in uncovered_by_file.items():
        ext = Path(rel_path).suffix.lower()
        if ext in _PYTHON_EXTS:
            code = _make_pytest_stub(rel_path, fns)
            framework = "pytest"
        else:
            code = _make_jest_stub(rel_path, fns)
            framework = "vitest"
        generated.append(GeneratedTest(
            source_file=rel_path,
            test_code=code,
            test_framework=framework,
        ))

    # ── Summary + coverage estimate ───────────────────────────────────────────
    uncovered_count = len(uncovered)
    covered_count   = total_functions - uncovered_count
    if total_functions > 0:
        pct = round(covered_count / total_functions * 100)
        coverage_estimate = f"~{pct}%"
    else:
        coverage_estimate = "N/A"

    if total_functions == 0:
        summary = "No functions detected in source files."
    elif uncovered_count == 0:
        summary = (
            f"All {total_functions} detected function(s) appear to have a corresponding test file. "
            f"Estimated coverage: {coverage_estimate}."
        )
    else:
        summary = (
            f"Found {total_functions} function(s) across {len(source_functions)} source file(s). "
            f"{uncovered_count} function(s) in {len(uncovered_by_file)} file(s) have no corresponding test file. "
            f"Estimated coverage: {coverage_estimate}. "
            f"Note: this is an estimate based on test-file presence, not executed coverage."
        )

    return TestsResult(
        uncovered_functions=uncovered,
        generated_tests=generated,
        summary=summary,
        coverage_estimate=coverage_estimate,
    )
