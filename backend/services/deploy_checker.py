"""
Deployment Readiness Checker — stub implementation.

Checks for env files, Docker config, CI config, and dependency manifests.
LLM-powered summary is wired in the next task.
"""

from pathlib import Path
from models.schemas import DeployResult, ChecklistItem


CHECKLIST_DEFINITIONS = [
    ("env-file",         "Configuration", ".env or .env.example present",      [".env", ".env.example"]),
    ("docker",           "Containerisation", "Dockerfile present",              ["Dockerfile", "dockerfile"]),
    ("docker-compose",   "Containerisation", "docker-compose.yml present",      ["docker-compose.yml", "docker-compose.yaml"]),
    ("ci-github",        "CI/CD",          "GitHub Actions workflow present",   [".github/workflows"]),
    ("ci-gitlab",        "CI/CD",          "GitLab CI config present",          [".gitlab-ci.yml"]),
    ("readme",           "Documentation",  "README present",                    ["README.md", "README.rst", "README.txt"]),
    ("requirements",     "Dependencies",   "Python requirements.txt present",   ["requirements.txt"]),
    ("package-json",     "Dependencies",   "Node package.json present",         ["package.json"]),
    ("gitignore",        "Version Control",".gitignore present",                [".gitignore"]),
    ("tests-dir",        "Testing",        "Tests directory present",           ["tests", "test", "__tests__", "spec"]),
]


async def check_deployment(project_path: str) -> DeployResult:
    root = Path(project_path).resolve()
    if not root.exists():
        raise ValueError(f"Project path does not exist: {project_path}")

    checklist: list[ChecklistItem] = []
    pass_count = 0

    for item_id, category, label, targets in CHECKLIST_DEFINITIONS:
        found = any(
            (root / t).exists()
            for t in targets
        )
        status = "pass" if found else "fail"
        if found:
            detail = f"Found: {next(t for t in targets if (root / t).exists())}"
        else:
            detail = f"Not found: {', '.join(targets)}"
        if found:
            pass_count += 1
        checklist.append(ChecklistItem(
            id=item_id,
            category=category,
            label=label,
            status=status,
            detail=detail,
        ))

    score = round(pass_count / len(CHECKLIST_DEFINITIONS) * 100)
    blockers = [item.label for item in checklist if item.status == "fail" and item.category in ("CI/CD", "Configuration")]

    return DeployResult(
        checklist=checklist,
        readiness_score=score,
        summary=f"Deployment readiness score: {score}/100. {pass_count} of {len(CHECKLIST_DEFINITIONS)} checks passed.",
        blockers=blockers,
    )
