#!/usr/bin/env node
/**
 * yarn verify:branch-protection — зуб полиси защиты ветки (#1310).
 * Декларация: docs/security/branch-protection-policy.json (правит владелец).
 * Факт: gh api repos/<owner>/<repo>/branches/<branch>/protection.
 *
 * Exit: 0 — совпадает · 1 — расхождение (названо по имени) · 2 — honest unknown
 * (сеть/права: НЕ «ок» и НЕ «расхождение» — сверка не прогонялась).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compareProtection, formatProtectionReport } from './lib/branch-protection.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_REL = 'docs/security/branch-protection-policy.json';

let policy;
try {
  policy = JSON.parse(readFileSync(join(repoRoot, POLICY_REL), 'utf8'));
} catch (e) {
  console.error(`verify:branch-protection — декларация не читается (${POLICY_REL}): ${e.message}`);
  process.exit(1);
}

const branch = policy.branch ?? 'main';
let fact = null;
try {
  const raw = execFileSync(
    'gh',
    ['api', `repos/officefish/Membrana/branches/${branch}/protection`],
    { encoding: 'utf8', timeout: 60_000 },
  );
  fact = JSON.parse(raw);
} catch {
  fact = null; // honest unknown — сеть/права; compareProtection скажет это словами
}

const result = compareProtection(policy, fact);
console.log(formatProtectionReport(result, branch));
if (result.ok) process.exit(0);
process.exit(result.findings.some((f) => f.level === 'unknown') ? 2 : 1);
