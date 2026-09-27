import type { AnalyzeResponse } from '../types/analysis';

export const MOCK_DATA: AnalyzeResponse = {
  project_path: '/home/dev/projects/my-saas-app',
  errors: {},

  codebase: {
    total_files: 87,
    total_lines: 14320,
    summary:
      'A full-stack SaaS application built with React, Node.js, and PostgreSQL. The project follows a monorepo structure with clear separation between frontend and backend concerns. Core business logic is concentrated in the services layer.',
    language_stats: [
      { language: 'TypeScript', file_count: 41, percentage: 47.1 },
      { language: 'JavaScript', file_count: 12, percentage: 13.8 },
      { language: 'Python',     file_count: 18, percentage: 20.7 },
      { language: 'CSS',        file_count: 8,  percentage: 9.2  },
      { language: 'YAML',       file_count: 5,  percentage: 5.7  },
      { language: 'Markdown',   file_count: 3,  percentage: 3.4  },
    ],
    file_tree: {
      name: 'my-saas-app',
      path: '',
      type: 'directory',
      children: [
        {
          name: 'frontend', path: 'frontend', type: 'directory',
          children: [
            { name: 'src', path: 'frontend/src', type: 'directory', children: [
              { name: 'App.tsx',        path: 'frontend/src/App.tsx',        type: 'file', children: [] },
              { name: 'components',     path: 'frontend/src/components',     type: 'directory', children: [
                { name: 'Button.tsx',   path: 'frontend/src/components/Button.tsx',   type: 'file', children: [] },
                { name: 'Modal.tsx',    path: 'frontend/src/components/Modal.tsx',    type: 'file', children: [] },
                { name: 'Table.tsx',    path: 'frontend/src/components/Table.tsx',    type: 'file', children: [] },
              ]},
              { name: 'pages', path: 'frontend/src/pages', type: 'directory', children: [
                { name: 'Dashboard.tsx', path: 'frontend/src/pages/Dashboard.tsx', type: 'file', children: [] },
                { name: 'Settings.tsx',  path: 'frontend/src/pages/Settings.tsx',  type: 'file', children: [] },
              ]},
            ]},
          ],
        },
        {
          name: 'backend', path: 'backend', type: 'directory',
          children: [
            { name: 'main.py',   path: 'backend/main.py',   type: 'file', children: [] },
            { name: 'models',    path: 'backend/models',    type: 'directory', children: [
              { name: 'user.py',    path: 'backend/models/user.py',    type: 'file', children: [] },
              { name: 'billing.py', path: 'backend/models/billing.py', type: 'file', children: [] },
            ]},
            { name: 'services',  path: 'backend/services',  type: 'directory', children: [
              { name: 'auth.py',    path: 'backend/services/auth.py',    type: 'file', children: [] },
              { name: 'payments.py',path: 'backend/services/payments.py',type: 'file', children: [] },
            ]},
            { name: 'tests',     path: 'backend/tests',     type: 'directory', children: [
              { name: 'test_auth.py', path: 'backend/tests/test_auth.py', type: 'file', children: [] },
            ]},
          ],
        },
        { name: 'docker-compose.yml', path: 'docker-compose.yml', type: 'file', children: [] },
        { name: 'README.md',          path: 'README.md',          type: 'file', children: [] },
        { name: '.env.example',       path: '.env.example',       type: 'file', children: [] },
      ],
    },
  },

  issues: {
    critical_count: 2,
    high_count: 4,
    medium_count: 7,
    low_count: 11,
    summary:
      'Found 24 issues across the codebase. 2 critical security vulnerabilities require immediate attention before deployment.',
    issues: [
      {
        file: 'backend/services/auth.py',
        line: 42,
        severity: 'critical',
        category: 'security',
        title: 'Hardcoded JWT secret key',
        description: 'The JWT signing secret is hardcoded as a string literal. If this code is pushed to a public repository, attackers can forge authentication tokens.',
        suggestion: 'Move the secret to an environment variable: `SECRET_KEY = os.getenv("JWT_SECRET")` and rotate the current key immediately.',
      },
      {
        file: 'backend/models/user.py',
        line: 88,
        severity: 'critical',
        category: 'security',
        title: 'SQL injection via string concatenation',
        description: 'User input is directly concatenated into a raw SQL query string without parameterisation, allowing an attacker to manipulate the query.',
        suggestion: 'Use parameterised queries or an ORM. Replace `f"SELECT * FROM users WHERE email = \'{email}\'"` with a bound parameter.',
      },
      {
        file: 'backend/services/payments.py',
        line: 15,
        severity: 'high',
        category: 'security',
        title: 'API key logged to stdout',
        description: 'The Stripe API key value is written to the application log on startup, which may expose it in log aggregation systems.',
        suggestion: 'Remove or redact sensitive values from log statements.',
      },
      {
        file: 'frontend/src/components/Table.tsx',
        line: 67,
        severity: 'high',
        category: 'security',
        title: 'Unescaped HTML via dangerouslySetInnerHTML',
        description: 'User-supplied content is rendered as raw HTML without sanitisation, creating a stored XSS vector.',
        suggestion: 'Use a library like DOMPurify to sanitise HTML before rendering, or avoid dangerouslySetInnerHTML entirely.',
      },
      {
        file: 'backend/services/auth.py',
        line: 110,
        severity: 'high',
        category: 'bug',
        title: 'Token expiry not validated',
        description: 'The `verify_token` function decodes the JWT payload but does not check the `exp` claim, allowing expired tokens to remain valid indefinitely.',
        suggestion: 'Pass `options={"verify_exp": True}` to `jwt.decode()` or check `payload["exp"] > time.time()` manually.',
      },
      {
        file: 'frontend/src/pages/Dashboard.tsx',
        line: 34,
        severity: 'high',
        category: 'performance',
        title: 'Unmemoised expensive computation in render',
        description: 'A large dataset is filtered and sorted on every render cycle without useMemo, causing unnecessary CPU work on each state update.',
        suggestion: 'Wrap the computation in `useMemo(() => ..., [deps])` to cache the result between renders.',
      },
      {
        file: 'backend/models/billing.py',
        line: 22,
        severity: 'medium',
        category: 'code-quality',
        title: 'Broad exception catch hides errors',
        description: 'A bare `except Exception` block swallows all errors silently, making production debugging very difficult.',
        suggestion: 'Catch specific exception types and log the full stack trace with `logger.exception()`.',
      },
      {
        file: 'frontend/src/App.tsx',
        line: 5,
        severity: 'medium',
        category: 'code-quality',
        title: 'Unused import: React',
        description: 'React 17+ with the new JSX transform does not require importing React in every file.',
        suggestion: 'Remove the unused import to keep the bundle clean.',
      },
      {
        file: 'backend/services/payments.py',
        line: 78,
        severity: 'medium',
        category: 'bug',
        title: 'Race condition in payment idempotency check',
        description: 'The idempotency check reads then writes in two separate database operations with no transaction or lock, allowing duplicate charges under concurrent requests.',
        suggestion: 'Wrap the read-check-write in a database transaction with `SELECT FOR UPDATE` or use an atomic upsert.',
      },
    ],
  },

  tests: {
    coverage_estimate: '31%',
    summary:
      'Estimated test coverage is 31%. 18 functions with business logic have no corresponding tests. 3 test stubs have been generated for the highest-risk functions.',
    uncovered_functions: [
      { file: 'backend/services/auth.py',     function_name: 'verify_token',       reason: 'Security-critical path with no test coverage' },
      { file: 'backend/services/auth.py',     function_name: 'refresh_token',      reason: 'Token refresh logic is untested' },
      { file: 'backend/services/payments.py', function_name: 'process_payment',    reason: 'Core business logic — no happy-path or error tests' },
      { file: 'backend/services/payments.py', function_name: 'refund_payment',     reason: 'Refund flow has no tests' },
      { file: 'backend/models/user.py',       function_name: 'create_user',        reason: 'User creation with validation is untested' },
      { file: 'backend/models/user.py',       function_name: 'update_password',    reason: 'Password hashing path is untested' },
      { file: 'backend/models/billing.py',    function_name: 'calculate_invoice',  reason: 'Billing calculation logic is untested' },
      { file: 'frontend/src/components/Table.tsx', function_name: 'sortRows',      reason: 'Sort logic is untested' },
    ],
    generated_tests: [
      {
        source_file: 'backend/services/auth.py',
        test_framework: 'pytest',
        test_code: `import pytest
import time
from services.auth import verify_token, create_token

class TestVerifyToken:
    def test_valid_token_returns_payload(self):
        token = create_token(user_id=1, email="user@example.com")
        payload = verify_token(token)
        assert payload["user_id"] == 1
        assert payload["email"] == "user@example.com"

    def test_expired_token_raises(self):
        token = create_token(user_id=1, email="user@example.com", expires_in=-1)
        with pytest.raises(Exception, match="expired"):
            verify_token(token)

    def test_tampered_token_raises(self):
        token = create_token(user_id=1, email="user@example.com")
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(Exception):
            verify_token(tampered)

    def test_missing_token_raises(self):
        with pytest.raises(Exception):
            verify_token("")`,
      },
      {
        source_file: 'backend/services/payments.py',
        test_framework: 'pytest',
        test_code: `import pytest
from unittest.mock import patch, MagicMock
from services.payments import process_payment

class TestProcessPayment:
    @patch("services.payments.stripe.PaymentIntent.create")
    def test_successful_payment_returns_intent(self, mock_create):
        mock_create.return_value = MagicMock(id="pi_123", status="succeeded")
        result = process_payment(amount=1000, currency="usd", user_id=1)
        assert result["status"] == "succeeded"
        assert result["payment_intent_id"] == "pi_123"

    @patch("services.payments.stripe.PaymentIntent.create")
    def test_stripe_error_raises(self, mock_create):
        import stripe
        mock_create.side_effect = stripe.error.CardError("Card declined", None, None)
        with pytest.raises(Exception, match="Card declined"):
            process_payment(amount=1000, currency="usd", user_id=1)

    def test_invalid_amount_raises_value_error(self):
        with pytest.raises(ValueError):
            process_payment(amount=-1, currency="usd", user_id=1)`,
      },
      {
        source_file: 'frontend/src/components/Table.tsx',
        test_framework: 'vitest',
        test_code: `import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Table from './Table';

const ROWS = [
  { id: 1, name: 'Charlie', amount: 300 },
  { id: 2, name: 'Alice',   amount: 100 },
  { id: 3, name: 'Bob',     amount: 200 },
];

describe('Table', () => {
  it('renders all rows', () => {
    render(<Table rows={ROWS} />);
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('sorts ascending when column header is clicked', async () => {
    render(<Table rows={ROWS} />);
    await userEvent.click(screen.getByText('Name'));
    const cells = screen.getAllByRole('cell', { name: /Alice|Bob|Charlie/ });
    expect(cells[0]).toHaveTextContent('Alice');
  });

  it('sorts descending on second click', async () => {
    render(<Table rows={ROWS} />);
    await userEvent.click(screen.getByText('Name'));
    await userEvent.click(screen.getByText('Name'));
    const cells = screen.getAllByRole('cell', { name: /Alice|Bob|Charlie/ });
    expect(cells[0]).toHaveTextContent('Charlie');
  });
});`,
      },
    ],
  },

  deploy: {
    readiness_score: 62,
    summary:
      'Deployment readiness score is 62/100. Two critical blockers must be resolved: missing CI/CD pipeline and hardcoded secrets. Docker configuration is present.',
    blockers: [
      'No CI/CD pipeline configured (.github/workflows or .gitlab-ci.yml)',
      'Hardcoded secrets detected — must be moved to environment variables',
    ],
    checklist: [
      { id: 'env-file',       category: 'Configuration',    label: '.env.example present',             status: 'pass', detail: 'Found: .env.example' },
      { id: 'docker',         category: 'Containerisation', label: 'Dockerfile present',               status: 'pass', detail: 'Found: Dockerfile' },
      { id: 'docker-compose', category: 'Containerisation', label: 'docker-compose.yml present',       status: 'pass', detail: 'Found: docker-compose.yml' },
      { id: 'ci-github',      category: 'CI/CD',            label: 'GitHub Actions workflow present',  status: 'fail', detail: 'Not found' },
      { id: 'ci-gitlab',      category: 'CI/CD',            label: 'GitLab CI config present',         status: 'fail', detail: 'Not found' },
      { id: 'readme',         category: 'Documentation',    label: 'README present',                   status: 'pass', detail: 'Found: README.md' },
      { id: 'requirements',   category: 'Dependencies',     label: 'requirements.txt present',         status: 'pass', detail: 'Found: requirements.txt' },
      { id: 'package-json',   category: 'Dependencies',     label: 'package.json present',             status: 'pass', detail: 'Found: package.json' },
      { id: 'gitignore',      category: 'Version Control',  label: '.gitignore present',               status: 'pass', detail: 'Found: .gitignore' },
      { id: 'tests-dir',      category: 'Testing',          label: 'Tests directory present',          status: 'pass', detail: 'Found: tests' },
      { id: 'secrets',        category: 'Security',         label: 'No hardcoded secrets detected',    status: 'fail', detail: 'Hardcoded JWT secret found in auth.py:42' },
      { id: 'health-endpoint',category: 'Observability',    label: 'Health check endpoint present',    status: 'pass', detail: 'GET /health returns 200' },
    ],
  },
};
