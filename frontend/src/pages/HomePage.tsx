import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PathInput from '../components/PathInput';
import styles from './HomePage.module.css';

export default function HomePage() {
  const navigate = useNavigate();
  const [path, setPath] = useState('');
  const [error, setError] = useState('');

  function handleStart() {
    const trimmed = path.trim();
    if (!trimmed) {
      setError('Please enter a project path.');
      return;
    }
    setError('');
    // Pass the path via location state to the results page
    navigate('/results', { state: { projectPath: trimmed } });
  }

  return (
    <main className={styles.root}>
      <div className={styles.hero}>
        <div className={styles.badge}>AI-Powered</div>
        <h1 className={styles.title}>
          Dev<span className={styles.accent}>Pilot</span>
        </h1>
        <p className={styles.tagline}>
          Understand any codebase. Detect issues. Generate tests. Ship with confidence.
        </p>

        <div className={styles.inputGroup}>
          <PathInput
            value={path}
            onChange={setPath}
            onSubmit={handleStart}
            placeholder="/absolute/path/to/your/project"
          />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.startBtn} onClick={handleStart}>
            Analyze Project →
          </button>
        </div>

        <ul className={styles.features}>
          <li>🔍 Codebase overview &amp; language stats</li>
          <li>🛡️ Security &amp; problem detection</li>
          <li>🧪 Missing test identification &amp; generation</li>
          <li>🚀 Deployment readiness checklist</li>
        </ul>
      </div>
    </main>
  );
}
