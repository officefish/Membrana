#!/usr/bin/env node
// Verify (or --fix) that each app's tailwind.config `content` covers the src/ of every
// @membrana UI package it transitively depends on. Source of truth: `tailwind-content`
// frontmatter in each UI package README. See docs/prompts/TAILWIND_COVERAGE_HARDENING_PROMPT.md.
//
//   node scripts/generate-tailwind-configs.mjs          # verify, exit 1 if any app under-covers
//   node scripts/generate-tailwind-configs.mjs --fix     # inject missing globs into configs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { TAILWIND_APPS, findMissingCoverage } from './lib/tailwind-coverage.mjs';

function injectMissing(appDir, missing, cwd = process.cwd()) {
  const configPath = resolve(cwd, appDir, 'tailwind.config.js');
  const text = readFileSync(configPath, 'utf8');
  const block = text.match(/(content:\s*\[)([\s\S]*?)(\n\s*\])/u);
  if (!block) throw new Error(`${appDir}: не найден content: [...] в tailwind.config.js`);
  const indent = block[2].match(/\n(\s*)['"]/u)?.[1] ?? '    ';
  const additions = missing.map((glob) => `${indent}'${glob}',`).join('\n');
  const replaced = text.replace(block[0], `${block[1]}${block[2]}\n${additions}${block[3]}`);
  writeFileSync(configPath, replaced, 'utf8');
}

function main() {
  const fix = process.argv.includes('--fix');
  const report = findMissingCoverage();
  const offenders = Object.entries(report).filter(([, missing]) => missing.length > 0);

  if (offenders.length === 0) {
    console.log(`OK: tailwind content покрывает все UI-пакеты (${TAILWIND_APPS.join(', ')})`);
    return;
  }

  if (fix) {
    for (const [appDir, missing] of offenders) {
      injectMissing(appDir, missing);
      console.log(`Исправлено ${appDir}: +${missing.length} путей`);
    }
    console.log('Готово. Перепроверь: yarn verify:tailwind-coverage');
    return;
  }

  console.error('Tailwind coverage НЕ полное — пропущены пути в content:');
  for (const [appDir, missing] of offenders) {
    console.error(`\n  ${appDir}/tailwind.config.js:`);
    for (const glob of missing) console.error(`    - ${glob}`);
  }
  console.error('\nЗапусти `yarn tailwind:configs:fix` (или добавь пути вручную).');
  process.exit(1);
}

main();
