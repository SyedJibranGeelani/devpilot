import { useState } from 'react';
import type { IssuesResult, Issue, Severity, IssueCategory } from '../types/analysis';
import styles from './IssueList.module.css';

interface Props {
  result: IssuesResult;
}

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

const CATEGORY_LABEL: Record<IssueCategory, string> = {
  security: '🔒 Security',
  bug: '🐛 Bug',
  'code-quality': '🧹 Code Quality',
  performance: '⚡ Performance',
};

export default function IssueList({ result }: Props) {
  const [activeSeverity, setActiveSeverity] = useState<Severity | 'all'>('all');
  const [activeCategory, setActiveCategory] = useState<IssueCategory | 'all'>('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = result.issues.filter((issue) => {
    const sevMatch = activeSeverity === 'all' || issue.severity === activeSeverity;
    const catMatch = activeCategory === 'all' || issue.category === activeCategory;
    return sevMatch && catMatch;
  });

  const counts: Record<Severity, number> = {
    critical: result.critical_count,
    high: result.high_count,
    medium: result.medium_count,
    low: result.low_count,
    info: 0,
  };

  return (
    <div className={styles.root}>
      {/* Summary bar */}
      <div className={styles.summary}>
        <p className={styles.summaryText}>{result.summary}</p>
        <div className={styles.counters}>
          {SEVERITY_ORDER.filter((s) => counts[s] > 0).map((s) => (
            <span key={s} className={`${styles.counter} ${styles[s]}`}>
              {counts[s]} {SEVERITY_LABEL[s]}
            </span>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Severity</span>
          {(['all', ...SEVERITY_ORDER] as const).map((s) => (
            <button
              key={s}
              className={`${styles.filterBtn} ${activeSeverity === s ? styles.filterActive : ''}`}
              onClick={() => setActiveSeverity(s)}
            >
              {s === 'all' ? 'All' : SEVERITY_LABEL[s]}
              {s !== 'all' && counts[s] > 0 && (
                <span className={styles.filterCount}>{counts[s]}</span>
              )}
            </button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Category</span>
          {(['all', 'security', 'bug', 'code-quality', 'performance'] as const).map((c) => (
            <button
              key={c}
              className={`${styles.filterBtn} ${activeCategory === c ? styles.filterActive : ''}`}
              onClick={() => setActiveCategory(c)}
            >
              {c === 'all' ? 'All' : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Issue list */}
      {filtered.length === 0 ? (
        <p className={styles.empty}>No issues match the selected filters.</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((issue, idx) => (
            <IssueRow
              key={idx}
              issue={issue}
              open={expanded === idx}
              onToggle={() => setExpanded(expanded === idx ? null : idx)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function IssueRow({ issue, open, onToggle }: { issue: Issue; open: boolean; onToggle: () => void }) {
  return (
    <li className={`${styles.issueRow} ${styles[issue.severity]}`}>
      <button className={styles.issueHeader} onClick={onToggle}>
        <span className={`${styles.badge} ${styles[issue.severity]}`}>
          {SEVERITY_LABEL[issue.severity]}
        </span>
        <span className={styles.categoryBadge}>
          {CATEGORY_LABEL[issue.category]}
        </span>
        <span className={styles.issueTitle}>{issue.title}</span>
        <span className={styles.issueMeta}>
          {issue.file}{issue.line != null ? `:${issue.line}` : ''}
        </span>
        <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className={styles.issueBody}>
          <p className={styles.issueDesc}>{issue.description}</p>
          <div className={styles.suggestion}>
            <span className={styles.suggestionLabel}>💡 Suggestion</span>
            <p>{issue.suggestion}</p>
          </div>
        </div>
      )}
    </li>
  );
}
