import type { AnalyzeResponse } from '../types/analysis';
import styles from './RecommendationsPanel.module.css';

interface Props {
  data: AnalyzeResponse;
}

interface Insight {
  icon: string;
  category: string;
  title: string;
  body: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

/** Derives AI-style insights from the full analysis response. */
function buildInsights(data: AnalyzeResponse): Insight[] {
  const insights: Insight[] = [];
  const { codebase, issues, tests, deploy } = data;

  // ── Security insights from issues ──────────────────────────────────────
  if (issues) {
    const securityIssues = issues.issues.filter((i) => i.category === 'security');
    const criticalSecurity = securityIssues.filter((i) => i.severity === 'critical');
    if (criticalSecurity.length > 0) {
      insights.push({
        icon: '🚨',
        category: 'Security',
        title: `${criticalSecurity.length} critical security ${criticalSecurity.length === 1 ? 'vulnerability' : 'vulnerabilities'} detected`,
        body: criticalSecurity.map((i) => `• ${i.title} (${i.file}${i.line != null ? `:${i.line}` : ''})`).join('\n'),
        priority: 'critical',
      });
    }
    const highSecurity = securityIssues.filter((i) => i.severity === 'high');
    if (highSecurity.length > 0) {
      insights.push({
        icon: '🔒',
        category: 'Security',
        title: `${highSecurity.length} high-severity security ${highSecurity.length === 1 ? 'issue' : 'issues'} need attention`,
        body: highSecurity.map((i) => `• ${i.title} — ${i.suggestion}`).join('\n'),
        priority: 'high',
      });
    }
  }

  // ── Test coverage insight ───────────────────────────────────────────────
  if (tests) {
    const pct = parseFloat(tests.coverage_estimate.replace(/[^0-9.]/g, ''));
    const pctValid = Number.isFinite(pct);
    const priorityLevel: Insight['priority'] = !pctValid || pct < 40 ? 'high' : pct < 70 ? 'medium' : 'low';
    insights.push({
      icon: '🧪',
      category: 'Test Coverage',
      title: `Coverage is ${tests.coverage_estimate} — ${!pctValid ? 'unknown' : pct < 40 ? 'critically low' : pct < 70 ? 'below recommended threshold' : 'acceptable'}`,
      body:
        `${tests.uncovered_functions.length} functions have no tests. Highest-risk gaps:\n` +
        tests.uncovered_functions
          .slice(0, 4)
          .map((f) => `• ${f.function_name}() in ${f.file}`)
          .join('\n'),
      priority: priorityLevel,
    });
    if (tests.generated_tests.length > 0) {
      insights.push({
        icon: '✨',
        category: 'Generated Tests',
        title: `${tests.generated_tests.length} test ${tests.generated_tests.length === 1 ? 'stub has' : 'stubs have'} been generated for high-risk functions`,
        body:
          `Ready-to-use test stubs are available in the Tests tab for:\n` +
          tests.generated_tests.map((t) => `• ${t.source_file} (${t.test_framework})`).join('\n'),
        priority: 'low',
      });
    }
  }

  // ── Deploy readiness insight ────────────────────────────────────────────
  if (deploy) {
    const score = deploy.readiness_score;
    const priorityLevel: Insight['priority'] = score < 50 ? 'high' : score < 80 ? 'medium' : 'low';
    insights.push({
      icon: '🚀',
      category: 'Deployment',
      title: `Deployment readiness score: ${score}/100`,
      body:
        deploy.blockers.length > 0
          ? `Blockers that must be resolved before deploying:\n` +
            deploy.blockers.map((b) => `• ${b}`).join('\n')
          : 'No blocking issues found. The project looks ready to deploy.',
      priority: priorityLevel,
    });
  }

  // ── Code quality insight from issues ───────────────────────────────────
  if (issues) {
    const perfBugs = issues.issues.filter(
      (i) => i.category === 'performance' || i.category === 'bug',
    );
    if (perfBugs.length > 0) {
      insights.push({
        icon: '⚡',
        category: 'Code Quality',
        title: `${perfBugs.length} performance or bug-class ${perfBugs.length === 1 ? 'issue' : 'issues'} identified`,
        body: perfBugs.map((i) => `• ${i.title} — ${i.file}${i.line != null ? `:${i.line}` : ''}`).join('\n'),
        priority: 'medium',
      });
    }
  }

  // ── Codebase complexity insight ─────────────────────────────────────────
  if (codebase) {
    const avgLines = Math.round(codebase.total_lines / Math.max(codebase.total_files, 1));
    insights.push({
      icon: '🔍',
      category: 'Codebase',
      title: `${codebase.total_files} files · ${codebase.total_lines.toLocaleString()} lines · ${codebase.language_stats.length} languages`,
      body:
        `${codebase.summary}\n\nAverage file size: ~${avgLines} lines. ` +
        `Primary language: ${codebase.language_stats[0]?.language ?? 'unknown'} ` +
        `(${codebase.language_stats[0]?.percentage.toFixed(1) ?? '?'}%).`,
      priority: 'low',
    });
  }

  // Sort: critical → high → medium → low
  const ORDER: Record<Insight['priority'], number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return insights.sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
}

const PRIORITY_LABEL: Record<Insight['priority'], string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Info',
};

export default function RecommendationsPanel({ data }: Props) {
  const insights = buildInsights(data);

  return (
    <div className={styles.root}>
      <div className={styles.intro}>
        <h2 className={styles.introTitle}>✨ AI Insights</h2>
        <p className={styles.introText}>
          Aggregated findings and recommendations across all analysis dimensions. Address
          critical and high-priority items before deployment.
        </p>
      </div>

      {insights.length === 0 ? (
        <p className={styles.empty}>No insights available.</p>
      ) : (
        <div className={styles.list}>
          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      )}

      {/* Mock-data notice when USE_MOCK is active */}
      {import.meta.env.VITE_USE_MOCK === 'true' && (
        <div className={styles.mockNotice}>
          ℹ️ These insights are derived from <strong>mock data</strong>. Connect a live backend to
          see real analysis results.
        </div>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className={`${styles.card} ${styles[insight.priority]}`}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{insight.icon}</span>
        <div className={styles.cardHeading}>
          <span className={styles.cardCategory}>{insight.category}</span>
          <h3 className={styles.cardTitle}>{insight.title}</h3>
        </div>
        <span className={`${styles.priorityBadge} ${styles[insight.priority]}`}>
          {PRIORITY_LABEL[insight.priority]}
        </span>
      </div>
      <pre className={styles.cardBody}>{insight.body}</pre>
    </div>
  );
}
