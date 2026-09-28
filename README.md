# DevPilot

**DevPilot** is a developer productivity tool that analyses any software project and gives you an instant codebase overview, security and bug findings, test-gap analysis with ready-to-use test stubs, and a deployment readiness checklist — entirely through static analysis, without executing your code or sending it to an external service.

---

## Primary Workflow — ZIP Upload

The primary workflow requires no local file-system access from the browser:

1. **Zip your project** — create a `.zip` archive of your project directory.
2. **Upload** — drag and drop the ZIP onto the upload area, or click **Browse ZIP** to choose a file.
3. **Click "Analyze Project →"** — DevPilot uploads the archive, safely extracts it on the server, runs all analysis stages, and returns results.
4. **Explore the five tabs** — Overview, Issues, Tests, Deploy, AI Insights.

### Supported ZIP size

| Limit | Value |
|---|---|
| Maximum upload | 50 MB (compressed) |
| Maximum extracted | 200 MB |
| Maximum files extracted | 5 000 files |

---

## Local-Path Workflow (Developer Mode)

The original local-path mode is retained as an optional developer convenience. Click **Developer: use local path instead** below the upload area to reveal the path input, then enter an absolute path to a project directory on the same machine as the backend server.

---

## Analysis Categories

Each detected finding is reported with:

| Field | Description |
|---|---|
| **Severity** | `critical` · `high` · `medium` · `low` · `info` |
| **Category** | See table below |
| **Title** | Short description of the finding |
| **File** | Relative path inside the project |
| **Line** | Source line number (where detectable) |
| **Explanation** | What the pattern means and why it matters |
| **Recommendation** | Concrete action to fix the issue |

### Covered categories

| Category | Examples |
|---|---|
| **Security** | Hardcoded credentials/secrets, AWS keys, private key material, `eval()`/`exec()`, `os.system()`, `subprocess(shell=True)`, `pickle.load`, `yaml.load` without SafeLoader, SQL injection via f-string or `%s`, SSL cert verification disabled (`verify=False`), weak `SECRET_KEY`, `DEBUG=True`, CORS wildcard |
| **Bug** | Bare `except:`, `debugger;` statement, `pdb.set_trace()` breakpoint left in code |
| **Code Quality** | `console.log()`/`console.debug()`, `print()` debug statements, `TODO`/`FIXME`/`HACK` comments, `NOSONAR` suppressions, hardcoded external URLs |
| **Insecure cryptography** | MD5, SHA-1, DES/RC4/RC2 ciphers |
| **Config problems** | DEBUG mode enabled, CORS wildcard, weak secrets |

> **Accuracy note:** DevPilot uses regex-based static analysis, not AST or data-flow analysis. There will be false positives (e.g. a `password =` variable in a test fixture) and false negatives (issues that require semantic understanding). Results should be treated as a triage aid, not a security audit.

---

## Supported Analysis Stages

| Stage | What it does |
|---|---|
| **Codebase Overview** | File tree, total files, total lines, language breakdown by percentage, and detected technology stack (languages, frameworks, tools, package managers inferred from manifest files) |
| **Issue Detection** | Regex-based scanner covering security vulnerabilities, dangerous function usage, debug artefacts, code-quality markers, and configuration problems — with file path, line number, severity, and a concrete fix suggestion for each finding |
| **Test-Gap Detection** | Identifies source files that have no corresponding test file and lists every public function without a test; coverage estimate is based on test-file presence, not executed coverage |
| **Test Stub Generation** | Generates runnable `pytest` stubs for Python files and `Jest/Vitest` stubs for JavaScript/TypeScript files, covering every detected untested function |
| **Deployment Readiness** | Ten filesystem-presence checks across Configuration, Containerisation, CI/CD, Documentation, Dependencies, Version Control, and Testing — produces a 0–100 readiness score and a list of blockers |
| **AI Insights** | Aggregates findings from all four stages into prioritised recommendations — no external API call required |

---

## Security Limitations

- Analysis is **static only** — no code is executed.
- **Path traversal** in uploaded ZIPs is blocked: every member path is resolved inside the extraction directory before extraction.
- **Ignored directories** (`node_modules`, `.git`, `__pycache__`, `dist`, `build`, `.venv`, etc.) are skipped during extraction and analysis to avoid noise and reduce surface area.
- The extracted directory is deleted in a background task after the response is sent.
- **Upload size** is capped at 50 MB compressed / 200 MB extracted to prevent resource exhaustion.
- ZIP archives containing more than 5 000 files (after filtering) are rejected.
- The backend does not persist uploaded content between requests.

---

## Test Generation

Test stubs are generated for every source file that has no corresponding test file. The stub generator:

- Detects Python functions with `def`/`async def` and skips private (`_`-prefixed) functions
- Detects JavaScript/TypeScript function declarations, arrow functions, and method shorthands
- Generates a `pytest` stub for `.py` files and a `vitest` stub for `.js`/`.ts`/`.jsx`/`.tsx` files
- Each stub includes a `TODO` comment indicating where to add real assertions

---

## Deployment Readiness

The deploy checker inspects the project root for the presence of:

| Check | Category |
|---|---|
| `.env` or `.env.example` | Configuration |
| `Dockerfile` | Containerisation |
| `docker-compose.yml` | Containerisation |
| `.github/workflows/` | CI/CD |
| `.gitlab-ci.yml` | CI/CD |
| `README.md` / `README.rst` | Documentation |
| `requirements.txt` | Dependencies |
| `package.json` | Dependencies |
| `.gitignore` | Version Control |
| `tests/` / `test/` / `__tests__/` | Testing |

