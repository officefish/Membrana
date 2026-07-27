#!/usr/bin/env node
/**
 * yarn case:generalize — глагол-выход мастерской кейсов (#1298): кейс с повторяемостью
 * «повторяемо» номинируется в системную инструкцию (кандидат-гранула для каркасов
 * промптов). ТОЛЬКО номинация с вещдоками — в канон автоматически ничего не пишется;
 * без живых вещдоков кейс честно помечается «не готов».
 *
 * Пишет производный снимок docs/cases/registry/NOMINATIONS.md.
 * Exit: 0; 2 — инструментальная ошибка.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { listCases, nominations, renderNominations } from './lib/case-store.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function main() {
  const cases = listCases(repoRoot);
  const noms = nominations(cases);
  const regDir = join(repoRoot, 'docs', 'cases', 'registry');
  mkdirSync(regDir, { recursive: true });
  const out = renderNominations(noms, { date: new Date().toISOString().slice(0, 10) });
  writeFileSync(join(regDir, 'NOMINATIONS.md'), out, 'utf8');
  console.log(out);
  console.log(`case:generalize — готово к номинации: ${noms.ready.length}, ждёт вещдоков: ${noms.waiting.length}.`);
  console.log('Снимок: docs/cases/registry/NOMINATIONS.md. В канон — только рукой по слову владельца.');
  return 0;
}

if (process.argv[1]?.endsWith('case-generalize.mjs')) process.exit(main());
