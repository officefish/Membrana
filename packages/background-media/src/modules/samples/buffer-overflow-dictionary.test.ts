/**
 * Структурный зуб «словарь — один модуль» (вердикт M2 (г), #2307): копии строк запрещены.
 *
 * Предмет (расширен на интеграции коворка `cowork-buffer-full-stop`, инвариант I11 контракта):
 * боевые исходники `packages/plugin-contracts/src` (носитель словаря), `packages/background-media`
 * (`src` + `scripts`; сервер, который чеканит), `packages/background-cabinet/src`,
 * `packages/services/media-library/src`, `apps/client/src`, `apps/cabinet/src`.
 *
 * Правило исключения (названо явно): не сканируются файлы зубов `*.test.ts(x)` / `*.spec.ts` —
 * в фикстурах тестов строковые литералы законны (тело отказа, порчи); каталоги `stubs/` не
 * исключаются, а ЗАПРЕЩЕНЫ в зонах трёх блоков (регламент коворка: стаб, доживший до
 * интеграции, — дефект).
 *
 * Нормы:
 *  - каждый литерал причины существует РОВНО в двух файлах — `reasons.ts` словаря (SOT) и mapper
 *    media (`buffer-overflow-refusal.ts`, где сервер чеканит через `satisfies`);
 *  - литерал режима `smart_cleanup` — в словаре (`refusal.ts`), в mapper media и в ЕДИНСТВЕННОМ
 *    назначенном носителе кабинетного сервера (`membrane/buffer-policy.ts`, `satisfies`): оба
 *    сервера — CommonJS и рантайм-объект ESM-словаря статически не импортируют; плюс генерат
 *    wire кабинета (`domain/node-realtime-wire.ts` — байтовое зеркало `@membrana/core`, его
 *    сторожит `verify:wire-sync`). Всё остальное — только импорт `OVERFLOW_POLICIES`/типов;
 *  - относительных импортов из `plugin-contracts/src` в боевом коде нет (A-2);
 *  - временной константы `overflow-policy.temporary.ts` нет (A-1); стабов блоков нет (A-3, BC-1).
 *
 * Порчи → красный: строка `'device_buffer_full'` в DTO/контроллере/клиенте; вторая копия
 * `'smart_cleanup'` в любом файле кабинета/клиента/библиотеки; `PayloadTooLargeException`
 * вернулся в модуль samples; mapper перестал чеканить один из двух; рантайм-набор mapper'а
 * разошёлся со словарём; вернулся каталог `stubs/` или временный файл.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { BUFFER_OVERFLOW_REASONS, OVERFLOW_POLICIES } from '../../../../plugin-contracts/src/buffer-overflow/index.js';
import { BUFFER_OVERFLOW_REASON_VALUES, OVERFLOW_POLICY_VALUES } from './buffer-overflow-refusal';

const HERE = dirname(fileURLToPath(import.meta.url));
const MEDIA_ROOT = resolve(HERE, '..', '..', '..');
const PACKAGES_ROOT = resolve(MEDIA_ROOT, '..');
const REPO_ROOT = resolve(PACKAGES_ROOT, '..');

const DICTIONARY_FILE = 'packages/plugin-contracts/src/buffer-overflow/reasons.ts';
const POLICY_FILE = 'packages/plugin-contracts/src/buffer-overflow/refusal.ts';
const MAPPER_FILE = 'packages/background-media/src/modules/samples/buffer-overflow-refusal.ts';
/** CJS-сервер кабинета: единственный назначенный носитель литерала режима (B-1, `satisfies`). */
const CABINET_POLICY_CARRIER = 'packages/background-cabinet/src/modules/membrane/buffer-policy.ts';
/** Генерат `yarn wire:generate` — зеркало `@membrana/core`, сверяется `verify:wire-sync`. */
const CABINET_WIRE_GENERATED = 'packages/background-cabinet/src/domain/node-realtime-wire.ts';

const SCAN_ROOTS: ReadonlyArray<{ dir: string; exts: readonly string[] }> = [
  { dir: resolve(PACKAGES_ROOT, 'plugin-contracts', 'src'), exts: ['.ts'] },
  { dir: resolve(MEDIA_ROOT, 'src'), exts: ['.ts'] },
  { dir: resolve(MEDIA_ROOT, 'scripts'), exts: ['.mjs', '.ts'] },
  { dir: resolve(PACKAGES_ROOT, 'background-cabinet', 'src'), exts: ['.ts'] },
  { dir: resolve(PACKAGES_ROOT, 'services', 'media-library', 'src'), exts: ['.ts', '.tsx'] },
  { dir: resolve(REPO_ROOT, 'apps', 'client', 'src'), exts: ['.ts', '.tsx'] },
  { dir: resolve(REPO_ROOT, 'apps', 'cabinet', 'src'), exts: ['.ts', '.tsx'] },
];

/** Зоны трёх блоков коворка, где каталог `stubs/` после интеграции — дефект. */
const BLOCK_ZONES_WITHOUT_STUBS = [
  'apps/client/src/lib/device-overflow-hold',
  'apps/client/src/lib/buffer-policy',
  'packages/background-media/src/modules/samples',
  'packages/background-media/src/modules/devices',
  'packages/plugin-contracts/src/buffer-overflow',
];