Blockers are items in the **Configuration** or **CI/CD** categories that are not present.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router v6, Axios |
| Backend | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 |
| LLM support | OpenAI SDK (`openai`), IBM watsonx.ai SDK (`ibm-watsonx-ai`) |
| Styling | CSS Modules |
| Testing | Vitest (frontend) |

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
│   │   └── analyze.py       # /analyze endpoints (POST /analyze, POST /analyze/upload)
│   └── services/
│       ├── orchestrator.py       # Runs all four stages concurrently
│       ├── zip_extractor.py      # Secure ZIP extraction with path-traversal protection
│       ├── codebase_analyzer.py  # File tree, language stats, stack summary
│       ├── stack_detector.py     # Manifest-based stack inference
│       ├── issue_detector.py     # Regex issue scanner (30+ rules)
│       ├── test_generator.py     # Test-gap detection + stub generation
│       ├── deploy_checker.py     # Filesystem deployment checklist
│       └── file_reader.py        # Shared project-walk utilities
└── frontend/
    └── src/
        ├── api/client.ts         # Axios API client (analyzeZip + analyze)
        ├── types/analysis.ts     # TypeScript mirrors of backend schemas
        ├── pages/
        │   ├── HomePage.tsx      # ZIP upload UI with drag-and-drop
        │   └── ResultsPage.tsx   # Tabbed results view
        ├── components/
        │   ├── ZipUpload.tsx     # Drag-and-drop ZIP upload component
        │   ├── OverviewPanel.tsx # Files, lines, languages, detected stack
        │   ├── IssueList.tsx     # Issue list with severity/category filters
        │   ├── TestGapList.tsx   # Test gaps and generated stubs
        │   ├── DeployChecklist.tsx
        │   └── RecommendationsPanel.tsx
        └── mock/data.ts          # Mock dataset for VITE_USE_MOCK mode
```

---

## How to Run Locally

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

## How to Test ZIP Upload

### Via the UI

1. Start both the backend and frontend as described above.
2. Open `http://localhost:5173`.
3. Zip any project directory: `zip -r my-project.zip ./my-project/` (or use your OS zip tool).
4. Drag and drop the ZIP onto the upload area, or click **Browse ZIP**.
5. Click **Analyze Project →**.
6. Results appear across the five tabs.

### Via curl

```bash
curl -X POST http://localhost:8000/analyze/upload \
  -F "file=@/path/to/my-project.zip" \
  | python3 -m json.tool
```

### Via the Swagger UI

Navigate to `http://localhost:8000/docs`, open **POST /analyze/upload**, click **Try it out**, upload a ZIP, and execute.

### Error cases

| Scenario | Expected response |
|---|---|
| Non-ZIP file uploaded | `400 Only ZIP files are accepted.` |
| Empty file | `400 Uploaded file is empty.` |
| File > 50 MB | `413 Upload exceeds the 50 MB size limit.` |
| ZIP with path traversal | `400 Path traversal detected in ZIP member: …` |
| ZIP with only ignored dirs | `400 ZIP archive contains no extractable source files …` |

---

## Environment Configuration

### Backend

Copy `backend/.env.example` to `backend/.env` and fill in the values you need.

```env
# LLM provider: "openai" or "watsonx"
LLM_PROVIDER=openai

# OpenAI — required if LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# IBM watsonx.ai — required if LLM_PROVIDER=watsonx
WATSONX_API_KEY=
WATSONX_PROJECT_ID=
WATSONX_URL=https://us-south.ml.cloud.ibm.com
WATSONX_MODEL=ibm/granite-13b-chat-v2

# Analysis limits
MAX_FILE_SIZE_KB=500
MAX_FILES_PER_ANALYSIS=100
```

> **Note:** LLM credentials are only required if you plan to invoke the `llm/client.py` integration. The full analysis pipeline runs entirely without an API key.

### Frontend

The frontend reads a single environment variable to locate the backend API.

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL (no trailing slash) | `http://localhost:8000` |

#### Local development

No `.env` file is needed for local development. The app automatically falls back to `http://localhost:8000`.

#### Production deployment

1. Copy `frontend/.env.example` to `frontend/.env`:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
2. The file already contains the deployed backend URL — no edits required:
   ```env
   VITE_API_URL=https://devpilot-1oai.onrender.com
   ```
3. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
4. Deploy the `frontend/dist/` directory to your static hosting provider (Vercel, Netlify, GitHub Pages, etc.).

> **Important:** Do **not** commit `frontend/.env` to version control. It is listed in `.gitignore`. Only `frontend/.env.example` (which contains no secrets) should be committed.

---

## Current Limitations

- **Heuristic test coverage** — The coverage estimate is based on test-*file* presence, not executed coverage. It is clearly labelled as an estimate.
- **Filesystem-only deployment checks** — The deployment checklist checks whether files *exist*; it does not parse their contents or validate correctness.
- **Regex-based issue detection** — Issues are found by pattern matching, not AST analysis or semantic understanding. Expect false positives and false negatives.
- **No LLM call in the pipeline** — The `llm/client.py` abstraction is wired and available but not invoked in the current analysis pipeline. The AI Insights tab derives its recommendations deterministically from the real analysis output.
- **Root-level stack detection** — The stack detector and deployment checker inspect the project root; deep monorepo structures may not be fully detected.
- **100-file cap** — By default, `MAX_FILES_PER_ANALYSIS=100` limits analysis to the first 100 files found (configurable via `.env`).
- **ZIP extraction is synchronous** — Large ZIPs with many files may make the server unresponsive until extraction completes. For production use, move extraction to a background worker.

---

## IBM Bob 2.0 Hackathon

DevPilot was built end-to-end using **IBM Bob** as the primary development assistant throughout the entire project lifecycle — architecture, implementation, debugging, validation, and iterative feature development.
