import axios from 'axios';
import type { AnalyzeRequest, AnalyzeResponse, CodebaseResult, IssuesResult, TestsResult, DeployResult } from '../types/analysis';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

const http = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120_000, // analysis can take a while
});

export const api = {
  health: () =>
    http.get<{ status: string }>('/health').then((r) => r.data),

  analyze: (req: AnalyzeRequest) =>
    http.post<AnalyzeResponse>('/analyze', req).then((r) => r.data),

  analyzeCodebase: (req: AnalyzeRequest) =>
    http.post<CodebaseResult>('/analyze/codebase', req).then((r) => r.data),

  analyzeIssues: (req: AnalyzeRequest) =>
    http.post<IssuesResult>('/analyze/issues', req).then((r) => r.data),

  analyzeTests: (req: AnalyzeRequest) =>
    http.post<TestsResult>('/analyze/tests', req).then((r) => r.data),

  analyzeDeploy: (req: AnalyzeRequest) =>
    http.post<DeployResult>('/analyze/deploy', req).then((r) => r.data),
};
