# DevPilot

**DevPilot** is a local developer productivity tool that points at any codebase on your machine and instantly gives you a codebase overview, security and bug issues, test-gap analysis with ready-to-use test stubs, and a deployment readiness checklist — all without sending your code anywhere.

---

## Core Workflow

| Step | What happens |
|---|---|
| **Analyze** | Enter an absolute path to a local project. DevPilot walks the directory tree and gathers file, language, and stack information. |
| **Find Problems** | A regex-based scanner checks every source file for security vulnerabilities, bad patterns, and code-quality issues, reporting each with file path, line number, and a concrete fix suggestion. |
| **Generate Tests** | DevPilot identifies source files that have no corresponding test file, lists every untested function, and generates runnable pytest / Vitest test stubs for them. |
| **Check Deployment Readiness** | A filesystem checklist verifies the presence of key deployment artefacts (Docker, CI/CD config, `.env` template, `README`, dependency manifests, etc.) and produces a 0–100 readiness score. |
| **AI Insights** | The **✨ AI Insights** tab aggregates findings from all four analysis stages into prioritised recommendations — critical security findings, test coverage gaps, deployment blockers, and a codebase summary — derived deterministically from the real analysis results. |

---

## Current Capabilities

- **Codebase analysis** — file count, total lines, language statistics, and a browsable file tree
- **Stack detection** — infers languages, frameworks, and tools from `package.json`, `requirements.txt`, `pyproject.toml`, `Dockerfile`, CI config files, and more
- **Issue detection** — nine regex rules covering hardcoded credentials, `eval()`, bare `except:`, `os.system()`, `subprocess(shell=True)`, `console.log`, `debugger`, TODO/FIXME markers, and hardcoded external URLs
- **Test-gap detection** — identifies source files that have no matching test file and lists every public function without a test
- **Test stub generation** — produces `pytest` skeletons for Python files and `Jest/Vitest` skeletons for JavaScript/TypeScript files
- **Deployment readiness checks** — ten filesystem-presence checks across Configuration, Containerisation, CI/CD, Documentation, Dependencies, Version Control, and Testing categories
- **AI Insights panel** — prioritised, structured findings panel driven by real analysis output (no external API call required)
- **LLM abstraction layer** — an `llm/client.py` module supports both OpenAI and IBM watsonx.ai; credentials are read from `.env` at runtime (not invoked in the current pipeline)

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router v6, Axios |
| Backend | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 |
| LLM support | OpenAI SDK (`openai`), IBM watsonx.ai SDK (`ibm-watsonx-ai`) |
| Styling | CSS Modules |
| Testing | Vitest (frontend), Python stdlib (backend validation) |

---

## Project Structure

```
devpilot/
├── backend/
│   ├── main.py              # FastAPI app, CORS, router mounting
│   ├── config.py            # Pydantic settings (reads .env)
│   ├── requirements.txt
│   ├── .env.example
│   ├── llm/
│   │   └── client.py        # OpenAI / watsonx.ai abstraction
│   ├── models/
│   │   └── schemas.py       # Pydantic request/response models
│   ├── routers/
│   │   └── analyze.py       # /analyze endpoints
│   └── services/
│       ├── orchestrator.py       # Runs all four stages concurrently
│       ├── codebase_analyzer.py  # File tree, language stats, stack summary
│       ├── stack_detector.py     # Manifest-based stack inference
│       ├── issue_detector.py     # Regex issue scanner
│       ├── test_generator.py     # Test-gap detection + stub generation
│       ├── deploy_checker.py     # Filesystem deployment checklist
│       └── file_reader.py        # Shared project-walk utilities
└── frontend/
    └── src/
        ├── api/client.ts         # Axios API client
        ├── types/analysis.ts     # TypeScript mirrors of backend schemas
        ├── pages/
        │   ├── HomePage.tsx      # Project path input
        │   └── ResultsPage.tsx   # Tabbed results view
        ├── components/           # OverviewPanel, IssueList, TestGapList,
        │                         # DeployChecklist, RecommendationsPanel, …
        └── mock/data.ts          # Mock dataset for VITE_USE_MOCK mode
```

---

## How It Works

When you submit a project path, the frontend `POST /analyze` to the backend. The orchestrator runs all four analysis services **concurrently** using `asyncio.gather`:

```
project path
  └─► orchestrator.run_full_analysis()
        ├─► codebase_analyzer   → file tree, language stats, stack
        ├─► issue_detector      → regex-matched issues with file/line/severity
        ├─► test_generator      → uncovered functions + test stubs
        └─► deploy_checker      → checklist items + readiness score
              ↓
        AnalyzeResponse (single JSON object)
              ↓
        Frontend renders across 5 tabs
```

