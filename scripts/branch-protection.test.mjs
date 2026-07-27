/**
 * Зуб полиси защиты (#1310): сверка декларации с фактом — оба пути, не только счастливый.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { compareProtection, formatProtectionReport } from './lib/branch-protection.mjs';

const POLICY = {
  branch: 'main',
  requiredStatusChecks: { contexts: ['scan', 'Lint, typecheck, test, build'], strict: false },
  allowForcePushes: false,
  allowDeletions: false,
  requiredPullRequestReviews: { required: false },
  enforceAdmins: { required: false },
  requiredLinearHistory: { required: false },
};

const FACT_OK = {
  required_status_checks: { contexts: ['scan', 'Lint, typecheck, test, build'], strict: false },
  allow_force_pushes: { enabled: false },
  allow_deletions: { enabled: false },
  required_pull_request_reviews: null,
  enforce_admins: { enabled: false },
  required_linear_history: { enabled: false },
};

test('полное совпадение → ok, ноль находок', () => {
  const r = compareProtection(POLICY, FACT_OK);
  assert.equal(r.ok, true);
  assert.equal(r.findings.length, 0);
  assert.match(formatProtectionReport(r, 'main'), /OK/u);
});

test('замер 27.07: обязателен только scan → находка называет отсутствующую сборку', () => {
  const fact = { ...FACT_OK, required_status_checks: { contexts: ['scan'], strict: false } };
  const r = compareProtection(POLICY, fact);
  assert.equal(r.ok, false);
  assert.ok(r.findings.some((f) => f.field === 'required_checks' && f.message.includes('Lint, typecheck, test, build')));
});

test('лишняя проверка на факте — тоже находка (полиси отстала или правка мимо слова)', () => {
  const fact = { ...FACT_OK, required_status_checks: { contexts: [...FACT_OK.required_status_checks.contexts, 'Turbo unit tests'], strict: false } };
  const r = compareProtection(POLICY, fact);
  assert.ok(r.findings.some((f) => f.message.includes('Turbo unit tests')));
});

test('ревью включили при заявленном легальном «нет» → находка, не тихое одобрение', () => {
  const fact = { ...FACT_OK, required_pull_request_reviews: { required_approving_review_count: 1 } };
  const r = compareProtection(POLICY, fact);
  assert.ok(r.findings.some((f) => f.field === 'reviews'));
});

test('факт недоступен → honest unknown, НЕ ок', () => {
  const r = compareProtection(POLICY, null);
  assert.equal(r.ok, false);
  assert.equal(r.findings[0].level, 'unknown');
  assert.match(formatProtectionReport(r, 'main'), /unknown/u);
});

test('force-push включили — находка по имени', () => {
  const fact = { ...FACT_OK, allow_force_pushes: { enabled: true } };
  const r = compareProtection(POLICY, fact);
  assert.ok(r.findings.some((f) => f.field === 'allowForcePushes' && /force-push/u.test(f.message)));
});
