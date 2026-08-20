#!/usr/bin/env node
// Блокирующий секрет-гейт пилота night-triage (Issue #344, консилиум
// docs/seanses/night-triage-routine-2026-07-10.md): прежде чем облачная рутина
// клонирует репо и читает реестр, формально проверяем, что в путях чтения рутины
// нет токенов, ключей и приватных URL. Нормализационная граница либо есть,
// либо пилот не стартует: non-zero exit останавливает шаг 2.
//
// Два уровня проверки:
//   1. Паттерны распространённых форматов ключей (Anthropic, GitHub, AWS, Slack,
//      Google, private key PEM, Bearer) — по всем файлам чтения.
//   2. Для JSON (registry.json): любые ключи вида token/secret/key/password/apikey
//      с непустым строковым значением.
//
// Usage:
//   node scripts/night-triage-secret-scan.mjs          # exit 1 при находках
//   node scripts/night-triage-secret-scan.mjs --json   # findings в JSON на stdout
//
// Резак (#1240, веха secret-parser-built) живёт отдельно и строится ПОВЕРХ этих же
// правил — `yarn secret:redact` (scripts/secret-redact.mjs, ядро scripts/lib/secret-redact.mjs).
// Здесь только детекторы: этот файл остаётся блокирующим гейтом, чтобы рез и гейт
// не превратились в один скрипт с двумя ответственностями.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatRotationManifest, redactSecrets } from './lib/secret-redact.mjs';

/** Пути, которые читает рутина (контракт из ROUTINE_PROMPT.md). */
export const ROUTINE_READ_PATHS = [
  'docs/tasks/registry.json',
  'docs/tasks/README.md',
  'docs/day-sprint/night-triage-routine-2026-07-10/ROUTINE_PROMPT.md',
];

/** Распространённые форматы секретов. Названы, чтобы находка читалась в отчёте. */
export const SECRET_PATTERNS = [
  { name: 'anthropic-key', re: /sk-ant-[a-zA-Z0-9_-]{10,}/u },
  { name: 'openai-key', re: /sk-[a-zA-Z0-9]{20,}/u },
  { name: 'github-token', re: /(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{20,}/u },
  { name: 'github-pat', re: /github_pat_[a-zA-Z0-9_]{20,}/u },
  { name: 'aws-access-key', re: /AKIA[0-9A-Z]{16}/u },
  { name: 'slack-token', re: /xox[baprs]-[a-zA-Z0-9-]{10,}/u },
  { name: 'google-api-key', re: /AIza[0-9A-Za-z_-]{30,}/u },
  { name: 'private-key-pem', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/u },
  { name: 'bearer-token', re: /Bearer\s+[a-zA-Z0-9_.~+/-]{20,}=*/u },
  { name: 'basic-auth-url', re: /[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]+@/iu },
];

/** Ключи JSON, значение которых обязано быть пустым/null в путях чтения рутины. */
export const SENSITIVE_JSON_KEY_RE = /(?:token|secret|password|api[_-]?key|private[_-]?key|credential)/iu;

/** @returns {{file: string, kind: string, detail: string}[]} */
export function scanTextForSecrets(text, file) {
  const findings = [];
  for (const { name, re } of SECRET_PATTERNS) {
    const match = text.match(re);
    if (match) {
      findings.push({ file, kind: name, detail: `${match[0].slice(0, 12)}… (совпадение паттерна)` });
    }
  }
  return findings;
}

/** Обходит распарсенный JSON: чувствительный ключ с непустой строкой = находка. */
export function scanJsonForSensitiveKeys(value, file, path = '$') {
  const findings = [];
  if (Array.isArray(value)) {
    value.forEach((item, i) => findings.push(...scanJsonForSensitiveKeys(item, file, `${path}[${i}]`)));
    return findings;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (SENSITIVE_JSON_KEY_RE.test(key) && typeof child === 'string' && child.trim() !== '') {
        findings.push({ file, kind: 'sensitive-json-key', detail: `${path}.${key} — непустое значение` });
      }
      findings.push(...scanJsonForSensitiveKeys(child, file, `${path}.${key}`));
    }
  }
  return findings;
}

