import type { AnalyzeResponse } from '../types/analysis';
import styles from './AnalysisSummary.module.css';

interface Props {
  data: AnalyzeResponse;
}

export default function AnalysisSummary({ data }: Props) {
  const { codebase, issues, tests, deploy } = data;

  const cards = [
    {
      label: 'Files',
      value: codebase ? codebase.total_files.toLocaleString() : '—',
      sub: codebase ? `${codebase.total_lines.toLocaleString()} lines` : '',
      color: 'accent',
    },
    {
      label: 'Issues',
      value: issues
        ? (issues.critical_count + issues.high_count + issues.medium_count + issues.low_count).toString()
        : '—',
      sub: issues ? `${issues.critical_count} critical` : '',
      color: issues && issues.critical_count > 0 ? 'danger' : 'warn',
    },
    {
      label: 'Test Coverage',
      value: tests ? tests.coverage_estimate : '—',
      sub: tests ? `${tests.uncovered_functions.length} gaps found` : '',
      color: 'info',
    },
    {
      label: 'Deploy Score',
      value: deploy ? `${deploy.readiness_score}/100` : '—',
      sub: deploy ? `${deploy.blockers.length} blocker${deploy.blockers.length !== 1 ? 's' : ''}` : '',
      color: deploy && deploy.readiness_score >= 80 ? 'success' : deploy && deploy.readiness_score >= 50 ? 'warn' : 'danger',
    },
  ];

  return (
    <div className={styles.grid}>
      {cards.map((card) => (
        <div key={card.label} className={`${styles.card} ${styles[card.color]}`}>
          <span className={styles.label}>{card.label}</span>
          <span className={styles.value}>{card.value}</span>
          {card.sub && <span className={styles.sub}>{card.sub}</span>}
        </div>
      ))}
    </div>
  );
}
