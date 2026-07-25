#!/usr/bin/env node
/**
 * affine-capacity-gate — go/no-go перед first `compose up` Affine на office VDS.
 *
 * Эпик strategy-affine-routing (#1156) / W1 sar-w1-canon-dns (#1158).
 * Readonly probe через `yarn office:ssh` (free/df). Ничего не пишет на VDS.
 *
 *   yarn affine:capacity-gate
 *   yarn affine:capacity-gate --dry-parse   # только разбор stdin / --fixture
 *
 * Exit: 0 = go; 4 = no-go; 1 = ошибка вызова / парсинга.
 *
 * Пороги (канон OPEN / STRATEGY_AFFINE_DEPLOY):
 *   MemAvailable < 1.5 GiB → STOP
 *   Disk `/` avail < 12 GiB → STOP
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 1.5 GiB in bytes (binary). */
export const MIN_MEM_AVAILABLE_BYTES = Math.floor(1.5 * 1024 ** 3);
/** 12 GiB in bytes (binary). */
export const MIN_DISK_AVAIL_BYTES = 12 * 1024 ** 3;

const GIB = 1024 ** 3;

/**
 * @param {number} bytes
 * @returns {string}
 */
export function formatGiB(bytes) {
  return `${(bytes / GIB).toFixed(2)} GiB`;
}

/**
 * Parse `free -b` output → MemAvailable bytes.
 * @param {string} text
 * @returns {number|null}
 */
export function parseMemAvailableBytes(text) {
  const lines = String(text).split(/\r?\n/);
  const mem = lines.find((l) => /^\s*Mem:/.test(l));
  if (!mem) return null;
  const cols = mem.trim().split(/\s+/);
  // free -b: total used free shared buff/cache available
  const available = Number(cols[6]);
  return Number.isFinite(available) ? available : null;
}

/**
 * Parse `df -B1 /` (or first data row for `/`) → avail bytes.
 * @param {string} text
 * @returns {number|null}
 */
export function parseDiskAvailBytes(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (line.startsWith('Filesystem') || line.startsWith('---')) continue;
    const cols = line.split(/\s+/);
    // Filesystem 1B-blocks Used Available Use% Mounted
    if (cols.length < 6) continue;
    const mounted = cols[cols.length - 1];
    if (mounted !== '/') continue;
    const avail = Number(cols[3]);
    return Number.isFinite(avail) ? avail : null;
  }
  return null;
}

/**
 * Split probe blob on a `---` separator (free block / df block).
 * @param {string} blob
 * @returns {{ freeText: string, dfText: string }}
 */
export function splitProbeOutput(blob) {
  const parts = String(blob).split(/\r?\n---\r?\n/);
  if (parts.length >= 2) {
    return { freeText: parts[0], dfText: parts.slice(1).join('\n---\n') };
  }
  return { freeText: blob, dfText: blob };
}

/**
 * @param {{ memAvailable: number|null, diskAvail: number|null,
 *   minMem?: number, minDisk?: number }} input
 * @returns {{ go: boolean, reason: string, memAvailable: number|null, diskAvail: number|null }}
 */
export function evaluateCapacityGate(input) {
  const minMem = input.minMem ?? MIN_MEM_AVAILABLE_BYTES;
  const minDisk = input.minDisk ?? MIN_DISK_AVAIL_BYTES;
  const { memAvailable, diskAvail } = input;

  if (memAvailable == null) {
    return { go: false, reason: 'не удалось разобрать MemAvailable из free -b', memAvailable, diskAvail };
  }
  if (diskAvail == null) {
    return { go: false, reason: 'не удалось разобрать disk avail из df -B1 /', memAvailable, diskAvail };
  }

  const fails = [];
  if (memAvailable < minMem) {
    fails.push(`MemAvailable ${formatGiB(memAvailable)} < ${formatGiB(minMem)}`);
  }
  if (diskAvail < minDisk) {
    fails.push(`disk avail ${formatGiB(diskAvail)} < ${formatGiB(minDisk)}`);
  }

  if (fails.length) {
    return {
      go: false,
      reason: `${fails.join('; ')} → STOP, эскалация владельцу (апгрейд VDS / отдельный хост)`,
      memAvailable,
      diskAvail,
    };
  }

  return {
    go: true,
    reason: `MemAvailable ${formatGiB(memAvailable)}, disk avail ${formatGiB(diskAvail)} — запас достаточен для W2 install`,
    memAvailable,
    diskAvail,
  };
}

/**
 * @param {{ go: boolean, reason: string, memAvailable: number|null, diskAvail: number|null }} verdict
 * @returns {string}
 */
export function renderCapacityReport(verdict) {
  const L = ['affine-capacity-gate: office VDS (readonly)', ''];
  L.push(
    `MemAvailable : ${verdict.memAvailable == null ? '(n/a)' : formatGiB(verdict.memAvailable)} (min ${formatGiB(MIN_MEM_AVAILABLE_BYTES)})`,
  );
  L.push(
    `disk / avail : ${verdict.diskAvail == null ? '(n/a)' : formatGiB(verdict.diskAvail)} (min ${formatGiB(MIN_DISK_AVAIL_BYTES)})`,
  );
  L.push('');
  L.push(`${verdict.go ? '[go]' : '[no-go]'} ${verdict.reason}`);
  if (!verdict.go) {
    L.push('compose up Affine НЕ запускать (инвариант R4 / STRATEGY_AFFINE_DEPLOY).');
  }
  return L.join('\n');
}

/**
 * @param {string} blob
 */
export function evaluateProbeBlob(blob) {
  const { freeText, dfText } = splitProbeOutput(blob);
  return evaluateCapacityGate({
    memAvailable: parseMemAvailableBytes(freeText),
    diskAvail: parseDiskAvailBytes(dfText),
  });
}

function runOfficeProbe() {
  // Прямой вызов exec-хелпера: yarn 4 съедает `--`, а shell-квотинг на PS
  // ломает `free -b; echo ---; df`. Паттерн = тот же, что `yarn office:ssh '…'`.
  const probe = 'free -b; echo ---; df -B1 /';
  const execPath = resolve(__dirname, '_ssh-office-exec.mjs');
  const r = spawnSync(process.execPath, [execPath, probe], {
    encoding: 'utf8',
    env: process.env,
    cwd: resolve(__dirname, '..'),
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  if (r.error) {
    return { ok: false, error: r.error.message, out };
  }
  if (r.status !== 0) {
    return { ok: false, error: `office:ssh exit ${r.status}`, out };
  }
  return { ok: true, out };
}

function main() {
  const argv = process.argv.slice(2);
  const dryParse = argv.includes('--dry-parse');
  const fixtureIdx = argv.indexOf('--fixture');
  const fixturePath = fixtureIdx !== -1 ? argv[fixtureIdx + 1] : null;

  let blob;
  if (fixturePath) {
    blob = readFileSync(fixturePath, 'utf8');
  } else if (dryParse) {
    blob = readFileSync(0, 'utf8');
  } else {
    const probe = runOfficeProbe();
    if (!probe.ok) {
      console.error(`affine-capacity-gate: probe failed: ${probe.error}`);
      if (probe.out) console.error(probe.out.trim());
      process.exitCode = 1;
      return;
    }
    blob = probe.out;
  }

  const verdict = evaluateProbeBlob(blob);
  console.log(renderCapacityReport(verdict));
  process.exitCode = verdict.go ? 0 : 4;
}

const thisFile = fileURLToPath(import.meta.url);
const invoked = process.argv[1] ? resolve(process.argv[1]) : '';
if (invoked && resolve(thisFile) === invoked) {
  main();
}
