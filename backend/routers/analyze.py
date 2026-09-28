from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks

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
from services.zip_extractor import extract_zip, cleanup_extract_dir, ZipExtractionError

router = APIRouter()

# Maximum upload size: 50 MB (bytes)
MAX_UPLOAD_BYTES = 50 * 1024 * 1024


@router.post("/upload", response_model=AnalyzeResponse)
async def analyze_zip_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    Accept a ZIP file upload, safely extract it to a temporary directory,
    run all four analysis modules, then clean up the temporary files.
    """
    # ── Validate content type ─────────────────────────────────────────────────
    if file.content_type not in (
        "application/zip",
        "application/x-zip-compressed",
        "application/octet-stream",
        "application/x-zip",
    ):
        # Also accept if the filename ends with .zip (some browsers send octet-stream)
        if not (file.filename or "").lower().endswith(".zip"):
            raise HTTPException(
                status_code=400,
                detail="Only ZIP files are accepted. Please upload a .zip archive.",
            )

    # ── Read upload ───────────────────────────────────────────────────────────
    zip_bytes = await file.read()
    if len(zip_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(zip_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Upload exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB size limit.",
        )

    # ── Extract ───────────────────────────────────────────────────────────────
    try:
        project_path = extract_zip(zip_bytes)
    except ZipExtractionError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"ZIP extraction failed: {exc}")

    # Schedule cleanup after the response is sent
    background_tasks.add_task(cleanup_extract_dir, project_path)

    # ── Run analysis ──────────────────────────────────────────────────────────
    try:
        result = await run_full_analysis(project_path)
        # Replace internal temp path with the original ZIP filename for display
        result.project_path = file.filename or "uploaded-project.zip"
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


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
