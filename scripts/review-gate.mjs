#!/usr/bin/env node
/**
 * yarn review:gate — шип-гейт: проверить ревью-вердикт тимлида по HEAD SHA и
 * опубликовать его как commit status `review/teamlead` (карточка ship-review-tooth
 * #924; слово владельца 29.07: весь код в main — через ревью тимлида, BLOCK — стоп).
 *
 *   yarn review:gate [--pr N] [--publish]
 *     без --pr        — PR текущей ветки (номер даёт gh)
 *     --publish       — записать commit status в GitHub (иначе только вердикт в stdout)
 *
 * Читает docs/discussions/pr-<N>-code-review.md, ищет маркер вердикта и сверяет его
 * SHA с HEAD ветки. Три исхода: pass · block · unknown (ревью не прогонялось — НЕ pass).
 * Громкий обход: REVIEW_GATE_OVERRIDE=1 + REVIEW_GATE_OVERRIDE_REASON="…".
 *
 * Exit: 0 — pass; 1 — block; 3 — unknown (прогнать ревью); 2 — инструментальная.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { EXTERNAL_CALL_TIMEOUT_MS } from './lib/merge-fact.mjs';
import {
  REVIEW_STATUS_CONTEXT,
  parseVerdict,
  reviewGateDecision,
  statusFromDecision,
} from './lib/review-gate.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 && argv[i + 1] != null && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};

function sh(cmd, args) {
  return String(execFileSync(cmd, args, { cwd: repoRoot, encoding: 'utf8', timeout: EXTERNAL_CALL_TIMEOUT_MS })).trim();
}

function main() {
  let pr = flag('pr');
  let headSha = null;
  try {
    headSha = sh('git', ['rev-parse', 'HEAD']);
  } catch {
    /* решение примет ядро: без SHA — unknown */
  }
  if (!pr) {
    try {
      pr = String(JSON.parse(sh('gh', ['pr', 'view', '--json', 'number'])).number);
    } catch {
      console.error('review:gate — номер PR не определился (gh недоступен) — повтори с --pr <N>');
      return 2;
    }
  }

  const reviewPath = join(repoRoot, `docs/discussions/pr-${pr}-code-review.md`);
  const md = existsSync(reviewPath) ? readFileSync(reviewPath, 'utf8') : '';
  const decision = reviewGateDecision({
    headSha,
    verdict: parseVerdict(md),
    override: {
      enabled: process.env.REVIEW_GATE_OVERRIDE === '1',
      reason: process.env.REVIEW_GATE_OVERRIDE_REASON,
    },
  });

  const mark = decision.state === 'pass' ? '✓' : decision.state === 'block' ? '✗' : '?';
  console.log(`review:gate — PR #${pr} · ${mark} ${decision.state}: ${decision.reason}`);

  if (argv.includes('--publish')) {
    const status = statusFromDecision(decision);
    try {
      sh('gh', [
        'api', '-X', 'POST', `repos/{owner}/{repo}/statuses/${headSha}`,
        '-f', `state=${status.state}`,
        '-f', `context=${REVIEW_STATUS_CONTEXT}`,
        '-f', `description=${status.description}`,
      ]);
      console.log(`  статус опубликован: ${REVIEW_STATUS_CONTEXT}=${status.state} на ${String(headSha).slice(0, 8)}`);
    } catch (e) {
      console.error(`  ⚠ статус не опубликован (${String(e.message ?? e).split('\n')[0]}) — вердикт выше в силе, но защита его не увидит`);
      return 2;
    }
  }

  if (decision.state === 'pass') return 0;
  if (decision.state === 'block') return 1;
  return 3;
}

if (process.argv[1]?.endsWith('review-gate.mjs')) process.exit(main());
