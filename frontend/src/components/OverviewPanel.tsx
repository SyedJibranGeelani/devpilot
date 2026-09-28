import type { AnalyzeResponse, LanguageStat, StackInfo } from '../types/analysis';
import FileTree from './FileTree';
import styles from './OverviewPanel.module.css';

interface Props {
  data: AnalyzeResponse;
}

export default function OverviewPanel({ data }: Props) {
  const { codebase } = data;

  if (!codebase) {
    return <p className={styles.empty}>No codebase data available.</p>;
  }

  return (
    <div className={styles.root}>
      {/* Summary card */}
      <div className={styles.summaryCard}>
        <h3 className={styles.cardTitle}>Project Summary</h3>
        <p className={styles.summaryText}>{codebase.summary}</p>
        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Total Files</span>
            <span className={styles.metaValue}>{codebase.total_files.toLocaleString()}</span>
          </span>
          <span className={styles.metaSep} />
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Total Lines</span>
            <span className={styles.metaValue}>{codebase.total_lines.toLocaleString()}</span>
          </span>
          <span className={styles.metaSep} />
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Languages</span>
            <span className={styles.metaValue}>{codebase.language_stats.length}</span>
          </span>
        </div>
      </div>

      {/* Stack info card */}
      {codebase.stack && !isStackEmpty(codebase.stack) && (
        <StackCard stack={codebase.stack} />
      )}

      {/* Two-column grid: language stats + file tree */}
      <div className={styles.grid}>
        <LanguageChart stats={codebase.language_stats} />
        <FileTree node={codebase.file_tree} />
      </div>
    </div>
  );
}

function isStackEmpty(s: StackInfo): boolean {
  return (
    s.languages.length === 0 &&
    s.frameworks.length === 0 &&
    s.tools.length === 0 &&
    s.package_managers.length === 0
  );
}

function StackCard({ stack }: { stack: StackInfo }) {
  const rows: { label: string; items: string[] }[] = [
    { label: 'Languages / Runtimes', items: stack.languages },
    { label: 'Frameworks & Libraries', items: stack.frameworks },
    { label: 'Tools', items: stack.tools },
    { label: 'Package Managers', items: stack.package_managers },
  ].filter((r) => r.items.length > 0);

  return (
    <div className={styles.stackCard}>
      <h3 className={styles.cardTitle}>Detected Stack</h3>
      <div className={styles.stackGrid}>
        {rows.map(({ label, items }) => (
          <div key={label} className={styles.stackRow}>
            <span className={styles.stackLabel}>{label}</span>
            <div className={styles.stackPills}>
              {items.map((item) => (
                <span key={item} className={styles.stackPill}>{item}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LanguageChart({ stats }: { stats: LanguageStat[] }) {
  const PALETTE = [
    '#6366f1', '#22c55e', '#f59e0b', '#3b82f6',
    '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
  ];

  return (
    <div className={styles.langCard}>
      <h3 className={styles.cardTitle}>Language Breakdown</h3>
      <div className={styles.langList}>
        {stats.map((s, i) => (
          <div key={s.language} className={styles.langRow}>
            <div className={styles.langMeta}>
              <span
                className={styles.langDot}
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              <span className={styles.langName}>{s.language}</span>
              <span className={styles.langCount}>{s.file_count} files</span>
              <span className={styles.langPct}>{s.percentage.toFixed(1)}%</span>
            </div>
            <div className={styles.langBar}>
              <div
                className={styles.langBarFill}
                style={{
                  width: `${s.percentage}%`,
                  background: PALETTE[i % PALETTE.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Stacked proportion bar */}
      <div className={styles.stackBar} aria-hidden="true">
        {stats.map((s, i) => (
          <div
            key={s.language}
            className={styles.stackSegment}
            style={{
              width: `${s.percentage}%`,
              background: PALETTE[i % PALETTE.length],
            }}
            title={`${s.language}: ${s.percentage.toFixed(1)}%`}
          />
        ))}
      </div>
    </div>
  );
}
