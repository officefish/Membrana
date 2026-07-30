#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const url = argValue('--url') ?? process.env.OFFICE_API_URL ?? 'http://localhost:3000';
  const token = argValue('--token') ?? process.env.OFFICE_API_TOKEN ?? process.env.API_INTERNAL_TOKEN;
  const recordPath = argValue('--record');
  if (!token) throw new Error('OFFICE_API_TOKEN or API_INTERNAL_TOKEN is required');
  if (!recordPath) throw new Error('--record <task-closure-record.json> is required');

  const record = JSON.parse(await readFile(recordPath, 'utf8'));
  const response = await fetch(new URL('/v1/task-archive/closures', url), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-membrana-token': token,
    },
    body: JSON.stringify(record),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`task archive notary failed: HTTP ${response.status} ${body}`);
  }
  console.log(body);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
