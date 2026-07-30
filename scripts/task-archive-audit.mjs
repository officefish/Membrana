#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  return `{${Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

function hash(value) {
  return createHash('sha256').update(stableStringify(value), 'utf8').digest('hex');
}

async function main() {
  const url = argValue('--url') ?? process.env.OFFICE_API_URL ?? 'http://localhost:3000';
  const token = argValue('--token') ?? process.env.OFFICE_API_TOKEN ?? process.env.API_INTERNAL_TOKEN;
  const checkpointPath = argValue('--checkpoint');
  if (!token) throw new Error('OFFICE_API_TOKEN or API_INTERNAL_TOKEN is required');
  if (!checkpointPath) throw new Error('--checkpoint <cold-archive-checkpoint.json> is required');

  const expected = JSON.parse(await readFile(checkpointPath, 'utf8'));
  const response = await fetch(new URL('/v1/task-archive/closures', url), {
    headers: { 'x-membrana-token': token },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`task archive audit failed: HTTP ${response.status} ${body}`);
  }

  const records = JSON.parse(body);
  const ordered = [...records].sort((a, b) => a.closedAt.localeCompare(b.closedAt) || a.taskId.localeCompare(b.taskId));
  const actual = {
    schemaVersion: 'cold-archive-checkpoint/1',
    archiveHome: 'background-office/mongodb',
    recordType: 'task_closure',
    recordCount: ordered.length,
    hashAlg: 'sha256',
    canonicalization: 'json-stable-stringify/v1',
    contentHash: hash(ordered),
  };

  const verdict =
    expected.recordCount !== actual.recordCount
      ? 'count_mismatch'
      : expected.contentHash !== actual.contentHash
        ? 'hash_mismatch'
        : 'converged';
  console.log(JSON.stringify({ verdict, expected, actual }, null, 2));
  process.exitCode = verdict === 'converged' ? 0 : 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
