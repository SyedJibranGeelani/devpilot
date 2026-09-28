from __future__ import annotations

from typing import Any
from pydantic import BaseModel


# ── Request ──────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    project_path: str


# ── Codebase Analysis ─────────────────────────────────────────────────────────

class FileNode(BaseModel):
    name: str
    path: str
    type: str          # "file" | "directory"
    children: list[FileNode] = []


class LanguageStat(BaseModel):
    language: str
    file_count: int
    percentage: float


class StackInfo(BaseModel):
    languages: list[str] = []
    frameworks: list[str] = []
    tools: list[str] = []
    package_managers: list[str] = []


class CodebaseResult(BaseModel):
    file_tree: FileNode
    language_stats: list[LanguageStat]
    summary: str
    total_files: int
    total_lines: int
    stack: StackInfo | None = None


# ── Issue Detection ───────────────────────────────────────────────────────────

class Issue(BaseModel):
    file: str
    line: int | None = None
    severity: str      # "critical" | "high" | "medium" | "low" | "info"
    category: str      # "security" | "bug" | "code-quality" | "performance"
    title: str
    description: str
    suggestion: str


class IssuesResult(BaseModel):
    issues: list[Issue]
    summary: str
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int


# ── Test Generation ────────────────────────────────────────────────────────────

class UncoveredFunction(BaseModel):
    file: str
    function_name: str
    reason: str


class GeneratedTest(BaseModel):
    source_file: str
    test_code: str
    test_framework: str


class TestsResult(BaseModel):
    uncovered_functions: list[UncoveredFunction]
    generated_tests: list[GeneratedTest]
    summary: str
    coverage_estimate: str


# ── Deployment Readiness ───────────────────────────────────────────────────────

class ChecklistItem(BaseModel):
    id: str
    category: str
    label: str
    status: str        # "pass" | "fail" | "warn" | "skip"
    detail: str


class DeployResult(BaseModel):
    checklist: list[ChecklistItem]
    readiness_score: int   # 0–100
    summary: str
    blockers: list[str]


# ── Aggregate Response ─────────────────────────────────────────────────────────

class AnalyzeResponse(BaseModel):
    project_path: str
    codebase: CodebaseResult | None = None
    issues: IssuesResult | None = None
    tests: TestsResult | None = None
    deploy: DeployResult | None = None
    errors: dict[str, Any] = {}