const REMOVED_ON_INTEGRATION = [
  'packages/background-media/src/modules/samples/overflow-policy.temporary.ts',
  'apps/client/src/lib/device-overflow-hold/stubs/effective-policy.stub.ts',
  'apps/client/src/lib/device-overflow-hold/stubs/refusal-contract.stub.ts',
  'apps/client/src/lib/buffer-policy/stubs/quota-source.stub.ts',
];

function isTestFile(entry: string): boolean {
  return /\.test\.tsx?$/u.test(entry) || /\.spec\.tsx?$/u.test(entry);
}

function productionFiles(dir: string, exts: readonly string[], acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      productionFiles(full, exts, acc);
      continue;
    }
    if (!exts.some((ext) => entry.endsWith(ext))) continue;
    if (isTestFile(entry)) continue;
    acc.push(full);
  }
  return acc;
}

function scanned(): ReadonlyArray<{ rel: string; src: string }> {
  return SCAN_ROOTS.flatMap(({ dir, exts }) => productionFiles(dir, exts)).map((full) => ({
    rel: relative(REPO_ROOT, full).replace(/\\/gu, '/'),
    src: readFileSync(full, 'utf8'),
  }));
}

/** Судится КОД: строки комментариев (`//`, `*`, `/*`, `{/*`) снимаются — упоминание в доке не копия. */
function codeOf(src: string): string {
  return src
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/u.test(line))
    .join('\n');
}

function filesQuoting(literal: string, files: ReadonlyArray<{ rel: string; src: string }>): string[] {
  const quoted = new RegExp(`['"\`]${literal}['"\`]`, 'u');
  return files.filter(({ src }) => quoted.test(codeOf(src))).map(({ rel }) => rel).sort();
}

describe('словарь отказа — один носитель (M2 (г), I11)', () => {
  const files = scanned();

  it('предмет проверки не пуст: взяты боевые исходники пакетов и приложений, без зубов', () => {
    expect(files.length).toBeGreaterThan(300);
    for (const must of [DICTIONARY_FILE, MAPPER_FILE, CABINET_POLICY_CARRIER, 'apps/client/src/lib/device-overflow-hold/wiring.ts', 'apps/cabinet/src/api/membrane.ts', 'packages/services/media-library/src/buffer-stop.ts']) {
      expect(files.some(({ rel }) => rel === must), must).toBe(true);
    }
    expect(files.some(({ rel }) => isTestFile(rel))).toBe(false);
  });

  it.each(Object.values(BUFFER_OVERFLOW_REASONS))(
    'литерал %s существует ровно в двух файлах: словарь (SOT) и mapper сервера',
    (literal) => {
      expect(filesQuoting(literal, files)).toEqual([MAPPER_FILE, DICTIONARY_FILE].sort());
    },
  );

  it('литерал политики smart_cleanup — словарь, mapper media, носитель CJS-кабинета и генерат wire', () => {
    expect(filesQuoting(OVERFLOW_POLICIES.SMART_CLEANUP, files)).toEqual(
      [POLICY_FILE, MAPPER_FILE, CABINET_POLICY_CARRIER, CABINET_WIRE_GENERATED].sort(),
    );
  });

  it('назначенный носитель кабинета сверяет свои строки со словарём типом (satisfies), не на слово', () => {
    const carrier = files.find(({ rel }) => rel === CABINET_POLICY_CARRIER);
    expect(carrier?.src).toMatch(/as const satisfies readonly OverflowPolicy\[\]/u);
    expect(carrier?.src).toMatch(/from '@membrana\/plugin-contracts' with \{ 'resolution-mode': 'import' \}/u);
  });

  it('рантайм-набор mapper\'а равен словарю — сервер чеканит ровно то, что объявлено', () => {
    expect([...BUFFER_OVERFLOW_REASON_VALUES].sort()).toEqual(Object.values(BUFFER_OVERFLOW_REASONS).sort());
    expect([...OVERFLOW_POLICY_VALUES].sort()).toEqual(Object.values(OVERFLOW_POLICIES).sort());
  });

  it('A-2: боевой код не импортирует словарь по относительному пути к src соседа', () => {
    const offenders = files
      .filter(({ src }) => /plugin-contracts\/src\//u.test(codeOf(src)))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it('A-1 / A-3 / BC-1: временной константы и стабов блоков в ветке нет', () => {
    for (const rel of REMOVED_ON_INTEGRATION) {
      expect(existsSync(resolve(REPO_ROOT, rel)), `${rel} должен быть удалён`).toBe(false);
    }
    for (const zone of BLOCK_ZONES_WITHOUT_STUBS) {
      expect(existsSync(resolve(REPO_ROOT, zone, 'stubs')), `${zone}/stubs не должен существовать`).toBe(false);
    }
  });

  it('413 больше не описывает квоту: PayloadTooLargeException не встречается в модуле samples', () => {
    const offenders = files
      .filter(({ rel }) => rel.startsWith('packages/background-media/src/modules/samples/'))
      .filter(({ src }) => src.includes('PayloadTooLargeException'))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it('боевой код media не несёт английский текст квоты как сигнал (413-эпоха закрыта)', () => {
    // Только `src/**`: `scripts/verify-swagger.mjs` содержит ту же фразу как предмет СВОЕЙ порчи
    // («413 не должен описывать квоту»), и это не сигнал, а сторож.
    const offenders = files
      .filter(({ rel }) => rel.startsWith('packages/background-media/src/'))
      .filter(({ src }) => /quota exceeded/iu.test(src))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });
});
