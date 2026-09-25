#!/usr/bin/env node
/**
 * git merge-driver для ЛЕНТЫ СНИМКОВ сети `docs/network/history/*.jsonl`.
 *
 * Регистрируется `yarn prepare` (package.json) + `.gitattributes`:
 *   docs/network/history/**\/*.jsonl merge=network-history
 *
 * Git зовёт: node scripts/network/history-merge.mjs %O %A %B
 *   %O — база, %A — наша сторона (СЮДА пишем результат), %B — их.
 * exit 0 — слито; exit 1 — отдаём человеку.
 *
 * Почему не встроенный `union` — в шапке `lib/history-merge.mjs`: лента это ряд ЗАМЕРОВ,
 * а не журнал событий, и союз рождает точный повтор момента с перепутанным порядком.
 *
 * Проверить руками (без git):
 *   yarn network:history-merge base.jsonl ours.jsonl theirs.jsonl
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { mergeHistories, parseHistory, renderHistory } from './lib/history-merge.mjs';

const [basePath, oursPath, theirsPath] = process.argv.slice(2);

if (!basePath || !oursPath || !theirsPath) {
  console.error('network-history-merge: ожидаются %O %A %B');
  process.exitCode = 2;
} else {
  try {
    const sides = { base: basePath, ours: oursPath, theirs: theirsPath };
    const parsed = {};
    const problems = [];
    for (const [name, path] of Object.entries(sides)) {
      const r = parseHistory(readFileSync(path, 'utf8'));
      if (!r.ok) problems.push(...r.problems.map((p) => `${name}: ${p}`));
      else parsed[name] = r.entries;
    }
    if (problems.length) {
      // Битую строку драйвер не «чинит» молча: молчаливая починка теряет замер.
      console.error('network-history-merge: ручной разбор — лента не читается:');
      for (const p of problems) console.error(`  ${p}`);
      process.exitCode = 1;
    } else {
      const r = mergeHistories(parsed.base, parsed.ours, parsed.theirs);
      writeFileSync(oursPath, renderHistory(r.entries), 'utf8');
      const tail = r.redefined.length
        ? `; один момент записан обеими сторонами по-разному (${r.redefined.length}) — взята наша сторона: ${r.redefined.join(', ')}`
        : '';
      console.error(
        `network-history-merge: замеров ${r.entries.length}, новых ${r.added}, двойников снято ${r.duplicates}${tail}`,
      );
      process.exitCode = 0;
    }
  } catch (e) {
    console.error(`network-history-merge: ${e.message}`);
    process.exitCode = 1;
  }
}
