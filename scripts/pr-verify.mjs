#!/usr/bin/env node
/**
 * pr:verify — ассерт, что PR ДЕЙСТВИТЕЛЬНО смёржен (agent-tooling-friction-5 · #1166).
 *
 * #1320: факт мерджа устанавливается по origin/<base> — git fetch + поиск коммита,
 * приземлившего PR (сквош «(#N)» / merge-коммит). gh — ВСПОМОГАТЕЛЬНЫЙ источник
 * (номер PR текущей ветки, mergeCommit как кандидат для сверки с графом), не решающий:
 * вещдок 27.07 — gh через прокси отдавал merged true/false вперемешку и фантомные SHA.
 *
 * Проверяет: коммит PR в origin/<base> [∧ файл присутствует в origin/<base>].
 *
 *   yarn pr:verify [N] [--file <path>] [--base main]
 *   yarn pr:verify N --wait [--timeout-min 10] [--interval-sec 20]
 *   Без номера — PR текущей ветки (номер даёт gh; без gh и номера — честный отказ).
 *
 * --wait — «дождаться приземления»: цикл до git-факта в origin/<base>; merged-событие
 * таймлайна (REST) — вспомогательный сигнал «сервер слил, реплика отстаёт», НЕ успех.
 * Без --wait при разногласии (сервер говорит merged, графа нет) — до 3 повторных
 * замеров с паузой 5 с (реплики за прокси отстают на минуты, 27.07).
 *
 * Exit: 0 — подтверждено графом; 1 — НЕ смёржен / файла нет; 3 — --wait истёк;
 * 4 — установить нельзя (origin не обновился и графом не подтверждается / номера нет).
 */
import { execFileSync } from 'node:child_process';

import {
  EXTERNAL_CALL_TIMEOUT_MS,
  assessMergeFact,
  fetchBase,
  findPrCommitInBase,
  mergedEventSeen,
  shaInBase,
} from './lib/merge-fact.mjs';

/**
 * Дополнительный ассерт файла — поверх факта мерджа.
 * @param {{ verdict: string, file?: string|null, fileInBase?: boolean|null, base?: string }} facts
 * @returns {string[]} причины отказа по файлу (пусто — ок или файл не запрашивался)
 */
export function fileReasons(facts = {}) {
  if (!facts.file) return [];
  if (facts.fileInBase === true) return [];
  if (facts.fileInBase === false) return [`файл «${facts.file}» НЕ найден в origin/${facts.base ?? 'main'}`];
  return [`не удалось проверить файл «${facts.file}»`];
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  const o = { pr: null, file: null, base: 'main', wait: false, timeoutMin: 10, intervalSec: 20 };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--file') o.file = argv[(i += 1)];
    else if (a === '--base') o.base = argv[(i += 1)];
    else if (a === '--wait') o.wait = true;
    else if (a === '--timeout-min') o.timeoutMin = Number(argv[(i += 1)]);
    else if (a === '--interval-sec') o.intervalSec = Number(argv[(i += 1)]);
    else if (/^\d+$/u.test(a)) o.pr = a;
  }
  return o;
}

/** gh — вспомогательный: номер PR текущей ветки + кандидат mergeCommit. Может не отработать. */
function ghPrJsonAux(pr) {
  const args = ['pr', 'view', '--json', 'number,state,mergeCommit'];
  if (pr) args.splice(2, 0, pr);
  try {
    const raw = execFileSync('gh', args, { encoding: 'utf8', timeout: EXTERNAL_CALL_TIMEOUT_MS });
    const p = JSON.parse(raw);
    return { number: p.number ?? null, state: p.state ?? null, mergeCommit: p.mergeCommit?.oid ?? null };
  } catch (e) {
    return { number: null, state: null, mergeCommit: null, error: String(e.message ?? e).split('\n')[0] };
  }
}

