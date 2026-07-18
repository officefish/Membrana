#!/usr/bin/env node
/**
 * git merge-driver для `docs/tasks/registry.json` (#476 п.1).
 *
 * Регистрируется `yarn prepare` (см. package.json) + `.gitattributes`:
 *   docs/tasks/registry.json merge=registry-union
 *
 * Git зовёт: node scripts/registry-merge-driver.mjs %O %A %B
 *   %O — база (общий предок), %A — наша версия (СЮДА пишем результат), %B — их.
 * exit 0 — слито; exit 1 — конфликт, git оставит маркеры/позовёт человека.
 *
 * Драйвер НЕ угадывает: карточку, изменённую обеими сторонами по-разному, он
 * отдаёт человеку. Тихо победившая сторона — это ровно то, как 2026-07-15 молча
 * откатилась правка 26 карточек (см. lib/registry-merge.mjs).
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { mergeRegistries } from './lib/registry-merge.mjs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const [basePath, oursPath, theirsPath] = process.argv.slice(2);

if (!basePath || !oursPath || !theirsPath) {
  console.error('registry-merge-driver: ожидаются %O %A %B');
  process.exitCode = 2;
} else {
  try {
    const result = mergeRegistries(readJson(basePath), readJson(oursPath), readJson(theirsPath));
    if (!result.ok) {
      console.error(`registry-merge-driver: ручной разбор — ${result.conflicts.length} карточек:`);
      for (const c of result.conflicts) console.error(`  ${c.id} — ${c.reason}`);
      console.error('Слить нельзя без потери работы: обе стороны правили одну карточку.');
      process.exitCode = 1;
    } else {
      // Пишем в %A — git ждёт результат именно там.
      writeFileSync(oursPath, JSON.stringify(result.registry, null, 2) + '\n', 'utf8');
      console.error(`registry-merge-driver: слито, карточек ${result.registry.tasks.length}`);
      process.exitCode = 0;
    }
  } catch (e) {
    // Битый JSON с любой стороны — не наше дело угадывать; отдаём человеку.
    console.error(`registry-merge-driver: ${e.message}`);
    process.exitCode = 1;
  }
}
