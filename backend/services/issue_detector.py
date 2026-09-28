"""
Issue Detector — real lightweight regex-based implementation.

Scans source files for common security and code-quality problems without
requiring an LLM or any third-party linter.  Uses the existing file_reader
utilities so ignored directories (node_modules, .venv, etc.) are already
excluded.

Covered categories:
  - security: hardcoded credentials/secrets, dangerous functions (eval/exec/
    os.system/subprocess shell=True/pickle/yaml.load), SQL injection patterns,
    insecure cryptography (MD5/SHA1/DES/RC4), SSL verification disabled,
    CORS wildcard, DEBUG mode, weak SECRET_KEY, private key material
  - bug: bare except, silenced exceptions, debugger statements, pdb breakpoints
  - code-quality: console.log/debug, print(), TODO/FIXME/HACK markers,
    NOSONAR suppressions, hardcoded external URLs
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
    # ── Hardcoded credentials / secrets ───────────────────────────────────────
    (
        re.compile(r'(?i)(password|passwd|secret|api_key|apikey|token|auth_token|access_token|private_key)\s*=\s*["\'][^"\']{3,}["\']'),
        "critical", "security",
        "Hardcoded credential",
        "A password, secret, or API key appears to be hardcoded in the source.",
        "Move credentials to environment variables or a secrets manager.",
    ),
    (
        re.compile(r'(?i)(aws_access_key_id|aws_secret_access_key)\s*=\s*["\'][^"\']{5,}["\']'),
        "critical", "security",
        "Hardcoded AWS credential",
        "An AWS access key or secret appears to be hardcoded in the source.",
        "Use IAM roles, environment variables, or AWS Secrets Manager instead.",
    ),
    (
        re.compile(r'(?i)-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----'),
        "critical", "security",
        "Private key material in source",
        "A PEM-encoded private key appears to be embedded directly in a source file.",
        "Remove the key from source control immediately and rotate it.",
    ),
    # ── Dangerous functions ───────────────────────────────────────────────────
    (
        re.compile(r'\beval\s*\('),
        "high", "security",
        "Use of eval()",
        "eval() executes arbitrary code and is a common code-injection vector.",
        "Replace eval() with a safer alternative such as ast.literal_eval() or JSON.parse().",
    ),
    (
        re.compile(r'\bexec\s*\('),
        "high", "security",
        "Use of exec()",
        "exec() executes arbitrary Python code and is difficult to audit.",
        "Avoid exec(); prefer explicit function calls or importlib if dynamic loading is needed.",
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
        re.compile(r'\bpickle\.(load|loads|Unpickler)\s*\('),
        "high", "security",
        "Unsafe deserialization with pickle",
        "Deserializing untrusted data with pickle can execute arbitrary code.",
        "Avoid pickle for untrusted data; use JSON, msgpack, or a validated schema instead.",
    ),
    (
        re.compile(r'\byaml\.load\s*\([^)]*\)'),
        "high", "security",
        "yaml.load() without Loader",
        "yaml.load() without an explicit SafeLoader can deserialize arbitrary Python objects.",
        "Use yaml.safe_load() or yaml.load(data, Loader=yaml.SafeLoader).",
    ),
    # ── SQL injection risk ─────────────────────────────────────────────────────
    (
        re.compile(r'(?i)(execute|cursor\.execute)\s*\(\s*["\'].*%[sd].*["\']'),
        "high", "security",
        "Possible SQL injection via string formatting",
        "Building SQL queries with %-string formatting can allow SQL injection if user input is involved.",
        "Use parameterized queries: cursor.execute(sql, (param,)).",
    ),
    (
        re.compile(r'(?i)(execute|cursor\.execute)\s*\(\s*f["\']'),
        "high", "security",
        "Possible SQL injection via f-string",
        "Building SQL queries with f-strings can allow SQL injection if variables contain user input.",
        "Use parameterized queries instead of string interpolation.",
    ),
    # ── Debug artefacts ───────────────────────────────────────────────────────
    (
        re.compile(r'\bconsole\.log\s*\('),
        "low", "code-quality",
        "console.log() left in code",
        "Debug console.log() statements should not ship to production.",
        "Remove or replace with a structured logger.",
    ),
    (
        re.compile(r'\bconsole\.(warn|error|debug|info)\s*\('),
        "low", "code-quality",
        "Console debug call left in code",
        "Console debug/warn/error/info calls should not ship to production.",
        "Remove or replace with a structured logging library.",
    ),
    (
        re.compile(r'\bdebugger\s*;'),
        "medium", "bug",
        "debugger statement left in code",
        "A 'debugger;' statement pauses execution in browser dev-tools and should not be in production.",
        "Remove the debugger statement before committing.",
    ),
    (
        re.compile(r'\bprint\s*\('),
        "low", "code-quality",
        "print() debug statement",
        "print() calls are typically debug artefacts and should not remain in production code.",
        "Replace with a proper logging call (logging.info(), logging.debug(), etc.).",
    ),
    (
        re.compile(r'\bpdb\.(set_trace|breakpoint)\s*\('),
        "medium", "bug",
        "pdb debugger breakpoint left in code",
        "A pdb breakpoint will halt the process in production.",
        "Remove all pdb.set_trace() / pdb.breakpoint() calls before deploying.",
    ),
    # ── Exception handling ────────────────────────────────────────────────────
    (
        re.compile(r'^\s*except\s*:\s*$'),
        "medium", "bug",
        "Bare except clause",
        "A bare 'except:' catches all exceptions including SystemExit and KeyboardInterrupt.",
        "Catch a specific exception type, e.g. 'except Exception:'.",
    ),
    # ── Code quality ──────────────────────────────────────────────────────────
    (
        re.compile(r'(?i)#\s*(TODO|FIXME)\b'),
        "low", "code-quality",
        "Unresolved TODO/FIXME",
        "A TODO or FIXME comment indicates incomplete or broken code.",
        "Resolve or track the item in your issue tracker and remove the comment.",
    ),
    (
        re.compile(r'(?i)#\s*HACK\b'),
        "low", "code-quality",
        "HACK comment",
        "A HACK comment marks code written as a workaround rather than a proper solution.",
        "Refactor or replace the hack and remove the comment.",
    ),
    (
        re.compile(r'(?i)#\s*NOSONAR\b'),
        "low", "code-quality",
        "NOSONAR suppression comment",
        "NOSONAR suppresses static analysis warnings without fixing the underlying issue.",
        "Fix the underlying issue instead of suppressing the warning.",
    ),
    # ── Suspicious external URLs ──────────────────────────────────────────────
    (
        re.compile(r'https?://(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[a-zA-Z0-9._/-]+'),
        "low", "code-quality",
        "Hardcoded external URL",
        "A non-localhost HTTP/HTTPS URL is hardcoded in the source.",
        "Move URLs to configuration or environment variables.",
    ),
    # ── Insecure cryptography ─────────────────────────────────────────────────
    (
        re.compile(r'(?i)\bMD5\b|\bhashlib\.md5\b'),
        "medium", "security",
        "Use of MD5 hash",
        "MD5 is cryptographically broken and should not be used for security-sensitive purposes.",
        "Use SHA-256 (hashlib.sha256) or bcrypt/argon2 for password hashing.",
    ),
    (
        re.compile(r'(?i)\bSHA1\b|\bhashlib\.sha1\b'),
        "medium", "security",
        "Use of SHA-1 hash",
        "SHA-1 is cryptographically weak and deprecated for security-sensitive use cases.",
        "Use SHA-256 or stronger.",
    ),
    (
        re.compile(r'(?i)\b(DES|RC4|RC2)\b'),
        "high", "security",
        "Use of deprecated cipher (DES/RC4/RC2)",
        "DES, RC4, and RC2 are cryptographically broken ciphers.",
        "Use AES-256-GCM or ChaCha20-Poly1305.",
    ),
    # ── Dependency / config problems ──────────────────────────────────────────
    (
        re.compile(r'verify\s*=\s*False'),
        "high", "security",
        "SSL certificate verification disabled",
        "Disabling SSL/TLS certificate verification exposes the connection to MITM attacks.",
        "Remove verify=False and ensure a valid CA bundle is configured.",
    ),
    (
        re.compile(r'(?i)ALLOW_ALL_ORIGINS\s*=\s*True|CORS_ORIGIN_ALLOW_ALL\s*=\s*True'),
        "medium", "security",
        "CORS wildcard origin allowed",
        "Allowing all CORS origins in production can expose sensitive endpoints to cross-origin attacks.",
        "Restrict CORS origins to known trusted domains.",
    ),
    (
        re.compile(r'(?i)DEBUG\s*=\s*True'),
        "medium", "security",
        "DEBUG mode enabled",
        "Running with DEBUG=True in production exposes tracebacks and internal details to end users.",
        "Set DEBUG=False for production deployments and control it via an environment variable.",
    ),
    (
        re.compile(r'(?i)SECRET_KEY\s*=\s*["\'][^"\']{0,20}["\']'),
        "high", "security",
        "Weak or default SECRET_KEY",
        "A short or predictable SECRET_KEY is trivially brute-forced.",
        "Generate a long random key (e.g. python -c \"import secrets; print(secrets.token_hex(32))\") and store it in an environment variable.",
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
