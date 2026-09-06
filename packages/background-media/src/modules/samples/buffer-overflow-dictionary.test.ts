/**
 * Структурный зуб «словарь — один модуль» (вердикт M2 (г), #2307): три копии строк запрещены.
 *
 * Предмет — исходники двух пакетов: `packages/plugin-contracts/src/**` (носитель словаря) и
 * `packages/background-media/src/**` + `scripts/*.mjs` (сервер, который чеканит). Боевые файлы —
 * без `*.test.ts` и каталогов `stubs/` (стабы соседей по регламенту коворка не в счёт до
 * интеграции; после — их нет).
 *
 * Норма: каждый литерал причины существует РОВНО в двух файлах — `reasons.ts` словаря (SOT) и
 * mapper media (`buffer-overflow-refusal.ts`, где сервер чеканит через `satisfies`). Всё
 * остальное в media (DTO, контроллер, verify-swagger) берёт значения оттуда.
 *
 * Порчи → красный: строка `'device_buffer_full'` в DTO или контроллере; `PayloadTooLargeException`
 * вернулся в модуль samples (413 снова описывает квоту); mapper перестал чеканить один из двух;
 * рантайм-набор mapper'а разошёлся со словарём.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BUFFER_OVERFLOW_REASONS, OVERFLOW_POLICIES } from '../../../../plugin-contracts/src/buffer-overflow/index.js';
import { BUFFER_OVERFLOW_REASON_VALUES, OVERFLOW_POLICY_VALUES } from './buffer-overflow-refusal';

const HERE = dirname(fileURLToPath(import.meta.url));
const MEDIA_ROOT = resolve(HERE, '..', '..', '..');
const PACKAGES_ROOT = resolve(MEDIA_ROOT, '..');
const CONTRACTS_SRC = resolve(PACKAGES_ROOT, 'plugin-contracts', 'src');

const DICTIONARY_FILE = 'plugin-contracts/src/buffer-overflow/reasons.ts';
const POLICY_FILE = 'plugin-contracts/src/buffer-overflow/refusal.ts';
const MAPPER_FILE = 'background-media/src/modules/samples/buffer-overflow-refusal.ts';

function productionFiles(dir: string, exts: readonly string[], acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'stubs' || entry === 'node_modules' || entry === 'dist') continue;
      productionFiles(full, exts, acc);
      continue;
    }
    if (!exts.some((ext) => entry.endsWith(ext))) continue;
    if (entry.endsWith('.test.ts') || entry.endsWith('.spec.ts')) continue;
    acc.push(full);
  }
  return acc;
}

function scanned(): ReadonlyArray<{ rel: string; src: string }> {
  const files = [
    ...productionFiles(CONTRACTS_SRC, ['.ts']),
    ...productionFiles(resolve(MEDIA_ROOT, 'src'), ['.ts']),
    ...productionFiles(resolve(MEDIA_ROOT, 'scripts'), ['.mjs', '.ts']),
  ];
  return files.map((full) => ({
    rel: relative(PACKAGES_ROOT, full).replace(/\\/gu, '/'),
    src: readFileSync(full, 'utf8'),
  }));
}

function filesQuoting(literal: string, files: ReadonlyArray<{ rel: string; src: string }>): string[] {
  const quoted = new RegExp(`['"\`]${literal}['"\`]`, 'u');
  return files.filter(({ src }) => quoted.test(src)).map(({ rel }) => rel).sort();
}

describe('словарь отказа — один носитель (M2 (г))', () => {
  const files = scanned();

  it('предмет проверки не пуст: взяты исходники обоих пакетов', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files.some(({ rel }) => rel === DICTIONARY_FILE)).toBe(true);
    expect(files.some(({ rel }) => rel === MAPPER_FILE)).toBe(true);
  });

  it.each(Object.values(BUFFER_OVERFLOW_REASONS))(
    'литерал %s существует ровно в двух файлах: словарь (SOT) и mapper сервера',
    (literal) => {
      expect(filesQuoting(literal, files)).toEqual([MAPPER_FILE, DICTIONARY_FILE].sort());
    },
  );

  it('литерал политики smart_cleanup — только словарь и mapper (swagger-enum читает mapper)', () => {
    expect(filesQuoting(OVERFLOW_POLICIES.SMART_CLEANUP, files)).toEqual([MAPPER_FILE, POLICY_FILE].sort());
  });

  it('рантайм-набор mapper\'а равен словарю — сервер чеканит ровно то, что объявлено', () => {
    expect([...BUFFER_OVERFLOW_REASON_VALUES].sort()).toEqual(Object.values(BUFFER_OVERFLOW_REASONS).sort());
    expect([...OVERFLOW_POLICY_VALUES].sort()).toEqual(Object.values(OVERFLOW_POLICIES).sort());
  });

  it('413 больше не описывает квоту: PayloadTooLargeException не встречается в модуле samples', () => {
    const offenders = files
      .filter(({ rel }) => rel.startsWith('background-media/src/modules/samples/'))
      .filter(({ src }) => src.includes('PayloadTooLargeException'))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it('боевой код media не несёт английский текст квоты как сигнал (413-эпоха закрыта)', () => {
    // Только `src/**`: `scripts/verify-swagger.mjs` содержит ту же фразу как предмет СВОЕЙ порчи
    // («413 не должен описывать квоту»), и это не сигнал, а сторож.
    const offenders = files
      .filter(({ rel }) => rel.startsWith('background-media/src/'))
      .filter(({ src }) => /quota exceeded/iu.test(src))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });
});
