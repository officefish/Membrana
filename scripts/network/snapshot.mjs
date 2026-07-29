#!/usr/bin/env node
/**
 * yarn network:snapshot — снимок сетевого окружения: прогнать зонды, записать
 * docs/network/env.snapshot.json + .md и дописать строку в history.
 *
 * Витрина — производный артефакт, руками не править. Секретов не пишет: только имена
 * прокси-переменных и признак наличия ключей, никогда значения.
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { join } from 'node:path';

import { buildSnapshot, renderSnapshotMd } from './lib/probe-core.mjs';
import { loadProfiles, proxyUrl, repoRoot, runProbes } from './probe.mjs';

const HOME = join(repoRoot, 'docs', 'network');

export function collectEnv(env = process.env) {
  const vars = ['HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY'].filter((k) => env[k]?.trim());
  return {
    proxyConfigured: Boolean(proxyUrl(env)),
    proxyVars: vars, // ИМЕНА, не значения: в прокси-URL бывают креды
    host: hostname(),
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const generatedAt = new Date().toISOString();
  const probes = await runProbes({ profiles: loadProfiles() });
  const snapshot = buildSnapshot({ probes, env: collectEnv(), generatedAt });

  if (argv.includes('--dry-run')) {
    console.log(JSON.stringify(snapshot, null, 2));
    return 0;
  }

  mkdirSync(join(HOME, 'history'), { recursive: true });
  writeFileSync(join(HOME, 'env.snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  writeFileSync(join(HOME, 'env.snapshot.md'), `${renderSnapshotMd(snapshot, generatedAt)}\n`, 'utf8');
  appendFileSync(
    join(HOME, 'history', `${generatedAt.slice(0, 7)}.jsonl`),
    `${JSON.stringify({ at: generatedAt, host: snapshot.env.host, summary: snapshot.summary, outcomes: Object.fromEntries(probes.map((p) => [p.id, p.outcome])) })}\n`,
    'utf8',
  );

  console.log(`network:snapshot — ${probes.length} звеньев · ${snapshot.summary.advice}`);
  for (const p of probes) console.log(`  ${p.outcome === 'ok' ? '✓' : '·'} ${p.label}: ${p.outcome}${p.proxyMatters ? ' (путь решает)' : ''}`);
  console.log('  витрина: docs/network/env.snapshot.md');
  return 0;
}

if (process.argv[1]?.endsWith('snapshot.mjs')) process.exitCode = await main();
