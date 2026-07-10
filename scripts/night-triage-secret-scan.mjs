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
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

function main() {
  const asJson = process.argv.includes('--json');
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
