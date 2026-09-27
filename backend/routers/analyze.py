from fastapi import APIRouter, HTTPException

from models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    CodebaseResult,
    IssuesResult,
    TestsResult,
    DeployResult,
)
from services.orchestrator import run_full_analysis
from services.codebase_analyzer import analyze_codebase
from services.issue_detector import detect_issues
from services.test_generator import generate_tests
from services.deploy_checker import check_deployment

router = APIRouter()


@router.post("", response_model=AnalyzeResponse)
async def analyze_project(request: AnalyzeRequest):
    """Run all four analysis modules against a local project path."""
    try:
        return await run_full_analysis(request.project_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


@router.post("/codebase", response_model=CodebaseResult)
async def analyze_codebase_only(request: AnalyzeRequest):
    """Run only the codebase analysis module."""
    try:
        return await analyze_codebase(request.project_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/issues", response_model=IssuesResult)
async def analyze_issues_only(request: AnalyzeRequest):
    """Run only the security and problem detection module."""
    try:
        return await detect_issues(request.project_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/tests", response_model=TestsResult)
async def analyze_tests_only(request: AnalyzeRequest):
    """Run only the test gap and generation module."""
    try:
        return await generate_tests(request.project_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/deploy", response_model=DeployResult)
async def analyze_deploy_only(request: AnalyzeRequest):
    """Run only the deployment readiness module."""
    try:
        return await check_deployment(request.project_path)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
