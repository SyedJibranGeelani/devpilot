"""
Issue Detector — real lightweight regex-based implementation.

Scans source files for common security and code-quality problems without
requiring an LLM or any third-party linter.  Uses the existing file_reader
utilities so ignored directories (node_modules, .venv, etc.) are already
excluded.
"""

from __future__ import annotations

import re
from pathlib import Path

from models.schemas import IssuesResult, Issue
from services.file_reader import walk_project, read_file_content


# ---------------------------------------------------------------------------
# Rule table
# Each entry: (pattern, severity, category, title, description, suggestion)
# ---------------------------------------------------------------------------

_RULES: list[tuple[re.Pattern[str], str, str, str, str, str]] = [
    (
        re.compile(r'(?i)(password|passwd|secret|api_key|apikey|token)\s*=\s*["\'][^"\']{3,}["\']'),
        "critical", "security",
        "Hardcoded credential",
        "A password, secret, or API key appears to be hardcoded in the source.",
        "Move credentials to environment variables or a secrets manager.",
    ),
    (
        re.compile(r'\beval\s*\('),
        "high", "security",
        "Use of eval()",
        "eval() executes arbitrary code and is a common injection vector.",
        "Replace eval() with a safer alternative such as ast.literal_eval() or JSON.parse().",
    ),
    (
        re.compile(r'^\s*except\s*:\s*$'),
        "medium", "bug",
        "Bare except clause",
        "A bare 'except:' catches all exceptions including SystemExit and KeyboardInterrupt.",
        "Catch a specific exception type, e.g. 'except Exception:'.",
    ),
    (
        re.compile(r'(?i)#\s*(TODO|FIXME)\b'),
        "low", "code-quality",
        "Unresolved TODO/FIXME",
        "A TODO or FIXME comment indicates incomplete or broken code.",
        "Resolve or track the item in your issue tracker and remove the comment.",
    ),
    (
        re.compile(r'\bconsole\.log\s*\('),
        "low", "code-quality",
        "console.log() left in code",
        "Debug console.log() statements should not ship to production.",
        "Remove or replace with a structured logger.",
    ),
    (
        re.compile(r'\bdebugger\s*;'),
        "medium", "bug",
        "debugger statement left in code",
        "A 'debugger;' statement pauses execution in browser dev-tools and should not be in production code.",
        "Remove the debugger statement before committing.",
    ),
    (
        re.compile(r'\bos\.system\s*\('),
        "high", "security",
        "Use of os.system()",
        "os.system() passes a string to the shell and is vulnerable to shell injection.",
        "Use subprocess.run() with a list of arguments and shell=False.",
    ),
    (
        re.compile(r'\bsubprocess\.(call|run|Popen)\s*\([^)]*shell\s*=\s*True'),
        "high", "security",
        "subprocess called with shell=True",
        "Running a subprocess with shell=True enables shell injection if any argument is user-controlled.",
        "Pass a list of arguments and use shell=False.",
    ),
    (
        re.compile(r'https?://(?!localhost|127\.0\.0\.1)[a-zA-Z0-9._/-]+'),
        "low", "code-quality",
        "Hardcoded external URL",
        "A non-localhost HTTP/HTTPS URL is hardcoded in the source.",
        "Move URLs to configuration or environment variables.",
    ),
]

# Extensions to scan (skip binary/config/lock files)
_SCANNABLE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".java", ".go", ".rs", ".cs", ".rb", ".php",
    ".sh", ".yaml", ".yml", ".env",
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def detect_issues(project_path: str) -> IssuesResult:
    """Walk *project_path* and apply all rules to every scannable source file."""
    if not Path(project_path).exists():
        raise ValueError(f"Project path does not exist: {project_path}")

    all_files = walk_project(project_path)
    issues: list[Issue] = []

    for file_info in all_files:
        if file_info["extension"] not in _SCANNABLE_EXTENSIONS:
            continue
        content = read_file_content(file_info["path"])
        if not content:
            continue
        for lineno, line in enumerate(content.splitlines(), start=1):
            for pattern, severity, category, title, description, suggestion in _RULES:
                if pattern.search(line):
                    issues.append(Issue(
                        file=file_info["relative_path"],
                        line=lineno,
                        severity=severity,
                        category=category,
                        title=title,
                        description=description,
                        suggestion=suggestion,
                    ))

    critical = sum(1 for i in issues if i.severity == "critical")
    high     = sum(1 for i in issues if i.severity == "high")
    medium   = sum(1 for i in issues if i.severity == "medium")
    low      = sum(1 for i in issues if i.severity == "low")
    total    = len(issues)

    if total == 0:
        summary = "No issues detected."
    else:
        parts = []
        if critical: parts.append(f"{critical} critical")
        if high:     parts.append(f"{high} high")
        if medium:   parts.append(f"{medium} medium")
        if low:      parts.append(f"{low} low")
        summary = f"Found {total} issue{'s' if total != 1 else ''}: {', '.join(parts)}."

    return IssuesResult(
        issues=issues,
        summary=summary,
        critical_count=critical,
        high_count=high,
        medium_count=medium,
        low_count=low,
    )
