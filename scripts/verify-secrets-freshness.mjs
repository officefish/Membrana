#!/usr/bin/env node
/**
 * yarn verify:secrets-freshness — ревизия свежести секретов по реестру (#2662).
 *
 * Читает `docs/security/SECRETS_REGISTRY.md` и `.github/workflows/*.yml`. Значений секретов не
 * читает и не печатает (их нет в репозитории). Ядро — `scripts/lib/secrets-freshness.mjs`.
 *
 * Usage:
 *   node scripts/verify-secrets-freshness.mjs [--today ГГГГ-ММ-ДД] [--warn-days 14] [--json]
 *
 * Exit: 0 — красного нет (предупреждения возможны) · 1 — секрет workflow без строки реестра,
 * истёкшая или нечитаемая дата · 2 — ошибка входа.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkFreshness, parseRegistry, workflowSecretNames } from './lib/secrets-freshness.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REGISTRY = 'docs/security/SECRETS_REGISTRY.md';
const WORKFLOWS = '.github/workflows';

function parseArgs(argv) {
  const o = { today: new Date().toISOString().slice(0, 10), warnDays: 14, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--today') o.today = argv[++i];
    else if (a === '--warn-days') o.warnDays = Number(argv[++i]);
    else throw new Error(`неизвестный аргумент «${a}»`);
  }
  if (!Number.isFinite(o.warnDays) || o.warnDays < 0) throw new Error('--warn-days: неотрицательное число');
  return o;
}

export function collect(root = ROOT, opts = {}) {
  const regFile = join(root, REGISTRY);
  if (!existsSync(regFile)) throw new Error(`предмет потерян: нет ${REGISTRY}`);
  const rows = parseRegistry(readFileSync(regFile, 'utf8'));
  const wfDir = join(root, WORKFLOWS);
  if (!existsSync(wfDir)) throw new Error(`предмет потерян: нет ${WORKFLOWS}`);
  const used = new Map();
  for (const f of readdirSync(wfDir).filter((n) => /\.ya?ml$/u.test(n)).sort()) {
    for (const name of workflowSecretNames(readFileSync(join(wfDir, f), 'utf8'))) {
      used.set(name, [...(used.get(name) ?? []), f]);
    }
  }
  if (used.size === 0) throw new Error('в workflows не найдено ни одного secrets.* — судить нечего');
  return { used: used.size, ...checkFreshness(rows, used, opts) };
}

function main(argv) {
  const opts = parseArgs(argv);
  const r = collect(ROOT, opts);
  if (opts.json) {
    console.log(JSON.stringify(r, null, 2));
    return r.ok ? 0 : 1;
  }
  for (const e of r.errors) {
    if (e.kind === 'unregistered') {
      console.error(`  ✗ ${e.name}: назван в ${e.files.join(', ')}, а строки «GitHub secret» в ${REGISTRY} нет`);
    } else if (e.kind === 'expired') {
      console.error(`  ✗ ${e.name}: истёк ${e.expires} (${-e.days} дн. назад) — ротация рукой владельца`);
    } else {
      console.error(`  ✗ ${e.name}: нечитаемое «Истекает» — «${e.value}» (ждём ГГГГ-ММ-ДД / неизвестно … / не истекает / на прогон)`);
    }
  }
  for (const w of r.warnings) {
    console.log(`  ⚠ ${w.name}: истекает ${w.expires} (через ${w.days} дн.) — ротация рукой владельца`);
  }
  console.log(
    `verify:secrets-freshness — строк реестра: ${r.total}; секретов в workflows: ${r.used}; ` +
      `срок неизвестен: ${r.unknown.length}; предупреждений: ${r.warnings.length}; красных: ${r.errors.length}`,
  );
  if (r.unknown.length > 0) {
    console.log(`  срок неизвестен (спросить владельца): ${r.unknown.map((u) => u.name).join(', ')}`);
  }
  return r.ok ? 0 : 1;
}

if (process.argv[1]?.endsWith('verify-secrets-freshness.mjs')) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(`verify:secrets-freshness — ошибка входа: ${error?.message ?? error}`);
    process.exit(2);
  }
}
