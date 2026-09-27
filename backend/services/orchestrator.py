"""
Orchestrator — runs all four analysis modules and aggregates results.
"""

import asyncio
from models.schemas import AnalyzeResponse
from services.codebase_analyzer import analyze_codebase
from services.issue_detector import detect_issues
from services.test_generator import generate_tests
from services.deploy_checker import check_deployment


async def run_full_analysis(project_path: str) -> AnalyzeResponse:
    """
    Run all four analysis modules concurrently and aggregate into one response.
    Each module failure is caught individually so the others still return.
    """
    results = await asyncio.gather(
        analyze_codebase(project_path),
        detect_issues(project_path),
        generate_tests(project_path),
        check_deployment(project_path),
        return_exceptions=True,
    )

    codebase_result, issues_result, tests_result, deploy_result = results
    errors: dict = {}

    if isinstance(codebase_result, Exception):
        errors["codebase"] = str(codebase_result)
        codebase_result = None

    if isinstance(issues_result, Exception):
        errors["issues"] = str(issues_result)
        issues_result = None

    if isinstance(tests_result, Exception):
        errors["tests"] = str(tests_result)
        tests_result = None

    if isinstance(deploy_result, Exception):
        errors["deploy"] = str(deploy_result)
        deploy_result = None

    return AnalyzeResponse(
        project_path=project_path,
        codebase=codebase_result,
        issues=issues_result,
        tests=tests_result,
        deploy=deploy_result,
        errors=errors,
    )