Each stage is isolated: if one raises an exception, the orchestrator catches it and continues, returning partial results with an `errors` map.

---

## Running Locally

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** and **npm**

### Backend

```bash
cd devpilot/backend

# Create and activate a virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and edit environment config (optional — required only for LLM features)
cp .env.example .env

# Start the API server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### Frontend

```bash
cd devpilot/frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

The Vite dev server proxies `/analyze` and `/health` requests to `http://localhost:8000` automatically — no additional config required.

---

## Environment Configuration

Copy `backend/.env.example` to `backend/.env` and fill in the values you need.

```env
# LLM provider: "openai" or "watsonx"
LLM_PROVIDER=openai

# OpenAI — required if LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...        # <-- you must provide this
OPENAI_MODEL=gpt-4o

# IBM watsonx.ai — required if LLM_PROVIDER=watsonx
WATSONX_API_KEY=             # <-- you must provide this
WATSONX_PROJECT_ID=          # <-- you must provide this
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL=ibm/granite-13b-chat-v2

# Analysis limits
MAX_FILE_SIZE_KB=500
MAX_FILES_PER_ANALYSIS=100
```

> **Note:** The LLM credentials are only required if you plan to use the `llm/client.py` integration. The core analysis pipeline (issue detection, test-gap detection, deployment checks) runs entirely without an API key.

---

## IBM Bob 2.0 Hackathon

DevPilot was built end-to-end using **IBM Bob** as the primary development assistant throughout the entire project lifecycle:

- **Architecture & planning** — Bob was used to design the multi-stage analysis pipeline, define the Pydantic schema contract between backend and frontend, and plan each numbered phase before any code was written
- **Implementation** — Bob wrote all backend services (`issue_detector`, `test_generator`, `deploy_checker`, `stack_detector`, `codebase_analyzer`) and the LLM abstraction layer from scratch in single focused sessions, following an explicit no-surprise engineering discipline
- **Debugging & validation** — After each phase, Bob created isolated temporary test projects, ran the service under test against them, verified every output field against the schema, and cleaned up — catching the `parseFloat("~33%")` coverage-estimate bug and the `import os` dead import before they shipped
- **End-to-end integration** — Bob ran a full 51-assertion integration test across all five pipeline stages (Phase 8) to confirm the orchestrator, schemas, and individual services composed correctly with no regressions
- **Demo readiness review** — Bob performed a structured hackathon-readiness audit identifying the silent mock fallback, missing README, and coverage parsing bug as the three pre-demo blockers, then fixed each one in sequence
- **Iterative development** — Each phase was planned, implemented, validated, and confirmed complete before the next was started, giving a clear audit trail of what was built when and why

---

## Current Limitations

- **Heuristic test coverage** — The coverage estimate is based on test-*file* presence (does a `test_*.py` or `*.spec.ts` exist for this module?), not executed coverage. It is clearly labelled as an estimate.
- **Filesystem-only deployment checks** — The deployment checklist checks whether files *exist* at the project root; it does not parse their contents or validate their correctness.
- **Regex-based issue detection** — Issues are found by pattern matching, not AST analysis or semantic understanding. There will be false positives (e.g. a `password =` variable in a test file) and false negatives (issues that require data-flow analysis).
- **No executed LLM call** — The `llm/client.py` abstraction is wired and tested but not currently invoked in the analysis pipeline. The AI Insights tab derives its recommendations deterministically from the real analysis output.
- **Root-level scan** — The deployment checker and stack detector inspect only the project root and immediate children. Deep monorepo structures may not be fully detected.
- **100-file cap** — By default, `MAX_FILES_PER_ANALYSIS=100` limits analysis to the first 100 files found (configurable via `.env`).

---

## Demo Flow

1. **Start the backend** — `uvicorn main:app --reload` in `devpilot/backend`
2. **Start the frontend** — `npm run dev` in `devpilot/frontend`
3. **Open** `http://localhost:5173`
4. **Enter a local project path** — point it at any real codebase (e.g. the DevPilot repo itself, or any Python/JavaScript project on your machine)
5. **Click "Analyze Project →"** and wait for analysis to complete (~1–3 seconds for small projects)
6. **Overview tab** — explore the file tree, language breakdown, and stack summary
7. **Issues tab** — filter by severity or category; expand any issue to see its description and fix suggestion
8. **Tests tab** — browse uncovered functions and review the generated test stubs for Python and JavaScript files
9. **Deploy tab** — review the readiness checklist and score; note which categories are blocking deployment
10. **AI Insights tab** — review the aggregated, prioritised findings across all four analysis dimensions
