import { useState } from 'react';
import type { TestsResult } from '../types/analysis';
import CodeBlock from './CodeBlock';
import styles from './TestGapList.module.css';

interface Props {
  result: TestsResult;
}

export default function TestGapList({ result }: Props) {
  const [activeTab, setActiveTab] = useState<'gaps' | 'generated'>('gaps');
  const [selectedTest, setSelectedTest] = useState<number>(0);

  return (
    <div className={styles.root}>
      {/* Summary */}
      <div className={styles.summary}>
        <p className={styles.summaryText}>{result.summary}</p>
        <div className={styles.stats}>
          <span className={styles.stat}>
            <strong>{result.uncovered_functions.length}</strong> uncovered functions
          </span>
          <span className={styles.stat}>
            <strong>{result.generated_tests.length}</strong> tests generated
          </span>
          <span className={`${styles.stat} ${styles.coverage}`}>
            Est. coverage: <strong>{result.coverage_estimate}</strong>
          </span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className={styles.subTabs}>
        <button
          className={`${styles.subTab} ${activeTab === 'gaps' ? styles.subTabActive : ''}`}
          onClick={() => setActiveTab('gaps')}
        >
          🔍 Coverage Gaps ({result.uncovered_functions.length})
        </button>
        <button
          className={`${styles.subTab} ${activeTab === 'generated' ? styles.subTabActive : ''}`}
          onClick={() => setActiveTab('generated')}
        >
          ✨ Generated Tests ({result.generated_tests.length})
        </button>
      </div>

      {/* Gaps panel */}
      {activeTab === 'gaps' && (
        <ul className={styles.gapList}>
          {result.uncovered_functions.map((fn, i) => (
            <li key={i} className={styles.gapItem}>
              <div className={styles.gapTop}>
                <span className={styles.fnName}>{fn.function_name}()</span>
                <span className={styles.fnFile}>{fn.file}</span>
              </div>
              <p className={styles.gapReason}>{fn.reason}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Generated tests panel */}
      {activeTab === 'generated' && result.generated_tests.length > 0 && (
        <div className={styles.generatedPanel}>
          <div className={styles.testSelector}>
            {result.generated_tests.map((t, i) => (
              <button
                key={i}
                className={`${styles.testSelectorBtn} ${selectedTest === i ? styles.testSelectorActive : ''}`}
                onClick={() => setSelectedTest(i)}
              >
                <span>{t.source_file.split('/').pop()}</span>
                <span className={styles.framework}>{t.test_framework}</span>
              </button>
            ))}
          </div>
          <CodeBlock
            code={result.generated_tests[selectedTest].test_code}
            language={result.generated_tests[selectedTest].test_framework}
          />
        </div>
      )}
    </div>
  );
}
