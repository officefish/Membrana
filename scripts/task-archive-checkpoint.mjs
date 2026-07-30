#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const url = argValue('--url') ?? process.env.OFFICE_API_URL ?? 'http://localhost:3000';
  const token = argValue('--token') ?? process.env.OFFICE_API_TOKEN ?? process.env.API_INTERNAL_TOKEN;
  const out = argValue('--out');
  if (!token) throw new Error('OFFICE_API_TOKEN or API_INTERNAL_TOKEN is required');

  const response = await fetch(new URL('/v1/task-archive/checkpoint', url), {
    headers: { 'x-membrana-token': token },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`task archive checkpoint failed: HTTP ${response.status} ${body}`);
  }

  if (!out) {
    console.log(body);
    return;
  }
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(JSON.parse(body), null, 2)}\n`, 'utf8');
  console.log(`task archive checkpoint written: ${out}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
