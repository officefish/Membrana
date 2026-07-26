#!/usr/bin/env node
// Резак секретов (#1240, веха горизонта `secret-parser-built`).
//
// Сканер `night-triage-secret-scan.mjs` — блокирующий гейт: находит и останавливает.
// Для бэкапа сессий нужен не отказ, а вычищенная копия (кристалл
// `session-backup-requires-secret-redaction`). Правила — те же, ядро — чистое:
// scripts/lib/secret-redact.mjs.
//
// Usage:
//   node scripts/secret-redact.mjs --redact <in> [--out <copy>] [--manifest <md>] [--dry-run]
//   yarn secret:redact --redact <in> --dry-run          # ничего не пишет, только манифест
//
// ВХОД НИКОГДА НЕ ПЕРЕЗАПИСЫВАЕТСЯ: при ошибке реза оригинал был бы утрачен, а
// восстановить сессию неоткуда. Совпадение --out со входом — отказ, не «умный» суффикс.
//
// Дата прохода приходит параметром `--date` и по умолчанию берётся у системных часов
// ТОЛЬКО для черновиков: датированный проход архива назначает владелец
// (кристалл `archive-cleanup-rotate-then-single-dated-pass`: сначала ротация ключей,
// затем ОДИН датированный проход, после даты правка архива запрещена навсегда).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  formatRotationManifest,
  redactJsonSensitiveValues,
  redactSecrets,
} from './lib/secret-redact.mjs';

/**
 * @param {string[]} argv
 * @returns {{ input: string | null; out: string | null; manifest: string | null; dryRun: boolean; date: string | null; help: boolean }}
 */
export function parseRedactCli(argv) {
  const o = { input: null, out: null, manifest: null, dryRun: false, date: null, help: false };
  /**
   * Ключ без значения — явная ошибка, а не молчаливый `undefined`: иначе `--redact`
   * последним аргументом давал бы «нет входа» вместо «у --redact нет значения»
   * (замечание ревью, P2 — диагностика).
   * @param {number} i @param {string} flag
   */
  const valueAt = (i, flag) => {
    const v = argv[i];
    if (v === undefined || v.startsWith('-')) throw new Error(`secret:redact: ключ ${flag} требует значение`);
    return v;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--redact' || a === '--in') o.input = valueAt(++i, a);
    else if (a === '--out') o.out = valueAt(++i, a);
    else if (a === '--manifest') o.manifest = valueAt(++i, a);
    else if (a === '--date') o.date = valueAt(++i, a);
    else if (a === '--dry-run') o.dryRun = true;
    else if (!a.startsWith('-') && o.input == null) o.input = a;
    else throw new Error(`secret:redact: неизвестный аргумент «${a}»`);
  }
  return o;
}

/**
 * Куда писать копию. Дефолт — `<in>.redacted` рядом со входом; in-place запрещён.
 *
 * @param {{ input: string; out: string | null; cwd?: string }} opts
 * @returns {string}
 */
export function resolveRedactOutputPath(opts) {
  const cwd = opts.cwd ?? process.cwd();
  const input = resolve(cwd, opts.input);
  const out = resolve(cwd, opts.out ?? `${opts.input}.redacted`);
  if (out === input) {
    throw new Error('secret:redact: --out совпадает со входом — рез никогда не пишет поверх оригинала');
  }
  return out;
}

function printHelp() {
  console.log(
    [
      'secret:redact — вырезание секретов в КОПИЮ (веха secret-parser-built)',
      '',
      '  node scripts/secret-redact.mjs --redact <in> [--out <copy>] [--manifest <md>] [--date YYYY-MM-DD] [--dry-run]',
      '',
      '  --dry-run   ничего не пишет: только манифест «что было бы вырезано»',
      '  --manifest  markdown-манифест «что тронуто» (без значений)',
      '',
      'Вход не перезаписывается никогда. JSON режется и по чувствительным ключам.',
    ].join('\n'),
  );
}

function main() {
  let cli;
  try {
    cli = parseRedactCli(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    printHelp();
    process.exitCode = 1;
    return;
  }

  if (cli.help || !cli.input) {
    printHelp();
    process.exitCode = cli.help ? 0 : 1;
    return;
  }

  // Отказ по пути — ДО чтения и любой работы: сначала убедиться, что писать есть куда,
  // потом читать секреты в память. Иначе манифест уже напечатан, а рез невозможен.
  let outPath = null;
  if (!cli.dryRun) {
    try {
      outPath = resolveRedactOutputPath({ input: cli.input, out: cli.out });
    } catch (e) {
      console.error(e.message);
      process.exitCode = 1;
      return;
    }
  }

  const inputPath = resolve(process.cwd(), cli.input);
  let raw;
  try {
    raw = readFileSync(inputPath, 'utf8');
  } catch (e) {
    console.error(`secret:redact: не читается вход «${cli.input}»: ${e?.message ?? e}`);
    process.exitCode = 1;
    return;
  }

  const isJson = cli.input.endsWith('.json');
  let body;
  let cuts;
  if (isJson) {
    try {
      const parsed = JSON.parse(raw);
      const r = redactJsonSensitiveValues(parsed);
      body = `${JSON.stringify(r.value, null, 2)}\n`;
      cuts = r.cuts;
    } catch (e) {
      // Битый JSON — не повод пропустить файл: режем как текст, но говорим об этом.
      console.error(`secret:redact: JSON не разобран (${e?.message ?? e}) — режу как текст`);
      const r = redactSecrets(raw);
      body = r.text;
      cuts = r.cuts;
    }
  } else {
    const r = redactSecrets(raw);
    body = r.text;
    cuts = r.cuts;
  }

  const date = cli.date ?? new Date().toISOString().slice(0, 10);
  const manifest = formatRotationManifest(cuts, { file: cli.input, date, dryRun: cli.dryRun });

  if (cli.manifest) {
    writeFileSync(resolve(process.cwd(), cli.manifest), manifest, 'utf8');
    console.error(`Манифест: ${cli.manifest}`);
  } else {
    console.log(manifest);
  }

  if (cli.dryRun) {
    console.error(`--dry-run: копия не записана. Вырезало бы фрагментов: ${cuts.length}`);
    return;
  }

  writeFileSync(/** @type {string} */ (outPath), body, 'utf8');
  console.error(`Очищенная копия: ${outPath} · вырезано фрагментов: ${cuts.length}`);
  console.error('Вход не изменён.');
}

if (process.argv[1]?.endsWith('secret-redact.mjs')) main();
