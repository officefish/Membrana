#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderProductTariffsFromFiles } from './lib/product-docs-tariffs.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gridPath = resolve(root, 'docs/tariffs/tariff-grid.json');
const scalarsPath = resolve(root, 'docs/tariffs/tariff-scalars.json');
const outputPath = resolve(root, 'apps/docs/product/tariffs.mdx');
const args = new Set(process.argv.slice(2));

if ([...args].some((arg) => !['--check', '--stdout'].includes(arg))) {
  console.error('Usage: node scripts/product-docs-tariffs.mjs [--check | --stdout]');
  process.exit(2);
}

try {
  const rendered = renderProductTariffsFromFiles(gridPath, scalarsPath);
  if (args.has('--stdout')) {
    process.stdout.write(rendered);
  } else if (args.has('--check')) {
    const current = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : null;
    if (current !== rendered) {
      console.error('docs:product:tariffs --check: DRIFT — пересобери `yarn docs:product:tariffs`.');
      process.exitCode = 1;
    } else {
      console.log('docs:product:tariffs --check: OK — MDX совпадает с тарифным каноном.');
    }
  } else {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, rendered);
    console.log('docs:product:tariffs → apps/docs/product/tariffs.mdx');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
