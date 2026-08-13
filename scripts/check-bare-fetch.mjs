#!/usr/bin/env node
/**
 * yarn network:bare-fetch [--json]
 *
 * Зуб политики машин (#1912, В7 заседания network-container): голый fetch в
 * серверной зоне без proxy-обвязки и без исключения. Нормы читаются из
 * docs/audit/network/registry/ (machine-policy + budget). Голый node, без
 * зависимостей — годен в pre-push. Exit: 0 — зелёный (LEGACY в бюджете,
 * живые AMNESTY); 1 — VIOLATION или POLICY_INVALID; 2 — кривые аргументы.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runBareFetchCheck } from './lib/check-bare-fetch.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_REL = 'docs/audit/network/registry/machine-policy.json';
const BUDGET_REL = 'docs/audit/network/registry/network-policy-violations-budget.json';

/**
 * Серверная зона (fallback-glob В7; конвенции packageKind в репо нет — эрратум M7):
 * packages/background-x/src и packages/services/x(/y)/src, файлы .ts вне тестов.
 * @param {string} cwd
 * @returns {string[]} repo-relative пути с прямыми слэшами
 */
export function serverZoneFiles(cwd) {
  /** @type {string[]} */
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.turbo') continue;
        walk(abs);
      } else if (/\.ts$/u.test(e.name) && !/\.(test|spec)\.ts$/u.test(e.name) && !e.name.endsWith('.d.ts')) {
        out.push(relative(cwd, abs).replace(/\\/gu, '/'));
      }
    }
  };
  const roots = [];
  for (const base of ['packages']) {
    let names;
    try {
      names = readdirSync(join(cwd, base), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const d of names) {
      if (!d.isDirectory()) continue;
      if (d.name.startsWith('background-')) roots.push(join(cwd, base, d.name, 'src'));
      if (d.name === 'services') {
        for (const s of readdirSync(join(cwd, base, 'services'), { withFileTypes: true })) {
          if (!s.isDirectory()) continue;
          const direct = join(cwd, base, 'services', s.name, 'src');
          try {
            statSync(direct);
            roots.push(direct);
          } catch {
            // вложенный уровень (services/detectors/base/src)
            for (const n of readdirSync(join(cwd, base, 'services', s.name), { withFileTypes: true })) {
              if (n.isDirectory()) {
                const nested = join(cwd, base, 'services', s.name, n.name, 'src');
                try {
                  statSync(nested);
                  roots.push(nested);
                } catch {
                  /* нет src — не зона */
                }
              }
            }
          }
        }
      }
    }
  }
  for (const r of roots) walk(r);
  return out.sort();
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, log?: (s: string) => void, today?: string }} [deps]
 * @returns {number}
 */
export function runCheckBareFetch(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  const log = deps.log ?? console.log;
  const unknown = argv.filter((a) => a !== '--json' && a !== '--help' && a !== '-h');
  if (unknown.length > 0) {
    console.error(`network:bare-fetch: неизвестные аргументы: ${unknown.join(', ')}`);
    return 2;
  }
  if (argv.includes('--help') || argv.includes('-h')) {
    log(`Usage: yarn network:bare-fetch [--json]

  Зуб В7 (канон: docs/meeting/network-container/MEETING_VERDICT.md).
  Нормы: ${POLICY_REL} + ${BUDGET_REL}. Зуб называет, не чинит (#1425).`);
    return 0;
  }

  let policy;
  let budget;
  try {
    policy = JSON.parse(readFileSync(join(cwd, POLICY_REL), 'utf8'));
    budget = JSON.parse(readFileSync(join(cwd, BUDGET_REL), 'utf8'));
  } catch (e) {
    console.error(`✗ POLICY_INVALID: нормы не читаются — ${e instanceof Error ? e.message : e}`);
    return 1;
  }

  const files = serverZoneFiles(cwd).map((p) => ({ path: p, content: readFileSync(join(cwd, p), 'utf8') }));
  const today = deps.today ?? new Date().toISOString().slice(0, 10);
  const result = runBareFetchCheck(files, policy, budget, { today });

  if (argv.includes('--json')) {
    log(JSON.stringify(result, null, 2));
  } else {
    log(
      `network:bare-fetch — файлов в зоне: ${files.length} · aware: ${result.counts.aware} · allowed: ${result.counts.allowed} · LEGACY: ${result.counts.legacy}/${/** @type {any} */ (budget).maxBareCallsCount} · AMNESTY: ${result.counts.amnesty} · VIOLATION: ${result.counts.violation}`,
    );
    for (const f of result.findings) log(`  ${f.kind === 'VIOLATION' || f.kind === 'POLICY_INVALID' ? '✗' : '·'} ${f.kind} ${f.path} — ${f.detail}`);
    log(result.ok ? '✓ network:bare-fetch: зелёный — сверх бюджета ничего' : '✗ network:bare-fetch: КРАСНЫЙ');
  }
  return result.ok ? 0 : 1;
}

const entry = (process.argv[1] ?? '').replace(/\\/gu, '/');
if (entry.endsWith('/check-bare-fetch.mjs')) {
  process.exitCode = runCheckBareFetch(process.argv.slice(2));
}
