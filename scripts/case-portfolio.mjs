#!/usr/bin/env node
/**
 * yarn case:portfolio — сводка по кейсам (#1298): какие механизмы чаще дают ценность,
 * что повторяемо, что было везением, где не хватает доказательств.
 * Exit: 0; 2 — инструментальная ошибка.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listCases, portfolio } from './lib/case-store.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  const cases = listCases(repoRoot);
  const { byMechanism, luck, proofGaps } = portfolio(cases);
  console.log(`case:portfolio — ${cases.length} кейс(ов)\n`);
  console.log('| механизм | всего | повторяемо | условно | везение |');
  console.log('|----------|-------|------------|---------|---------|');
  const rows = [...byMechanism.entries()].sort((a, b) => b[1].total - a[1].total);
  for (const [m, r] of rows) console.log(`| ${m} | ${r.total} | ${r.repeatable} | ${r.conditional} | ${r.luck} |`);
  console.log(`\nВезение (не считать нормой): ${luck.length ? luck.join(', ') : '—'}`);
  console.log(`Недостача доказательств: ${proofGaps.length ? proofGaps.join('; ') : '—'}`);
  const broken = cases.filter((c) => c.problems.length > 0);
  if (broken.length > 0) {
    console.log(`\n⚠ подвал не полон у: ${broken.map((c) => c.id).join(', ')} — счёт по ним неполный (yarn case:register --validate)`);
  }
  return 0;
}

if (process.argv[1]?.endsWith('case-portfolio.mjs')) process.exit(main());
