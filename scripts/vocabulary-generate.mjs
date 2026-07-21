#!/usr/bin/env node
/**
 * yarn vocabulary:generate — проекция VOCABULARY.md из источника словаря.
 *
 * Источник истины: docs/procedures/vocabulary.json (вердикт M2 — единственный
 * машиночитаемый). Проекция генерится, руками не правится; --check сверяет,
 * что проекция не разъехалась с источником (зуб для CI).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderVocabularyMd, vocabularySchemaProblems } from './lib/vocabulary-check.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = resolve(repoRoot, 'docs/procedures/vocabulary.json');
const outPath = resolve(repoRoot, 'docs/procedures/VOCABULARY.md');

const v = JSON.parse(readFileSync(srcPath, 'utf8'));
const problems = vocabularySchemaProblems(v);
if (problems.length > 0) {
  console.error(`✖ источник словаря невалиден (${problems.length}):`);
  for (const p of problems) console.error(`  ✖ ${p}`);
  process.exit(1);
}

const md = renderVocabularyMd(v);
if (process.argv.includes('--check')) {
  let current = '';
  try { current = readFileSync(outPath, 'utf8'); } catch { /* нет проекции — дрейф */ }
  if (current !== md) {
    console.error('✖ VOCABULARY.md разъехался с источником — перегенерируй: yarn vocabulary:generate');
    process.exit(1);
  }
  console.log('VOCABULARY.md синхронен с источником.');
} else {
  writeFileSync(outPath, md);
  console.log(`Проекция: docs/procedures/VOCABULARY.md (${v.categories.length} статей)`);
}
