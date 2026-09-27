import type { DeployResult, ChecklistItem, CheckStatus } from '../types/analysis';
import styles from './DeployChecklist.module.css';

interface Props {
  result: DeployResult;
}

const STATUS_ICON: Record<CheckStatus, string> = {
  pass: '✅',
  fail: '❌',
  warn: '⚠️',
  skip: '⏭️',
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: 'Pass',
  fail: 'Fail',
  warn: 'Warning',
  skip: 'Skipped',
};

export default function DeployChecklist({ result }: Props) {
  const categories = [...new Set(result.checklist.map((c) => c.category))];

  const scoreColor =
    result.readiness_score >= 80 ? 'success'
    : result.readiness_score >= 50 ? 'warn'
    : 'danger';

  return (
    <div className={styles.root}>
      {/* Score card */}
      <div className={styles.scoreCard}>
        <div className={styles.scoreLeft}>
          <span className={`${styles.scoreNum} ${styles[scoreColor]}`}>
            {result.readiness_score}
          </span>
          <span className={styles.scoreLabel}>/ 100</span>
          <span className={styles.scoreTitle}>Deployment Readiness</span>
        </div>
        <div className={styles.scoreRight}>
          <div className={styles.scoreBar}>
            <div
              className={`${styles.scoreBarFill} ${styles[scoreColor]}`}
              style={{ width: `${result.readiness_score}%` }}
            />
          </div>
          <p className={styles.scoreSummary}>{result.summary}</p>
        </div>
      </div>

      {/* Blockers */}
      {result.blockers.length > 0 && (
        <div className={styles.blockers}>
          <h4 className={styles.blockersTitle}>🚫 Blockers ({result.blockers.length})</h4>
          <ul className={styles.blockerList}>
            {result.blockers.map((b, i) => (
              <li key={i} className={styles.blockerItem}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Checklist grouped by category */}
      {categories.map((cat) => (
        <div key={cat} className={styles.group}>
          <h4 className={styles.groupTitle}>{cat}</h4>
          <ul className={styles.checkList}>
            {result.checklist
              .filter((item) => item.category === cat)
              .map((item) => (
                <CheckRow key={item.id} item={item} />
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CheckRow({ item }: { item: ChecklistItem }) {
  return (
    <li className={`${styles.checkRow} ${styles[item.status]}`}>
      <span className={styles.statusIcon} title={STATUS_LABEL[item.status]}>
        {STATUS_ICON[item.status]}
      </span>
      <span className={styles.checkLabel}>{item.label}</span>
      <span className={styles.checkDetail}>{item.detail}</span>
    </li>
  );
}
