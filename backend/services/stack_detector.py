"""
Stack Detector — infers the technology stack from well-known manifest files.

Reads files such as package.json, requirements.txt, pyproject.toml,
Dockerfile, docker-compose.yml, and others to determine:
  - primary languages / runtimes
  - key frameworks and libraries
  - infrastructure tooling (Docker, CI, etc.)

Returns a StackInfo dataclass that codebase_analyzer can embed in its summary.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass
class StackInfo:
    """Detected technologies for a project."""
    languages: list[str] = field(default_factory=list)
    frameworks: list[str] = field(default_factory=list)
    tools: list[str] = field(default_factory=list)
    package_managers: list[str] = field(default_factory=list)

    def is_empty(self) -> bool:
        return not (self.languages or self.frameworks or self.tools or self.package_managers)

    def summary_line(self) -> str:
        """Build a short human-readable sentence describing the stack."""
        parts: list[str] = []
        if self.languages:
            parts.append("Languages: " + ", ".join(self.languages))
        if self.frameworks:
            parts.append("Frameworks/Libraries: " + ", ".join(self.frameworks))
        if self.tools:
            parts.append("Tools: " + ", ".join(self.tools))
        if self.package_managers:
            parts.append("Package managers: " + ", ".join(self.package_managers))
        return " | ".join(parts) if parts else "Stack could not be determined from manifest files."


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_stack(project_path: str) -> StackInfo:
    """
    Walk the top-level directory of *project_path* and detect the tech stack.
    Only the root and one level of subdirectories are inspected to stay fast.
    """
    root = Path(project_path).resolve()
    info = StackInfo()

    _check_package_json(root, info)
    _check_python_manifests(root, info)
    _check_docker(root, info)
    _check_ci(root, info)
    _check_other_manifests(root, info)

    # Deduplicate while preserving insertion order
    info.languages = _dedup(info.languages)
    info.frameworks = _dedup(info.frameworks)
    info.tools = _dedup(info.tools)
    info.package_managers = _dedup(info.package_managers)

    return info


# ---------------------------------------------------------------------------
# Manifest parsers
# ---------------------------------------------------------------------------

def _check_package_json(root: Path, info: StackInfo) -> None:
    """Parse package.json for Node/JS/TS frameworks and tooling."""
    pkg_path = root / "package.json"
    if not pkg_path.is_file():
        return

    info.package_managers.append("npm")

    try:
        data = json.loads(pkg_path.read_text(encoding="utf-8", errors="replace"))
    except (json.JSONDecodeError, OSError):
        info.languages.append("JavaScript/TypeScript")
        return

    all_deps: set[str] = set()
    for section in ("dependencies", "devDependencies", "peerDependencies"):
        all_deps.update(data.get(section, {}).keys())

    # Detect TypeScript
    if "typescript" in all_deps or _has_ts_files(root):
        info.languages.append("TypeScript")
    else:
        info.languages.append("JavaScript")

    # Runtime / meta-framework
    _match_deps(all_deps, info.frameworks, {
        "react": "React",
        "react-dom": "React",
        "next": "Next.js",
        "nuxt": "Nuxt.js",
        "vue": "Vue",
        "@angular/core": "Angular",
        "svelte": "Svelte",
        "@sveltejs/kit": "SvelteKit",
        "solid-js": "SolidJS",
        "remix": "Remix",
        "gatsby": "Gatsby",
        "express": "Express",
        "fastify": "Fastify",
        "koa": "Koa",
        "hapi": "Hapi",
        "nestjs": "NestJS",
        "@nestjs/core": "NestJS",
        "graphql": "GraphQL",
        "@apollo/server": "Apollo Server",
        "prisma": "Prisma",
        "@prisma/client": "Prisma",
        "typeorm": "TypeORM",
        "mongoose": "Mongoose",
        "sequelize": "Sequelize",
        "socket.io": "Socket.IO",
        "trpc": "tRPC",
        "@trpc/server": "tRPC",
        "redux": "Redux",
        "@reduxjs/toolkit": "Redux Toolkit",
        "zustand": "Zustand",
        "jotai": "Jotai",
        "vite": "Vite",
        "webpack": "Webpack",
        "rollup": "Rollup",
        "esbuild": "esbuild",
        "vitest": "Vitest",
        "jest": "Jest",
        "@testing-library/react": "Testing Library",
        "playwright": "Playwright",
        "cypress": "Cypress",
        "tailwindcss": "Tailwind CSS",
        "axios": "Axios",
        "zod": "Zod",
    })

    # Detect package manager from lock file
    if (root / "yarn.lock").exists():
        info.package_managers.append("Yarn")
    elif (root / "pnpm-lock.yaml").exists():
        info.package_managers.append("pnpm")
    elif (root / "bun.lockb").exists():
        info.package_managers.append("Bun")


def _check_python_manifests(root: Path, info: StackInfo) -> None:
    """Detect Python stack from requirements.txt, pyproject.toml, setup.py, Pipfile."""
    has_python = False

    req_path = root / "requirements.txt"
    if req_path.is_file():
        has_python = True
        info.package_managers.append("pip")
        _parse_requirements(req_path.read_text(encoding="utf-8", errors="replace"), info)

    pyproject = root / "pyproject.toml"
    if pyproject.is_file():
        has_python = True
        text = pyproject.read_text(encoding="utf-8", errors="replace")
        _parse_pyproject(text, info)
        if "poetry" in text:
            info.package_managers.append("Poetry")
        if "hatch" in text:
            info.package_managers.append("Hatch")

    if (root / "Pipfile").is_file():
        has_python = True
        info.package_managers.append("Pipenv")

    if (root / "setup.py").is_file() or (root / "setup.cfg").is_file():
        has_python = True

    if has_python:
        info.languages.append("Python")


def _parse_requirements(text: str, info: StackInfo) -> None:
    """Extract known framework names from a requirements.txt body."""
    packages = {
        line.split("==")[0].split(">=")[0].split("<=")[0].split("~=")[0].strip().lower()
        for line in text.splitlines()
        if line.strip() and not line.startswith("#")
    }
    _match_deps(packages, info.frameworks, {
        "fastapi": "FastAPI",
        "flask": "Flask",
        "django": "Django",
        "tornado": "Tornado",
        "starlette": "Starlette",
        "aiohttp": "aiohttp",
        "sanic": "Sanic",
        "falcon": "Falcon",
        "litestar": "Litestar",
        "sqlalchemy": "SQLAlchemy",
        "alembic": "Alembic",
        "pydantic": "Pydantic",
        "celery": "Celery",
        "dramatiq": "Dramatiq",
        "rq": "RQ",
        "pytest": "pytest",
        "numpy": "NumPy",
        "pandas": "pandas",
        "scikit-learn": "scikit-learn",
        "tensorflow": "TensorFlow",
        "torch": "PyTorch",
        "transformers": "Hugging Face Transformers",
        "openai": "OpenAI SDK",
        "langchain": "LangChain",
        "ibm-watsonx-ai": "watsonx.ai SDK",
        "boto3": "AWS Boto3",
        "google-cloud": "Google Cloud SDK",
        "azure": "Azure SDK",
        "redis": "Redis",
        "pymongo": "PyMongo",
        "motor": "Motor (async MongoDB)",
        "psycopg2": "psycopg2",
        "asyncpg": "asyncpg",
        "httpx": "HTTPX",
        "requests": "Requests",
        "uvicorn": "Uvicorn",
        "gunicorn": "Gunicorn",
    })


def _parse_pyproject(text: str, info: StackInfo) -> None:
    """Very lightweight TOML-ish scan for known packages in pyproject.toml."""
    # Pull out bare package names from dependency strings (no full TOML parse needed)
    names = {
        re.sub(r'[>=<!^~\[\s"].*', "", tok).lower()
        for tok in re.findall(r'"([^"]+)"', text)
    }
    _parse_requirements("\n".join(names), info)


def _check_docker(root: Path, info: StackInfo) -> None:
    """Detect Docker / container tooling."""
    if (root / "Dockerfile").is_file() or (root / "dockerfile").is_file():
        info.tools.append("Docker")
    if (root / "docker-compose.yml").is_file() or (root / "docker-compose.yaml").is_file():
        info.tools.append("Docker Compose")
    if (root / ".dockerignore").is_file():
        info.tools.append("Docker")  # will be deduped


def _check_ci(root: Path, info: StackInfo) -> None:
    """Detect CI/CD configuration."""
    if (root / ".github" / "workflows").is_dir():
        info.tools.append("GitHub Actions")
    if (root / ".gitlab-ci.yml").is_file():
        info.tools.append("GitLab CI")
    if (root / "Jenkinsfile").is_file():
        info.tools.append("Jenkins")
    if (root / ".circleci" / "config.yml").is_file():
        info.tools.append("CircleCI")
    if (root / ".travis.yml").is_file():
        info.tools.append("Travis CI")
    if (root / "azure-pipelines.yml").is_file():
        info.tools.append("Azure Pipelines")


def _check_other_manifests(root: Path, info: StackInfo) -> None:
    """Catch remaining languages and tools from other config files."""
    if (root / "go.mod").is_file():
        info.languages.append("Go")
        info.package_managers.append("Go modules")
    if (root / "Cargo.toml").is_file():
        info.languages.append("Rust")
        info.package_managers.append("Cargo")
    if (root / "pom.xml").is_file() or (root / "build.gradle").is_file() or (root / "build.gradle.kts").is_file():
        info.languages.append("Java/Kotlin")
        if (root / "pom.xml").is_file():
            info.package_managers.append("Maven")
        else:
            info.package_managers.append("Gradle")
    if (root / "Gemfile").is_file():
        info.languages.append("Ruby")
        info.package_managers.append("Bundler")
    if (root / "composer.json").is_file():
        info.languages.append("PHP")
        info.package_managers.append("Composer")
    if (root / "pubspec.yaml").is_file():
        info.languages.append("Dart/Flutter")
        info.package_managers.append("pub")
    if (root / "mix.exs").is_file():
        info.languages.append("Elixir")
        info.package_managers.append("Mix")
    if (root / "terraform").is_dir() or list(root.glob("*.tf")):
        info.tools.append("Terraform")
    if (root / "k8s").is_dir() or (root / "kubernetes").is_dir():
        info.tools.append("Kubernetes")
    if list(root.glob("*.tf")):
        info.tools.append("Terraform")  # will be deduped


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _has_ts_files(root: Path) -> bool:
    """Quick check: any .ts or .tsx file in the project root or src/."""
    for pattern in ("*.ts", "*.tsx", "src/*.ts", "src/*.tsx"):
        if list(root.glob(pattern)):
            return True
    return False


def _match_deps(
    installed: set[str],
    target: list[str],
    mapping: dict[str, str],
) -> None:
    """Append the human-readable name for each matched package."""
    seen: set[str] = set(target)
    for pkg, label in mapping.items():
        if pkg in installed and label not in seen:
            target.append(label)
            seen.add(label)


def _dedup(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result
