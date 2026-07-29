#!/usr/bin/env node
/**
 * Штампы свежести холодного старта — SessionStart-хук (#1416 Ф0).
 *
 * Печатает в stdout компактный русский блок: даты/SHA локального дерева, дата
 * локального docs/HANDOFF.md, после `git fetch origin` — дата tip origin/main и
 * дата origin/main:docs/HANDOFF.md, и крупно «ДЫРА N дней», если локальное дерево
 * отстало. stdout SessionStart-хука вгружается в контекст ДО первой реплики
 * агента — штампы приходят тем же push-каналом, каким приходила устаревшая
 * картина (прецедент 2026-07-29-greeting-stale-picture-from-memory-cache).
 *
 * Контракт: детерминированный чистый git+fs, НОЛЬ LLM-вызовов. Сеть может
 * отсутствовать: fetch под таймаутом, сбой → graceful-фолбэк «offline — штампы
 * только локальные» (сессия работоспособна, но предупреждена, что origin не
 * сверен). Хук исполняется харнесом — гейт приветствия (ноль команд до слова
 * капитана, норма 22.07) НЕ нарушается.
 *
 * Чистые расчёты (isoDay/parseHandoffHeaderDate/gapDays/pickFreshnessGap) — в
 * lib/freshness.mjs, здесь IO + рендер. IO инъектируется в collectStamps ради
 * тестов без git/сети.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { isoDay, parseHandoffHeaderDate, pickFreshnessGap, ruDays } from './lib/freshness.mjs';

export { ruDays }; // склонение живёт в lib/freshness.mjs; ре-экспорт — стабильный публичный интерфейс скрипта

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const HANDOFF_REL = 'docs/HANDOFF.md';
const FETCH_TIMEOUT_MS = 15_000; // сеть может висеть (ТСПУ/офлайн) — не держим старт сессии

const NA = 'н/д';

// ─── чистые помощники (экспорт для теста) ────────────────────────────────────────

/** `%h|%cI` одной строки git log → { sha, day } либо null. */
export function parseTipLine(line) {
  const m = String(line ?? '').trim().match(/^(\S+)\|(\S+)$/);
  if (!m) return null;
  const day = isoDay(m[2]);
  return day ? { sha: m[1], day } : null;
}

// ─── сбор состояния (IO инъектируемый) ───────────────────────────────────────────

function defaultRun(cmd, args, { timeoutMs } = {}) {
  try {
    return execFileSync(cmd, args, {
      encoding: 'utf8',
      cwd: REPO_ROOT,
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function defaultReadFile(rel) {
  try {
    return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
  } catch {
    return null;
  }
}

function defaultMtimeDay(rel) {
  try {
    return isoDay(statSync(path.join(REPO_ROOT, rel)).mtime.toISOString());
  } catch {
    return null;
  }
}

/**
 * Полный сбор штампов. IO инъектируется: run/readFile/mtimeDay.
 * @returns state для renderStamps (чистого).
 */
export function collectStamps({
  run = defaultRun,
  readFile = defaultReadFile,
  mtimeDay = defaultMtimeDay,
} = {}) {
  const localTip = parseTipLine(run('git', ['log', '-1', '--format=%h|%cI', 'HEAD']));
  const branch = (run('git', ['branch', '--show-current']) || '').trim() || null;

  const localHandoffMd = readFile(HANDOFF_REL);
  const headerDate = parseHandoffHeaderDate(localHandoffMd);
  const localHandoff =
    localHandoffMd == null
      ? null
      : headerDate
        ? { date: headerDate, source: 'из заголовка' }
        : { date: mtimeDay(HANDOFF_REL), source: 'по mtime' };

  const fetched = run('git', ['fetch', 'origin', '--quiet'], { timeoutMs: FETCH_TIMEOUT_MS }) != null;

  let originTip = null;
  let originHandoffDate = null;
  if (fetched) {
    originTip = parseTipLine(run('git', ['log', '-1', '--format=%h|%cI', 'origin/main']));
    originHandoffDate = parseHandoffHeaderDate(run('git', ['show', `origin/main:${HANDOFF_REL}`]));
  }

  const gap = fetched
    ? pickFreshnessGap({
        localHandoffDate: localHandoff?.date ?? null,
        originHandoffDate,
        localTipDay: localTip?.day ?? null,
        originTipDay: originTip?.day ?? null,
      })
    : null;

  return { localTip, branch, localHandoff, fetched, originTip, originHandoffDate, gap };
}

// ─── чистый рендер ───────────────────────────────────────────────────────────────

/** @returns {string} компактный русский блок штампов. Чистая функция от state. */
export function renderStamps(state) {
  const L = [];
  L.push('❄ ХОЛОДНЫЙ СТАРТ — штампы свежести (#1416 Ф0)');

  const tip = state.localTip
    ? `tip \`${state.localTip.sha}\` от ${state.localTip.day}` + (state.branch ? `, ветка \`${state.branch}\`` : '')
    : `${NA} (не git-дерево?)`;
  L.push(`- локальное дерево: ${tip}`);

  L.push(
    state.localHandoff
      ? `- локальный ${HANDOFF_REL}: ${state.localHandoff.date ?? NA} (${state.localHandoff.source})`
      : `- локальный ${HANDOFF_REL}: ${NA} (файла нет)`,
  );

  if (!state.fetched) {
    L.push('- ⚠ offline: git fetch origin не прошёл — штампы только локальные, свежесть origin/main НЕ сверена');
  } else {
    L.push(
      state.originTip
        ? `- origin/main: tip \`${state.originTip.sha}\` от ${state.originTip.day}`
        : `- origin/main: ${NA}`,
    );
    L.push(`- origin/main:${HANDOFF_REL}: ${state.originHandoffDate ?? NA}`);

    if (state.gap == null) {
      L.push(`- свежесть: ${NA} — дат для сравнения не хватает`);
    } else if (state.gap.days >= 1) {
      const basis = state.gap.basis === 'handoff' ? 'по датам HANDOFF' : 'по датам tip-коммитов';
      L.push(
        `- ⚠ ДЫРА ${ruDays(state.gap.days)}: локальное дерево отстало от origin/main (${basis}) — ` +
          `первым делом читать origin/main:${HANDOFF_REL}`,
      );
    } else {
      L.push('- свежесть: дыры нет, локальное дерево на уровне origin/main');
    }
  }

  L.push('Правило (прецедент 29.07): «сегодня/вчера/намечено» — только со штампом даты источника и после сверки выше.');
  return L.join('\n');
}

// ─── CLI ─────────────────────────────────────────────────────────────────────────

function main() {
  console.log(renderStamps(collectStamps()));
}

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
