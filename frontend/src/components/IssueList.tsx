import { useState } from 'react';
import type { IssuesResult, Issue, Severity } from '../types/analysis';
import styles from './IssueList.module.css';

interface Props {
  result: IssuesResult;
}

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

function categoryLabel(cat: string): string {
  const MAP: Record<string, string> = {
    security: '🔒 Security',
    bug: '🐛 Bug',
    'code-quality': '🧹 Code Quality',
    performance: '⚡ Performance',
  };
  return MAP[cat] ?? `🏷️ ${cat}`;
}

export default function IssueList({ result }: Props) {
  const [activeSeverity, setActiveSeverity] = useState<Severity | 'all'>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  // Derive categories present in the data
  const categories = Array.from(new Set(result.issues.map((i) => i.category)));

  const filtered = result.issues.filter((issue) => {
    const sevMatch = activeSeverity === 'all' || issue.severity === activeSeverity;
    const catMatch = activeCategory === 'all' || issue.category === activeCategory;
    return sevMatch && catMatch;
  });

  const counts: Record<string, number> = {
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
          <button
            className={`${styles.filterBtn} ${activeCategory === 'all' ? styles.filterActive : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              className={`${styles.filterBtn} ${activeCategory === c ? styles.filterActive : ''}`}
              onClick={() => setActiveCategory(c)}
            >
              {categoryLabel(c)}
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
    <li className={`${styles.issueRow} ${styles[issue.severity] ?? ''}`}>
      <button className={styles.issueHeader} onClick={onToggle}>
        <span className={`${styles.badge} ${styles[issue.severity] ?? ''}`}>
          {SEVERITY_LABEL[issue.severity] ?? issue.severity}
        </span>
        <span className={styles.categoryBadge}>
          {categoryLabel(issue.category)}
        </span>
        <span className={styles.issueTitle}>{issue.title}</span>
        <span className={styles.issueMeta}>
          {issue.file}{issue.line != null ? `:${issue.line}` : ''}
        </span>
        <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className={styles.issueBody}>
          {/* File + line detail row */}
          <div className={styles.issueLocation}>
            <span className={styles.locationLabel}>📄 File</span>
            <code className={styles.locationValue}>
              {issue.file}{issue.line != null ? `:${issue.line}` : ''}
            </code>
          </div>

          {/* Explanation */}
          <p className={styles.issueDesc}>{issue.description}</p>

          {/* Recommendation */}
          <div className={styles.suggestion}>
            <span className={styles.suggestionLabel}>💡 Recommendation</span>
            <p>{issue.suggestion}</p>
          </div>
        </div>
      )}
    </li>
  );
}
