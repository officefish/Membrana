#!/usr/bin/env node
/**
 * CC4 — блокирующий secret-scan контура communications.
 *
 * Сканирует ЗАПИСЫВАЕМУЮ поверхность контура (`out/` — выход для партнёра, `src/` — исходники)
 * на известные паттерны секретов. Любое совпадение → exit 1 (блокирует comms-CI перед экспортом
 * в Drive / архивом). Вычистка секретов — канон проекта, не исключение.
 *
 * Usage:
 *   node apps/comms-studio/scripts/check-secrets.mjs
 *   yarn workspace @membrana/comms-studio secret-scan
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @typedef {{ id: string; re: RegExp }} SecretPattern */

/** @type {SecretPattern[]} */
export const SECRET_PATTERNS = [
  { id: 'private-key', re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY-----/ },
  { id: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  {
    id: 'assigned-secret',
    re: /\b(?:api[_-]?key|secret|token|password|passwd|access[_-]?key|client[_-]?secret)\b\s*[:=]\s*['"][^'"\s]{8,}['"]/i,
  },
  { id: 'bearer-token', re: /\bBearer\s+[A-Za-z0-9._-]{20,}/ },
  {
    id: 'private-ip',
    re: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/,
  },
];

const SCAN_EXT = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|md|json|txt|html|css|svg|yaml|yml)$/;

/**
 * @param {string} text
 * @returns {{ id: string; line: number }[]}
 */
export function scanFileContent(text) {
  /** @type {{ id: string; line: number }[]} */
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const { id, re } of SECRET_PATTERNS) {
      if (re.test(lines[i])) hits.push({ id, line: i + 1 });
    }
  }
  return hits;
}

/**
 * @param {string} dir
 * @param {string[]} acc
 * @returns {string[]}
 */
function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const abs = join(dir, name);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.turbo') continue;
      walk(abs, acc);
      continue;
    }
    // Тест-файлы содержат намеренные фикстуры-паттерны — не сканируем (иначе self-match).
    if (SCAN_EXT.test(name) && !/\.(test|spec)\./.test(name)) acc.push(abs);
  }
  return acc;
}

/**
 * @param {string} [baseDir] корень пакета (в тестах — временный каталог).
 * @param {string[]} [targets] подкаталоги для скана.
 * @returns {{ file: string; line: number; id: string }[]}
 */
export function scanTargets(baseDir = pkgRoot, targets = ['out', 'src']) {
  /** @type {{ file: string; line: number; id: string }[]} */
  const violations = [];
  for (const target of targets) {
    for (const file of walk(join(baseDir, target))) {
      const hits = scanFileContent(readFileSync(file, 'utf8'));
      for (const h of hits) violations.push({ file: relative(baseDir, file), line: h.line, id: h.id });
    }
  }
  return violations;
}

function main() {
  console.log('comms secret-scan — сканирую out/ и src/ на паттерны секретов\n');
  const violations = scanTargets();
  if (violations.length === 0) {
    console.log('✓ секретов не найдено — OK');
    return;
  }
  process.exitCode = 1;
  console.error(`✗ найдено потенциальных секретов: ${violations.length}`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  [${v.id}]`);
  }
  console.error('\ncomms secret-scan — FAILED (вычистите секреты перед экспортом/архивом)');
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main();
}
