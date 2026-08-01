#!/usr/bin/env node

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkWorkflowDocs, writeWorkflowDocs } from './lib/mintlify-workflow-docs.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));

if (args.has('--render')) {
  const paths = writeWorkflowDocs(repoRoot);
  console.log(`mintlify:workflow --render · ${paths.length} страницы пересобраны`);
} else if (args.has('--check')) {
  const drift = checkWorkflowDocs(repoRoot);
  if (drift.length > 0) {
    console.error(`mintlify:workflow --check · дрейф: ${drift.join(', ')}`);
    process.exitCode = 1;
  } else {
    console.log('mintlify:workflow --check · OK');
  }
} else {
  console.error('Usage: node scripts/mintlify-workflow-docs.mjs --render|--check');
  process.exitCode = 1;
}
