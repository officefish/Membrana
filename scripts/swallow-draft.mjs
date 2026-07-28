#!/usr/bin/env node
/**
 * yarn swallow:draft — черновик ласточки СРАЗУ по скелету гейта (помеха №3, 28.07):
 * вчера черновик подгонялся под гейт тремя заходами; скелет существовал, но
 * черновик писался с чистого листа.
 *
 *   yarn swallow:draft [--kind day|evening] [--out <путь>]
 *
 * Пишет docs/comms/drafts/swallow-<kind>-<date>.md РОВНО в структуре
 * buildSwallowSkeleton (5 строк-зеркал + «Детали:»). Существующий черновик не
 * перетирается (написанные слова дороже заготовки). Слова — ведущей через линзу
 * Ожегова: заготовка структурная, не смысловая (урок #768: склейка наследует жаргон).
 *
 * Дальше по цепочке: заполнить <…> словами → yarn morning:gate swallow --draft <файл>
 * → показать капитану → --ack → yarn telegram:swallow --file <файл>.
 *
 * Exit: 0 — создан/уже есть; 2 — usage/ФС.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildSwallowSkeleton } from './lib/swallow-mirror.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 && argv[i + 1] != null && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};

/** Скелет под время суток: вечерняя ласточка меняет только интро-строку. */
export function skeletonFor(kind) {
  const base = buildSwallowSkeleton();
  if (kind === 'evening') {
    return base.replace(/^Доброе утро![^\n]*/u, 'Добрый вечер! <итоги одной-двумя фразами>');
  }
  return base;
}

function main() {
  const kind = flag('kind') ?? 'evening';
  if (kind !== 'day' && kind !== 'evening') {
    console.error('swallow:draft — --kind из (day|evening)');
    return 2;
  }
  const date = new Date().toISOString().slice(0, 10);
  const rel = flag('out') ?? `docs/comms/drafts/swallow-${kind}-${date}.md`;
  const abs = join(repoRoot, rel);
  if (existsSync(abs)) {
    console.log(`swallow:draft — черновик уже есть: ${rel} (не перетираю — слова дороже заготовки)`);
    console.log(`  гейт: yarn morning:gate swallow --draft ${rel}`);
    return 0;
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, `${skeletonFor(kind)}\n`, 'utf8');
  console.log(`swallow:draft — заготовка по скелету гейта: ${rel}`);
  console.log('  дальше: заполнить <…> словами через линзу Ожегова → yarn morning:gate swallow --draft ' + rel + ' → показать капитану → --ack → yarn telegram:swallow --file ' + rel);
  return 0;
}

if (process.argv[1]?.endsWith('swallow-draft.mjs')) process.exit(main());
