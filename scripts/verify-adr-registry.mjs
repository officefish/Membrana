#!/usr/bin/env node
/**
 * yarn verify:adr-registry — зуб полноты реестра ADR (#2412).
 *
 * `docs/adr/README.md` объявляет: «Реестр обязан содержать все ADR». Объявление было, а
 * исполнения не было — `ADR-0027` и `ADR-0028` лежали в каталоге без строк. Зуб исполняет
 * объявленное требование: запись без строки и строка без записи — обе находки.
 *
 * Обоснование и границы — в `scripts/lib/adr-registry.mjs`; здесь чтение ФС и печать.
 *
 * Usage:
 *   node scripts/verify-adr-registry.mjs
 *   node scripts/verify-adr-registry.mjs --json
 *
 * Exit: 0 — реестр полон · 1 — есть находки · 2 — ошибка входа (предмет потерян).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registryGaps } from './lib/adr-registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ADR_DIR = join(ROOT, 'docs', 'adr');
export const ADR_README = join(ADR_DIR, 'README.md');

function main(argv) {
  const asJson = argv.includes('--json');

  // предмет проверки — первым и отдельной фразой: без каталога и реестра судить нечего,
  // и молчать об этом нельзя (иначе зуб зелен на пустоте).
  if (!existsSync(ADR_DIR)) throw new Error(`предмет зуба потерян: нет каталога ${ADR_DIR}`);
  if (!existsSync(ADR_README)) throw new Error(`предмет зуба потерян: нет реестра ${ADR_README}`);

  const files = readdirSync(ADR_DIR, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);
  const readme = readFileSync(ADR_README, 'utf8');
  const gaps = registryGaps(files, readme);
  const ok =
    gaps.missingRows.length === 0 &&
    gaps.danglingRows.length === 0 &&
    gaps.duplicateNumbers.length === 0;

  if (asJson) {
    console.log(JSON.stringify({ ok, ...gaps }, null, 2));
  } else if (ok) {
    console.log(`verify:adr-registry — ✓ реестр полон: все записи каталога docs/adr имеют строку`);
  } else {
    for (const f of gaps.missingRows) {
      console.error(`  ✗ ${f} лежит в каталоге, но строки в README.md нет — запись невидима`);
    }
    for (const f of gaps.danglingRows) {
      console.error(`  ✗ README.md ссылается на ${f}, а файла нет — реестр врёт о наличии`);
    }
    for (const d of gaps.duplicateNumbers) {
      console.error(`  ✗ номер ${d.number} занят дважды: ${d.files.join(', ')} — номер уникален`);
    }
    console.error('  требование объявлено самим реестром: «Реестр обязан содержать все ADR:');
    console.error('  запись без строки здесь невидима — её не найдёт ни человек, ни агент».');
    console.error('  лекарство: добавить строку в таблицу «Реестр» (или убрать мёртвую ссылку).');
  }
  return ok ? 0 : 1;
}

if (process.argv[1]?.endsWith('verify-adr-registry.mjs')) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (error) {
    console.error(`verify:adr-registry — ошибка входа: ${error?.message ?? error}`);
    process.exit(2);
  }
}
