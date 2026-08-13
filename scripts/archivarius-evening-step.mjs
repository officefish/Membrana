#!/usr/bin/env node
/**
 * archivarius-evening-step — шаг вечерней цепочки: сессии ДНЯ едут в архив office сами
 * (спринт archivarius-evening-step, блок e1; фаза эпика #1330, магистраль 13.08).
 *
 * Композиция существующего тракта scan → extract → ingest (archivarius-push.mjs),
 * НЕ второй тракт. Отличия вечернего шага от полного push:
 *   - фильтр дня: в extract идут только файлы с mtime не старше начала дня —
 *     mtime единственный источник (имена транскриптов — uuid, дат не несут);
 *   - health-предполёт office ДО extract: мёртвый office узнаётся за секунды,
 *     а не после чтения корпуса;
 *   - отчёт — РОВНО одна строка счётчиков (контракт трёх инвариантов, ревью
 *     Веснина 13.08): тела строк транскриптов в stdout не попадают никогда.
 *
 * Словарь исходов (закрыт контрактом): ok | office-unreachable | empty-day.
 * Различение «сеть умерла / ключа нет / ключ отвергнут» живёт в detail скипа,
 * не в словаре (ратифицированный словарь не расширяется молча; разбор Дынина 13.08).
 * partial НЕ существует как молчаливый исход: отказ батча после ретраев — throw
 * (exit 1), а строка счётчиков несёт spans И accepted — расхождение видно глазом.
 *
 * Exit (тотальная функция от исхода, держится тестом-таблицей):
 *   0 — ok | empty-day; 3 — office-unreachable (находка для findingExitCodes
 *   вечернего манифеста, не поломка); 1 — настоящая ошибка; 2 — вход/окружение.
 */
import { statSync } from 'node:fs';

import { buildPushReport } from './lib/archivarius.mjs';
import { resolveOfficeToken } from './lib/office-token.mjs';
import { extractStep, ingestStep, scanStep } from './archivarius-push.mjs';
import { expandHome } from './archivarius.mjs';
import { defaultTranscriptsDir } from './session-scan.mjs';

/** Закрытый словарь исходов шага — контракт трёх инвариантов, не расширять молча. */
export const OUTCOMES = Object.freeze(['ok', 'office-unreachable', 'empty-day']);

/** outcome → exit: тотальная таблица; изменение — только вместе с манифестом вечера. */
export const OUTCOME_EXIT = Object.freeze({
  ok: 0,
  'empty-day': 0,
  'office-unreachable': 3,
});

/** Начало дня для инъецированного «сейчас» — границы дня считает вызывающий тест/цепочка. */
export function startOfDay(now) {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day;
}

/**
 * Фильтр дня: остаются файлы с mtime >= since. Нечитаемый stat — файл выпал
 * (гонка с ротацией логов не валит вечер), это не находка.
 */
export function filterFreshFiles(files, { statImpl = statSync, since }) {
  const sinceMs = since.getTime();
  return files.filter((path) => {
    try {
      return statImpl(path).mtimeMs >= sinceMs;
    } catch {
      return false;
    }
  });
}

/** Контрактная строка отчёта — ровно одна, только счётчики (снапшот-тест держит форму). */
export function buildEveningLine(report) {
  return `archivarius-evening: files=${report.files} spans=${report.spans} maskedLines=${report.maskedLines} accepted=${report.accepted}`;
}

/** Контрактная строка скипа — исход назван, причина в скобках, тел строк нет. */
export function buildSkipLine(outcome, detail) {
  return `archivarius-evening: skip outcome=${outcome} (${detail})`;
}

/** Health-предполёт: office отвечает — иначе office-unreachable с причиной. */
export async function checkOfficeHealth({ baseUrl, fetchImpl = fetch, timeoutMs = 5000 }) {
  const base = String(baseUrl ?? '').replace(/\/+$/u, '');
  try {
    const res = await fetchImpl(`${base}/health`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { ok: false, detail: `office HTTP ${res.status}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, detail: `сеть: ${error?.message ?? 'недоступна'}` };
  }
}

/**
 * Вечерний шаг целиком. Все внешние зависимости инъецируемы (время, fs, сеть) —
 * тест зелёный тем же путём, каким прод честный (разбор Дынина: недетерминизм
 * входа — риск №1).
 *
 * @returns {{outcome: string, report?: object, detail?: string}}
 */
export async function runEveningStep({
  now,
  sources,
  baseUrl,
  token,
  batchSize = 2000,
  fetchImpl = fetch,
  sleep,
  statImpl = statSync,
  readFile,
  log = () => {},
}) {
  if (!(now instanceof Date)) throw new Error('archivarius-evening: now обязан приходить инъекцией (Date)');
  const scanned = await scanStep(sources);
  const files = filterFreshFiles(scanned, { statImpl, since: startOfDay(now) });
  log(`archivarius-evening — scan: всего ${scanned.length}, свежих за день ${files.length}`);
  if (files.length === 0) {
    return {
      outcome: 'empty-day',
      report: buildPushReport({ files: 0, spans: 0, maskedLines: 0, batches: 0, accepted: 0, dryRun: false }),
    };
  }
  if (!token) {
    return { outcome: 'office-unreachable', detail: 'нет OFFICE_API_TOKEN — push невозможен' };
  }
  const health = await checkOfficeHealth({ baseUrl, fetchImpl });
  if (!health.ok) {
    return { outcome: 'office-unreachable', detail: health.detail };
  }
  const { spans, maskedLines } = extractStep(files, readFile ? { readFile } : {});
  log(`archivarius-evening — extract: spans ${spans.length} · замаскировано ${maskedLines}`);
  const { batches, accepted } = await ingestStep(spans, { baseUrl, token, batchSize, fetchImpl, sleep, log });
  return {
    outcome: 'ok',
    report: buildPushReport({ files: files.length, spans: spans.length, maskedLines, batches, accepted, dryRun: false }),
  };
}

function parseArgs(argv) {
  const out = { from: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--from') out.from.push(argv[++i]);
    else throw new Error(`archivarius-evening — неизвестный аргумент «${a}»`);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sources = args.from.length
    ? args.from.map((p) => expandHome(p))
    : [defaultTranscriptsDir()].filter(Boolean);
  if (sources.length === 0) {
    console.error('archivarius-evening — источник не найден: дефолтный каталог транскриптов не резолвится, задай --from');
    return 2;
  }
  const { token } = resolveOfficeToken(process.env);
  const result = await runEveningStep({
    now: new Date(),
    sources,
    baseUrl: process.env.OFFICE_BASE_URL?.trim() || 'https://office.mmbrn.tech',
    token,
    log: (line) => console.error(line),
  });
  if (result.outcome === 'office-unreachable') {
    console.log(buildSkipLine(result.outcome, result.detail));
  } else {
    console.log(buildEveningLine(result.report));
  }
  return OUTCOME_EXIT[result.outcome];
}

if (process.argv[1]?.endsWith('archivarius-evening-step.mjs')) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`archivarius-evening — отказ: ${error.message}`);
      process.exit(1);
    },
  );
}
