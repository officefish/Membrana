#!/usr/bin/env node
/**
 * yarn review:gate — шип-гейт: проверить ревью-вердикт тимлида по HEAD SHA и
 * опубликовать его как commit status `review/teamlead` (карточка ship-review-tooth
 * #924; слово владельца 29.07: весь код в main — через ревью тимлида, BLOCK — стоп).
 *
 *   yarn review:gate [--pr N] [--publish] [--ensure]
 *     без --pr        — PR текущей ветки (номер даёт gh)
 *     --publish       — записать commit status в GitHub (иначе только вердикт в stdout)
 *     --ensure        — исход unknown: прогнать ревью один раз и перечитать вердикт
 *                       (BLOCK не переспрашивается; вердикт по-прежнему выносит ревьюер)
 *
 * Читает docs/discussions/pr-<N>-code-review.md, ищет маркер вердикта и сверяет его
 * SHA с HEAD ветки. Три исхода: pass · block · unknown (ревью не прогонялось — НЕ pass).
 * Громкий обход: REVIEW_GATE_OVERRIDE=1 + REVIEW_GATE_OVERRIDE_REASON="…".
 *
 * Exit: 0 — pass; 1 — block; 3 — unknown (прогнать ревью); 2 — инструментальная.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { EXTERNAL_CALL_TIMEOUT_MS } from './lib/merge-fact.mjs';
import { verdictFromBody } from './lib/code-review-ritual.mjs';
import {
  REVIEW_STATUS_CONTEXT,
  parseVerdict,
  publishReviewStatus,
  renderVerdictMarker,
  reviewGateDecision,
  scopeFromBody,
  shouldEnsureReview,
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

/**
 * Синхронная пауза между попытками. Гейт весь синхронный (`execFileSync`), и заводить здесь
 * `async` ради двух секунд значило бы перекрасить весь путь ради паузы.
 * @param {number} ms
 */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function main() {
  let pr = flag('pr');
  if (!pr) {
    try {
      pr = String(JSON.parse(sh('gh', ['pr', 'view', '--json', 'number'])).number);
    } catch {
      console.error('review:gate — номер PR не определился (gh недоступен) — повтори с --pr <N>');
      return 2;
    }
  }

  // SHA берём У САМОГО PR, а не из локального HEAD: проверяя чужой PR, стоишь на своей
  // ветке — локальный HEAD дал бы вердикт «протух» для любого чужого ревью и «pass»
  // для собственной ветки без всякой связи с PR. Находка первого массового прогона 29.07.
  let headSha = null;
  try {
    headSha = JSON.parse(sh('gh', ['pr', 'view', String(pr), '--json', 'headRefOid'])).headRefOid ?? null;
  } catch {
    try {
      headSha = sh('git', ['rev-parse', 'HEAD']); // офлайн-путь: только для PR текущей ветки
      console.error('  ⚠ голова PR не прочиталась через gh — взят локальный HEAD (верно лишь для PR текущей ветки)');
    } catch {
      /* решение примет ядро: без SHA — unknown */
    }
  }

  const reviewPath = join(repoRoot, `docs/discussions/pr-${pr}-code-review.md`);
  let md = existsSync(reviewPath) ? readFileSync(reviewPath, 'utf8') : '';

  // --restamp: пересчитать вердикт по УЖЕ полученному телу ревью, не гоняя LLM заново.
  // Нужен, когда починили извлечение вердикта (29.07: «не BLOCK» в теле читалось как
  // BLOCK) — тело ведущего неприкосновенно, меняется только машинное чтение.
  if (argv.includes('--restamp') && md) {
    const verdict = verdictFromBody(md.replace(/<!--[\s\S]*?-->/gu, ''));
    const stripped = md.replace(/<!--\s*review-verdict[\s\S]*?-->\n?\n?/u, '');
    md = `${renderVerdictMarker({ sha: headSha, verdict, lead: parseVerdict(md)?.lead ?? null })}\n\n${stripped}`;
    writeFileSync(reviewPath, md, 'utf8');
    console.log(`  маркер пересчитан по телу ревью: ${verdict} на ${String(headSha).slice(0, 8)}`);
  }
  const override = {
    enabled: process.env.REVIEW_GATE_OVERRIDE === '1',
    reason: process.env.REVIEW_GATE_OVERRIDE_REASON,
  };
  // Признак артефакта — от скрипта: ядро в ФС не ходит, а «файла нет» и «файл есть без
  // маркера» лечатся по-разному (блок e1 спринта review-honesty).
  const artifactOf = () => ({ exists: existsSync(reviewPath), path: `docs/discussions/pr-${pr}-code-review.md` });
  let decision = reviewGateDecision({ headSha, verdict: parseVerdict(md), override, scope: scopeFromBody(md), artifact: artifactOf() });

  // --ensure (#1465 Ф2): «ревью не прогонялось» — не повод останавливать шип и звать
  // человека переставить две команды руками. Последовательность gate → code-review:pr →
  // pr:ship --merge-only повторялась 29.07 дважды знак в знак (PR #1461, #1464).
  //
  // Гейт при этом НЕ ослабляется: прогоняется ровно тот же ревьюер, вердикт выносит он,
  // и повтор ровно один — если после прогона вердикта всё ещё нет, исход остаётся unknown.
  // BLOCK не трогаем никогда: он и был вердиктом, переспрашивать нечего.
  if (shouldEnsureReview(decision.state, argv.includes('--ensure'))) {
    console.log(`  --ensure: ревью не найдено — прогоняю code-review:pr ${pr}`);
    try {
      execFileSync('node', [join(repoRoot, 'scripts/code-review.mjs'), '--pr', String(pr)], {
        cwd: repoRoot,
        stdio: 'inherit',
        timeout: EXTERNAL_CALL_TIMEOUT_MS * 10,
      });
    } catch (e) {
      console.error(`  ⚠ ревью не отработало (${String(e.message ?? e).split('\n')[0]}) — вердикта нет, гейт остаётся закрытым`);
    }
    md = existsSync(reviewPath) ? readFileSync(reviewPath, 'utf8') : '';
    decision = reviewGateDecision({ headSha, verdict: parseVerdict(md), override, scope: scopeFromBody(md), artifact: artifactOf() });
  }

  const mark = decision.state === 'pass' ? '✓' : decision.state === 'block' ? '✗' : '?';
  console.log(`review:gate — PR #${pr} · ${mark} ${decision.state}: ${decision.reason}`);

  if (argv.includes('--publish')) {
    const status = statusFromDecision(decision);
    const published = publishReviewStatus({ run: sh, sleep: sleepSync, headSha, status });
    if (published.ok) {
      const retried = published.attempt > 1 ? ` (с ${published.attempt}-й попытки)` : '';
      console.log(
        `  статус опубликован: ${REVIEW_STATUS_CONTEXT}=${status.state} на ${String(headSha).slice(0, 8)}${retried}`,
      );
    } else {
      console.error(
        `  ⚠ статус не опубликован за ${published.attempts} попыт. (${published.lastError})` +
          ' — вердикт выше в силе, но защита его не увидит',
      );
      return 2;
    }
  }

  if (decision.state === 'pass') return 0;
  if (decision.state === 'block') return 1;
  return 3;
}

if (process.argv[1]?.endsWith('review-gate.mjs')) process.exit(main());
