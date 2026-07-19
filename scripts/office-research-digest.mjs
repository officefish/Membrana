#!/usr/bin/env node
/**
 * Intern T3 (#197): yarn office:research-digest
 *
 *   yarn office:research-digest
 *   yarn office:research-digest --dry-run
 *   yarn office:research-digest --date 2026-07-19 --force
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDotEnv } from './_anthropic-env.mjs';
import {
  runResearchDigest,
  todayIso,
} from './lib/research-digest.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const force = argv.includes('--force');

function argValue(flag) {
  const i = argv.indexOf(flag);
  if (i === -1) return null;
  return argv[i + 1] ?? null;
}

const isMain = process.argv[1]?.replace(/\\/g, '/').endsWith('/office-research-digest.mjs');
if (isMain) {
  loadDotEnv();
  const date = argValue('--date') || todayIso();
  const result = await runResearchDigest({
    repoRoot,
    apiKey: process.env.PERPLEXITY_API_KEY,
    date,
    dryRun,
    force,
  });

  if (result.outcome === 'no-key') {
    console.error('PERPLEXITY_API_KEY не задан (.env).');
    process.exitCode = 1;
  } else if (result.outcome === 'skipped-exists') {
    console.log(`[office:research-digest] уже есть ${result.path} — skip (используй --force)`);
  } else if (result.outcome === 'parse-empty') {
    console.error('[office:research-digest] Sonar ответил, но пунктов с Source не разобрано');
    console.error(result.raw?.slice(0, 500));
    process.exitCode = 1;
  } else if (result.outcome === 'dry-run') {
    console.log(`[office:research-digest] dry-run → ${result.path}`);
    console.log(result.markdown);
  } else if (result.outcome === 'written') {
    console.log(`[office:research-digest] записано ${result.path} (${result.items.length} пунктов)`);
  }
}
