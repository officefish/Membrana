#!/usr/bin/env node
/**
 * yarn verify:wire-sync — freshness-гейт wire-контракта node-realtime (#320).
 *
 * node-realtime-wire.ts в background-cabinet — ГЕНЕРИРУЕМЫЙ артефакт
 * (scripts/generate-wire-contract.mjs). Этот скрипт генерирует ожидаемый текст
 * в память и байтово сравнивает с checked-in файлом: расхождение = кто-то правил
 * core без перегенерации (или руками правил генерат) → exit 1.
 *
 * Строго сильнее прежней эвристики (значения событий + поля одного интерфейса):
 * сверяется ВЕСЬ контракт. Запускается в pre-push.
 *
 * Usage: yarn verify:wire-sync
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateWireSource, root, WIRE_TARGET } from './generate-wire-contract.mjs';

/** Нормализация переводов строк: git на Windows может выдать CRLF. */
export function normalizeEol(text) {
  return text.replace(/\r\n/g, '\n');
}

/**
 * @param {string} expected сгенерированный текст
 * @param {string} actual   checked-in файл
 * @returns {{ fresh: boolean, firstDiffLine: number | null }}
 */
export function wireFreshness(expected, actual) {
  const e = normalizeEol(expected);
  const a = normalizeEol(actual);
  if (e === a) return { fresh: true, firstDiffLine: null };
  const eLines = e.split('\n');
  const aLines = a.split('\n');
  const n = Math.max(eLines.length, aLines.length);
  for (let i = 0; i < n; i += 1) {
    if (eLines[i] !== aLines[i]) return { fresh: false, firstDiffLine: i + 1 };
  }
  return { fresh: false, firstDiffLine: null };
}

function main() {
  const expected = generateWireSource();
  const actual = readFileSync(resolve(root, WIRE_TARGET), 'utf8');
  const { fresh, firstDiffLine } = wireFreshness(expected, actual);
  if (fresh) {
    console.log('verify:wire-sync — OK (node-realtime-wire.ts свеж, core ↔ cabinet синхронны)');
    return;
  }
  console.error('verify:wire-sync — STALE: node-realtime-wire.ts расходится с core-каноном.');
  if (firstDiffLine !== null) {
    console.error(`  Первое расхождение: строка ${firstDiffLine} генерата.`);
  }
  console.error('  Файл генерируется, руками не правится. Запусти: yarn wire:generate');
  process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (e) {
    console.error(String(e?.message ?? e));
    process.exit(1);
  }
}