export function scanFile(file, cwd = process.cwd()) {
  const text = readFileSync(resolve(cwd, file), 'utf8');
  const findings = scanTextForSecrets(text, file);
  if (file.endsWith('.json')) {
    findings.push(...scanJsonForSensitiveKeys(JSON.parse(text), file));
  }
  return findings;
}

export function scanRoutineReadPaths(cwd = process.cwd(), paths = ROUTINE_READ_PATHS) {
  const findings = [];
  for (const file of paths) {
    try {
      findings.push(...scanFile(file, cwd));
    } catch (error) {
      findings.push({ file, kind: 'read-error', detail: String(error?.message ?? error) });
    }
  }
  return findings;
}

/**
 * Режим реза (веха `secret-parser-built`, критерий 1: «сканер имеет резак»). Рез НЕ слит с
 * гейтом: детекторный режим и его exit-контракт не тронуты, рез — отдельный флаг, а вся
 * механика — в общем ядре `lib/secret-redact.mjs` (та же, что у `yarn secret:redact`).
 * Вход никогда не перезаписывается: копия — `<in>.redacted` или `--out`.
 *
 * @param {string[]} argv
 * @returns {{ input: string; out: string | null; manifest: string | null; date: string | null }}
 */
export function parseScanRedactCli(argv) {
  const o = { input: /** @type {string | null} */ (null), out: null, manifest: null, date: null };
  const valueAt = (i, flag) => {
    const v = argv[i];
    if (v === undefined || v.startsWith('-')) throw new Error(`--redact: ключ ${flag} требует значение`);
    return v;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--redact') o.input = valueAt(++i, a);
    else if (a === '--out') o.out = valueAt(++i, a);
    else if (a === '--manifest') o.manifest = valueAt(++i, a);
    else if (a === '--date') o.date = valueAt(++i, a);
  }
  if (!o.input) throw new Error('--redact: нет входного файла');
  if (o.out !== null && resolve(o.out) === resolve(o.input)) {
    throw new Error('--redact: --out совпадает со входом — вход не перезаписывается');
  }
  return /** @type {{ input: string; out: string | null; manifest: string | null; date: string | null }} */ (o);
}

/**
 * Прогнать рез: копия без секретов + (опционально) манифест ротации. Возвращает счётчик резов.
 * Дата обязана прийти параметром для датированного прохода; без неё берутся системные часы —
 * это черновик, о чём говорит сам манифест (см. secret-redact.mjs).
 *
 * @param {{ input: string; out: string | null; manifest: string | null; date: string | null }} o
 * @param {string} [cwd]
 */
export function runScanRedact(o, cwd = process.cwd()) {
  const inputAbs = resolve(cwd, o.input);
  const text = readFileSync(inputAbs, 'utf8');
  const { text: clean, cuts } = redactSecrets(text);
  const outAbs = resolve(cwd, o.out ?? `${o.input}.redacted`);
  writeFileSync(outAbs, clean, 'utf8');
  const date = o.date ?? new Date().toISOString().slice(0, 10);
  if (o.manifest) {
    writeFileSync(resolve(cwd, o.manifest), formatRotationManifest(cuts, { file: o.input, date, dryRun: false }), 'utf8');
  }
  return { cuts: cuts.length, out: outAbs };
}

function main() {
  const asJson = process.argv.includes('--json');
  if (process.argv.includes('--redact')) {
    const o = parseScanRedactCli(process.argv.slice(2));
    const res = runScanRedact(o);
    console.log(`рез: ${res.cuts} фрагмент(ов) вырезано → ${res.out}${o.manifest ? ` · манифест: ${o.manifest}` : ''}`);
    return;
  }
  const findings = scanRoutineReadPaths();

  if (asJson) {
    console.log(JSON.stringify({ ok: findings.length === 0, findings }, null, 2));
  } else if (findings.length === 0) {
    console.log(`OK: секретов не найдено в ${ROUTINE_READ_PATHS.length} путях чтения рутины`);
  } else {
    console.error(`Секрет-гейт: ${findings.length} находок — пилот night-triage ЗАБЛОКИРОВАН:`);
    for (const f of findings) console.error(`  - ${f.file} · ${f.kind} · ${f.detail}`);
  }

  if (findings.length > 0) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('night-triage-secret-scan.mjs')) {
  main();
}
