import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { AnalyzeResponse } from '../types/analysis';
import { MOCK_DATA } from '../mock/data';
import TabNav from '../components/TabNav';
import AnalysisSummary from '../components/AnalysisSummary';
import IssueList from '../components/IssueList';
import TestGapList from '../components/TestGapList';
import DeployChecklist from '../components/DeployChecklist';
import OverviewPanel from '../components/OverviewPanel';
import RecommendationsPanel from '../components/RecommendationsPanel';
import styles from './ResultsPage.module.css';

type Tab = 'overview' | 'issues' | 'tests' | 'deploy' | 'ai';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: '🔍 Overview'    },
  { id: 'issues',   label: '🛡️ Issues'      },
  { id: 'tests',    label: '🧪 Tests'        },
  { id: 'deploy',   label: '🚀 Deploy'       },
  { id: 'ai',       label: '✨ AI Insights'  },
];

// Set to true to use mock data without a running backend
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

interface LocationState {
  projectPath?: string;
  zipFile?: File;
  fileName?: string;
}

type AnalysisPhase = 'uploading' | 'analyzing' | 'done';

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as LocationState;
  const { projectPath, zipFile, fileName } = state;

  const displayName = fileName ?? projectPath ?? '';

  const [tab, setTab] = useState<Tab>('overview');
  const [phase, setPhase] = useState<AnalysisPhase>('uploading');
  const [uploadPct, setUploadPct] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  useEffect(() => {
    if (!projectPath && !zipFile) {
      navigate('/');
      return;
    }

    if (USE_MOCK) {
      setLoading(true);
      const t = setTimeout(() => {
        setData({ ...MOCK_DATA, project_path: displayName });
        setLoading(false);
        setPhase('done');
      }, 1200);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    const doAnalysis = async () => {
      try {
        let res: AnalyzeResponse;
        if (zipFile) {
          setPhase('uploading');
          res = await api.analyzeZip(zipFile, (pct) => {
            if (!cancelled) {
              setUploadPct(pct);
              if (pct >= 100) setPhase('analyzing');
            }
          });
        } else {
          setPhase('analyzing');
          res = await api.analyze({ project_path: projectPath! });
        }
        if (!cancelled) {
          setData(res);
          setPhase('done');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
          setError(
            `Analysis failed: ${
              axiosErr?.response?.data?.detail ??
              axiosErr?.message ??
              'Could not reach the backend. Make sure the DevPilot server is running on http://localhost:8000.'
            }`,
          );
          setPhase('done');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doAnalysis();
    return () => { cancelled = true; };
  }, [projectPath, zipFile, navigate, displayName]);

  const phaseLabel =
    phase === 'uploading'
      ? `Uploading… ${uploadPct < 100 ? `${uploadPct}%` : ''}`
      : 'Analyzing project…';

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate('/')}>
          ← New Analysis
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            Dev<span className={styles.accent}>Pilot</span>
          </h1>
          <p className={styles.path}>{displayName}</p>
        </div>
        {data && (
          <span className={styles.mockBadge}>
            {USE_MOCK ? 'Mock Data' : 'Live Analysis'}
          </span>
        )}
      </header>

      {loading && (
        <div className={styles.center}>
          <div className={styles.spinner} />
          <p>{phaseLabel}</p>
          {phase === 'uploading' && uploadPct > 0 && uploadPct < 100 && (
            <div className={styles.uploadProgress}>
              <div
                className={styles.uploadProgressBar}
                style={{ width: `${uploadPct}%` }}
              />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className={styles.center}>
          <p className={styles.error}>{error}</p>
          <button className={styles.retryBtn} onClick={() => navigate('/')}>
            ← Go Back
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <AnalysisSummary data={data} />
          <TabNav
            tabs={TABS}
            active={tab}
            onChange={(id) => setTab(id as Tab)}
          />
          <main className={styles.content}>
            {tab === 'overview' && (
              <OverviewPanel data={data} />
            )}
            {tab === 'issues' && data.issues && (
              <IssueList result={data.issues} />
            )}
            {tab === 'tests' && data.tests && (
              <TestGapList result={data.tests} />
            )}
            {tab === 'deploy' && data.deploy && (
              <DeployChecklist result={data.deploy} />
            )}
            {tab === 'ai' && (
              <RecommendationsPanel data={data} />
            )}
          </main>
        </>
      )}
    </div>
  );
}
