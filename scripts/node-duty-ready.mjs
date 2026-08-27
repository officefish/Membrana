#!/usr/bin/env node
/**
 * Read-only predicate for #2049: Firebat is ready for night duty only when
 * sleep/hibernate are off, Windows autologon is enabled, and MembranaNode task is enabled.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const DEFAULT_TASK_NAME = 'MembranaNode';

export function parseArgs(argv) {
  const out = { fixture: null, json: false, taskName: DEFAULT_TASK_NAME, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--fixture') out.fixture = requiredValue(argv, ++i, arg);
    else if (arg === '--task-name') out.taskName = requiredValue(argv, ++i, arg);
    else if (arg === '--json') out.json = true;
    else if (arg === '--help' || arg === '-h') out.help = true;
    else throw new Error(`unknown flag: ${arg}`);
  }
  return out;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag}: value is required`);
  return value;
}

function parseHexIndex(line) {
  const match = /0x([0-9a-f]+)/iu.exec(line);
  return match ? Number.parseInt(match[1], 16) : null;
}

export function extractSettingIndexes(text, aliases) {
  const sections = String(text ?? '').split(/(?=Power Setting GUID:|Параметр питания GUID:|GUID настройки питания:)/u);
  const aliasPattern = new RegExp(aliases.map(escapeRegExp).join('|'), 'iu');
  for (const section of sections) {
    if (!aliasPattern.test(section)) continue;
    const lines = section.split(/\r?\n/u);
    const acLine = lines.find((line) => /AC Power Setting Index|Питание от сети|настройки питания от сети/u.test(line));
    const dcLine = lines.find((line) => /DC Power Setting Index|Питание от батареи|настройки питания от батарей/u.test(line));
    return {
      ac: acLine ? parseHexIndex(acLine) : null,
      dc: dcLine ? parseHexIndex(dcLine) : null,
    };
  }
  return { ac: null, dc: null };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function zeroIndexes(indexes) {
  return indexes.ac === 0 && indexes.dc === 0;
}

function hibernateUnavailable(text) {
  return /Hibernate has not been enabled|Гибернац[^\n]*(не включ|отключ)|Режим гибернации не включен/iu.test(String(text ?? ''));
}

export function evaluateDutyReady(snapshot) {
  const sleep = extractSettingIndexes(snapshot.powercfg?.sleepSettings, [
    'STANDBYIDLE',
    'Sleep after',
    'Сон после',
    'Спящий режим после',
  ]);
  const hibernate = extractSettingIndexes(snapshot.powercfg?.sleepSettings, [
    'HIBERNATEIDLE',
    'Hibernate after',
    'Гибернация после',
  ]);
  const sleepOk = zeroIndexes(sleep);
  const hibernateOk = zeroIndexes(hibernate) || hibernateUnavailable(snapshot.powercfg?.availability);
  const autoLogonOk = snapshot.autologon?.autoAdminLogon === '1'
    && snapshot.autologon?.defaultUserNamePresent === true;
  const taskState = String(snapshot.scheduledTask?.state ?? '');
  const taskOk = snapshot.scheduledTask?.exists === true && !/^disabled$/iu.test(taskState);
  const checks = [
    {
      id: 'sleep',
      label: 'Sleep timeout off',
      ok: sleepOk,
      reason: sleepOk ? 'AC/DC sleep timeout = 0' : `AC=${formatIndex(sleep.ac)}, DC=${formatIndex(sleep.dc)}`,
    },
    {
      id: 'hibernate',
      label: 'Hibernate off',
      ok: hibernateOk,
      reason: hibernateOk
        ? 'hibernate disabled or AC/DC hibernate timeout = 0'
        : `AC=${formatIndex(hibernate.ac)}, DC=${formatIndex(hibernate.dc)}`,
    },
    {
      id: 'autologon',
      label: 'AutoAdminLogon enabled',
      ok: autoLogonOk,
      reason: autoLogonOk
        ? 'AutoAdminLogon=1, DefaultUserName present'
        : `AutoAdminLogon=${snapshot.autologon?.autoAdminLogon ?? '(missing)'}, DefaultUserName=${snapshot.autologon?.defaultUserNamePresent === true ? 'present' : 'missing'}`,
    },
    {
      id: 'scheduled-task',
      label: `${snapshot.taskName ?? DEFAULT_TASK_NAME} task enabled`,
      ok: taskOk,
      reason: taskOk
        ? `state=${taskState || 'unknown'}`
        : `exists=${snapshot.scheduledTask?.exists === true ? 'yes' : 'no'}, state=${taskState || '(missing)'}`,
    },
  ];
  return { ok: checks.every((check) => check.ok), checks };
}

function formatIndex(value) {
  return value === null ? '?' : String(value);
}

export function formatReport(snapshot, result) {
  const rows = [
    '| Predicate | Ready | Reason |',
    '|---|---:|---|',
    ...result.checks.map((check) => `| ${check.label} | ${check.ok ? 'yes' : 'NO'} | ${check.reason} |`),
  ];
  return [
    `node:duty-ready - ${snapshot.capturedAt ?? 'fixture'}`,
    '',
    ...rows,
    '',
    `Verdict: ${result.ok ? 'PASS' : 'FAIL'}`,
  ].join('\n');
}

function collectLiveSnapshot(taskName) {
  const root = dirname(fileURLToPath(import.meta.url));
  const script = join(root, 'node-duty-ready.ps1');
  const ps = process.env.SystemRoot
    ? join(process.env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    : 'powershell.exe';
  const res = spawnSync(ps, [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    script,
    '-TaskName',
    taskName,
  ], { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`PowerShell collector failed: ${res.stderr || res.stdout || res.status}`);
  }
  return JSON.parse(res.stdout);
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('Usage: yarn node:duty-ready [--task-name MembranaNode] [--fixture snapshot.json] [--json]');
    return 0;
  }
  const snapshot = options.fixture
    ? JSON.parse(readFileSync(options.fixture, 'utf8'))
    : collectLiveSnapshot(options.taskName);
  const result = evaluateDutyReady(snapshot);
  if (options.json) console.log(JSON.stringify({ snapshot, result }, null, 2));
  else console.log(formatReport(snapshot, result));
  return result.ok ? 0 : 1;
}

const entry = (process.argv[1] ?? '').replace(/\\/gu, '/');
if (entry.endsWith('/node-duty-ready.mjs')) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((err) => {
    console.error(`node:duty-ready - ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  });
}
