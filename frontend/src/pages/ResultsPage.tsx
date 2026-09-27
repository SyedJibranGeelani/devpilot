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

export default function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const projectPath: string =
    (location.state as { projectPath?: string })?.projectPath ?? '';

  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalyzeResponse | null>(null);

  useEffect(() => {
    if (!projectPath) {
      navigate('/');
      return;
    }

    if (USE_MOCK) {
      // Simulate a short loading delay for realism
      setLoading(true);
      const t = setTimeout(() => {
        setData({ ...MOCK_DATA, project_path: projectPath });
        setLoading(false);
      }, 1200);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .analyze({ project_path: projectPath })
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => {
        if (!cancelled) {
          setError(
            `Analysis failed: ${err?.response?.data?.detail ?? err?.message ?? 'Could not reach the backend. Make sure the DevPilot server is running on http://localhost:8000.'}`
          );
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectPath, navigate]);

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
          <p className={styles.path}>{projectPath}</p>
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
          <p>Analyzing project…</p>
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
