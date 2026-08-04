#!/usr/bin/env node
/**
 * yarn archivarius:push — тракт scan → extract → ingest ОДНОЙ цепочкой
 * (спринт archivarius-live-wiring, блок 2; закрывает дефекты archivarius-evening-tract:
 * три глагола перестают быть независимыми точками входа — каждый шаг читает выход
 * предыдущего, транскрипты в stdout не печатаются никогда).
 *
 *   yarn archivarius:push                       # дефолтный источник: транскрипты Claude первичного дерева
 *   yarn archivarius:push --from ~/.codex/sessions --from ~/.claude/projects
 *   yarn archivarius:push --dry-run             # без сети: только scan+extract и отчёт
 *   yarn archivarius:push --batch 2000 --base https://office.mmbrn.tech
 *
 * `--from` ЗАМЕНЯЕТ дефолт, не дополняет его (правка Веснина: скрытых входов нет —
 * источники видны в вызове целиком). Дефолт работает только при нуле `--from`.
 *
 * Шаги:
 *   scan    — инвентарь .jsonl по источникам (файлы, не содержимое);
 *   extract — по списку scan: ingestJsonlText (резак секретов уже в пути, maskedCuts
 *             без значений); bytes живут только в теле POST;
 *   ingest  — POST /v1/archivarius/ingest батчами (потолок API 10000), заголовок
 *             x-membrana-token, транзиентные отказы office — до 3 повторов с бэкофом.
 *
 * Exit: 0 — отчёт честный (все батчи приняты либо --dry-run); 1 — отказ office после
 * повторов; 2 — вход/окружение (нет токена, источник не найден).
 */
import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';

import { batchSpans, buildPushReport, ingestJsonlText, sessionIdFromRolloutName, withRetry } from './lib/archivarius.mjs';
import { resolveOfficeToken } from './lib/office-token.mjs';
import { collectJsonlFiles, expandHome } from './archivarius.mjs';
import { defaultTranscriptsDir } from './session-scan.mjs';

/** Шаг scan: источники → отсортированный список .jsonl (выход шага — вход extract). */
export async function scanStep(sources) {
  const files = [];
  for (const source of sources) {
    files.push(...(await collectJsonlFiles(source)));
  }
  return [...new Set(files)].sort();
}

/** Шаг extract: список файлов из scan → спаны с маской (выход шага — вход ingest). */
export function extractStep(files, { readFile = (p) => readFileSync(p, 'utf8') } = {}) {
  const spans = [];
  let maskedLines = 0;
  for (const p of files) {
    const text = readFile(p);
    const base = basename(p, extname(p));
    const defaultSessionId = sessionIdFromRolloutName(base) ?? base;
    const result = ingestJsonlText(text, { sourcePath: p.replaceAll('\\', '/'), defaultSessionId });
    spans.push(...result.spans);
    maskedLines += result.summary.maskedLines;
  }
  return { spans, maskedLines };
}

/**
 * Шаг ingest: спаны из extract → office батчами. Возвращает счёт принятого.
 * HTTP 413 (тело больше лимита сервера — счёт спанов не равен счёту байтов: реплики
 * разной длины, находка живого прогона 04.08) лечится ДЕЛЕНИЕМ батча пополам
 * рекурсивно; одиночный спан с 413 — честный отказ, не бесконечное деление.
 */
export async function ingestStep(spans, { baseUrl, token, batchSize, fetchImpl = fetch, sleep, log = () => {} }) {
  const base = baseUrl.replace(/\/+$/u, '');
  const state = { sent: 0, accepted: 0 };

  async function postOnce(batch, label) {
    const res = await fetchImpl(`${base}/v1/archivarius/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-membrana-token': token },
      body: JSON.stringify({ spans: batch }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      const err = new Error(`office HTTP ${res.status} на батче ${label}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  async function pushBatch(batch, label) {
    try {
      const body = await withRetry(() => postOnce(batch, label), {
        attempts: 3,
        sleep,
        // 413 детерминирован размером тела — повторять его без деления бессмысленно.
        shouldRetry: (error) => error?.status !== 413,
      });
      state.sent += 1;
      state.accepted += Number(body?.accepted ?? 0);
      log(`archivarius:push — батч ${label} (${batch.length} spans): принято ${body?.accepted ?? '?'}`);
    } catch (error) {
      if (error?.status === 413 && batch.length > 1) {
        const mid = Math.ceil(batch.length / 2);
        log(`archivarius:push — батч ${label}: 413, делю ${batch.length} → ${mid}+${batch.length - mid}`);
        await pushBatch(batch.slice(0, mid), `${label}a`);
        await pushBatch(batch.slice(mid), `${label}b`);
        return;
      }
      throw error;
    }
  }

  const batches = batchSpans(spans, batchSize);
  for (const [i, batch] of batches.entries()) {
    await pushBatch(batch, `${i + 1}/${batches.length}`);
  }
  return { batches: state.sent, accepted: state.accepted };
}

/** Тракт целиком — композиция трёх шагов; каждый читает выход предыдущего. */
export async function runTract({ sources, batchSize, dryRun, baseUrl, token, fetchImpl, sleep, log = () => {}, readFile }) {
  const files = await scanStep(sources);
  log(`archivarius:push — scan: файлов ${files.length} (источников ${sources.length})`);
  const { spans, maskedLines } = extractStep(files, readFile ? { readFile } : {});
  log(`archivarius:push — extract: spans ${spans.length} · замаскировано ${maskedLines}`);
  if (dryRun) {
    return buildPushReport({ files: files.length, spans: spans.length, maskedLines, batches: 0, accepted: 0, dryRun: true });
  }
  const { batches, accepted } = await ingestStep(spans, { baseUrl, token, batchSize, fetchImpl, sleep, log });
  return buildPushReport({ files: files.length, spans: spans.length, maskedLines, batches, accepted, dryRun: false });
}

function parseArgs(argv) {
  const out = { from: [], batch: 2000, dryRun: false, base: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--from') out.from.push(argv[++i]);
    else if (a === '--batch') out.batch = Number(argv[++i]);
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--base') out.base = argv[++i];
    else throw new Error(`archivarius:push — неизвестный аргумент «${a}»`);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sources = args.from.length
    ? args.from.map((p) => expandHome(p))
    : [defaultTranscriptsDir()].filter(Boolean);
  if (sources.length === 0) {
    console.error('archivarius:push — источник не найден: дефолтный каталог транскриптов не резолвится, задай --from');
    return 2;
  }
  let token = null;
  if (!args.dryRun) {
    const resolved = resolveOfficeToken(process.env);
    token = resolved.token;
    if (!token) {
      console.error('archivarius:push — нет OFFICE_API_TOKEN (ни в env, ни в .env соседних worktree); --dry-run работает без токена');
      return 2;
    }
  }
  const report = await runTract({
    sources,
    batchSize: args.batch,
    dryRun: args.dryRun,
    baseUrl: args.base ?? process.env.OFFICE_BASE_URL?.trim() ?? 'https://office.mmbrn.tech',
    token,
    log: (line) => console.error(line),
  });
  console.log(JSON.stringify(report));
  return 0;
}

if (process.argv[1]?.endsWith('archivarius-push.mjs')) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(`archivarius:push — отказ: ${error.message}`);
      process.exit(1);
    },
  );
}
