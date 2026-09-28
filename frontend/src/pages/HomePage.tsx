import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ZipUpload from '../components/ZipUpload';
import styles from './HomePage.module.css';

export default function HomePage() {
  const navigate = useNavigate();
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [localPath, setLocalPath] = useState('');
  const [error, setError] = useState('');

  const handleFile = useCallback((file: File) => {
    setZipFile(file);
    setError('');
  }, []);

  function handleAnalyze() {
    if (!zipFile && !localPath.trim()) {
      setError('Please select a ZIP file or enter a local project path.');
      return;
    }
    setError('');

    if (zipFile) {
      // Pass the File object via location state — ResultsPage handles the upload
      navigate('/results', { state: { zipFile, fileName: zipFile.name } });
    } else {
      navigate('/results', { state: { projectPath: localPath.trim() } });
    }
  }

  const canAnalyze = !!(zipFile || localPath.trim());

  return (
    <main className={styles.root}>
      <div className={styles.hero}>
        <div className={styles.badge}>AI-Powered Code Analysis</div>
        <h1 className={styles.title}>
          Dev<span className={styles.accent}>Pilot</span>
        </h1>
        <p className={styles.tagline}>
          Upload your project as a ZIP and get an instant codebase overview,
          security findings, test-gap analysis, and deployment readiness report.
        </p>

        <div className={styles.inputGroup}>
          <ZipUpload
            onFile={handleFile}
            localModeEnabled={true}
            localPath={localPath}
            onLocalPathChange={setLocalPath}
            onLocalPathSubmit={handleAnalyze}
          />

          {error && <p className={styles.error}>{error}</p>}

          <button
            className={styles.startBtn}
            onClick={handleAnalyze}
            disabled={!canAnalyze}
          >
            Analyze Project →
          </button>
        </div>

        <ul className={styles.features}>
          <li>📦 Upload any project as a ZIP — no local paths needed</li>
          <li>🔍 Codebase overview, language stats &amp; stack detection</li>
          <li>🛡️ Security, bugs &amp; code-quality issue detection</li>
          <li>🧪 Missing test identification &amp; stub generation</li>
          <li>🚀 Deployment readiness checklist</li>
        </ul>
      </div>
    </main>
  );
}