function fileInBase(file, base) {
  try {
    execFileSync('git', ['cat-file', '-e', `origin/${base}:${file}`], { stdio: ['ignore', 'ignore', 'ignore'], timeout: EXTERNAL_CALL_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

function sleepSync(ms) {
  const sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, ms);
}

/** Один замер факта. @returns {{verdict: string, reasons: string[]}} */
function measure(prNumber, base, gh) {
  const fetchOk = fetchBase(base);
  return assessMergeFact({
    prNumber,
    base,
    fetchOk,
    commitInBase: prNumber != null ? findPrCommitInBase(prNumber, base) : null,
    ghState: gh.state,
    ghMergeCommit: gh.mergeCommit,
    ghShaInBase: gh.mergeCommit ? shaInBase(gh.mergeCommit, base) : false,
  });
}

export function main(argv = process.argv) {
  const { pr, file, base, wait, timeoutMin, intervalSec } = parseArgs(argv);
  const gh = ghPrJsonAux(pr);
  const prNumber = pr ?? gh.number;
  if (prNumber == null && !gh.mergeCommit) {
    console.error(
      `pr:verify: номер PR неизвестен (gh не отработал${gh.error ? `: ${gh.error}` : ''}) — ` +
        'факт по origin не установить. Повтори с явным номером: yarn pr:verify <N>',
    );
    return 4;
  }
  const label = prNumber != null ? `PR #${prNumber}` : 'PR текущей ветки';

  let { verdict, reasons } = measure(prNumber, base, gh);

  // Реплика могла отстать (27.07: лаг до минут; gh/таймлайн говорят «слито», git ещё нет).
  // Разовый режим: при разногласии — до 3 повторных замеров с паузой 5 с, потом честный ✗.
  // --wait: ждём до дедлайна; серверное подтверждение (merged-событие таймлайна) — повод
  // продолжать ждать git-факт, а не повод объявить успех: решает граф.
  if (verdict !== 'merged') {
    const serverSaysMerged = () => mergedEventSeen(prNumber) === true || String(gh.state).toUpperCase() === 'MERGED';
    if (wait) {
      const deadline = Date.now() + (Number.isFinite(timeoutMin) ? timeoutMin : 10) * 60_000;
      const interval = (Number.isFinite(intervalSec) ? intervalSec : 20) * 1000;
      while (verdict !== 'merged' && Date.now() < deadline) {
        const srv = mergedEventSeen(prNumber);
        console.error(
          `pr:verify --wait: ${label} ещё не в origin/${base}` +
            `${srv === true ? ' (сервер подтвердил мердж — жду реплику)' : srv === false ? ' (merged-события нет — вероятно, CI/автослияние ещё идут)' : ''}`,
        );
        sleepSync(interval);
        ({ verdict, reasons } = measure(prNumber, base, gh));
      }
      if (verdict !== 'merged') {
        console.error(`pr:verify --wait: ✗ ${label} не подтвердился за ${timeoutMin} мин:\n  - ${reasons.join('\n  - ')}`);
        return 3;
      }
    } else if (serverSaysMerged()) {
      for (let i = 0; i < 3 && verdict !== 'merged'; i += 1) {
        sleepSync(5000);
        ({ verdict, reasons } = measure(prNumber, base, gh));
      }
    }
  }

  const fReasons = verdict === 'merged' ? fileReasons({ verdict, file, base, fileInBase: file ? fileInBase(file, base) : null }) : [];
  if (verdict === 'merged' && fReasons.length === 0) {
    console.log(`pr:verify: ✓ ${label} СМЁРЖЕН — ${reasons[0]}${file ? `; файл в origin/${base}` : ''}`);
    return 0;
  }
  const all = [...reasons, ...fReasons];
  console.error(`pr:verify: ✗ ${label} НЕ подтверждён смёрженным:\n  - ${all.join('\n  - ')}`);
  if (verdict === 'unknown') return 4;
  return 1;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('pr-verify.mjs')) {
  process.exit(main());
}
