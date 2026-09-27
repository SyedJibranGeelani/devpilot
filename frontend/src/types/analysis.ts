// ── Shared TypeScript types mirroring backend Pydantic schemas ────────────────

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: FileNode[];
}

export interface LanguageStat {
  language: string;
  file_count: number;
  percentage: number;
}

export interface CodebaseResult {
  file_tree: FileNode;
  language_stats: LanguageStat[];
  summary: string;
  total_files: number;
  total_lines: number;
}

// ── Issues ────────────────────────────────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type IssueCategory = 'security' | 'bug' | 'code-quality' | 'performance';

export interface Issue {
  file: string;
  line?: number;
  severity: Severity;
  category: IssueCategory;
  title: string;
  description: string;
  suggestion: string;
}

export interface IssuesResult {
  issues: Issue[];
  summary: string;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

export interface UncoveredFunction {
  file: string;
  function_name: string;
  reason: string;
}

export interface GeneratedTest {
  source_file: string;
  test_code: string;
  test_framework: string;
}

export interface TestsResult {
  uncovered_functions: UncoveredFunction[];
  generated_tests: GeneratedTest[];
  summary: string;
  coverage_estimate: string;
}

// ── Deploy ────────────────────────────────────────────────────────────────────

export type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip';

export interface ChecklistItem {
  id: string;
  category: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface DeployResult {
  checklist: ChecklistItem[];
  readiness_score: number;
  summary: string;
  blockers: string[];
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

export interface AnalyzeResponse {
  project_path: string;
  codebase: CodebaseResult | null;
  issues: IssuesResult | null;
  tests: TestsResult | null;
  deploy: DeployResult | null;
  errors: Record<string, string>;
}

export interface AnalyzeRequest {
  project_path: string;
}
