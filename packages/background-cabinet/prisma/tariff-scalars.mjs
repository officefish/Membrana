/**
 * Числовые потолки тарифов — ЧТЕНИЕ ДЕКЛАРАЦИИ, не второй источник (S0 плана
 * интеграции тарифной сетки, заседание `tariff-grid`, ратифицировано 29.07).
 *
 * Дом чисел — `docs/tariffs/tariff-scalars.json`. Сид и будущие носители читают
 * отсюда; дублировать значения в коде запрещено — иначе декларация и носитель
 * разъедутся молча (зуб `tariff_scalars_declared`, вещдок 29.07: сид нёс 1 ГБ,
 * когда владелец назвал 512 МБ).
 *
 * Легальное «нет»: значение может быть `null` — тогда рядом обязана лежать
 * причина в поле `<имя>_note`. Молчаливое отсутствие — дефект, не «пока так».
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DECLARATION_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/tariffs/tariff-scalars.json',
);

/** Поля-числа, для которых обязательна причина при `null`. */
export const NULLABLE_SCALARS = Object.freeze([
  'userStorageQuotaMiB',
  'coldStorageQuotaMiB',
  'bufferQuotaMiB',
  'maxUserWorkspaces',
  'maxActiveKeysPerNode',
  'datasetCatalogId',
  'datasetSounds',
]);

/** Мебибайт в байтах — единица объявления объёмов в декларации. */
export const MIB = 1024n * 1024n;

/** Читает декларацию с диска (без кеша — сид исполняется однократно). */
export function loadDeclaration(path = DECLARATION_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Тариф по id. Отсутствие — громкий отказ: сид не вправе выдумывать числа.
 * @param {string} id @param {object} [declaration]
 */
export function tariffScalars(id, declaration = loadDeclaration()) {
  const found = (declaration.tariffs ?? []).find((t) => t.id === id);
  if (!found) {
    throw new Error(
      `tariff-scalars: тариф «${id}» не объявлен в docs/tariffs/tariff-scalars.json — ` +
        'числа берутся только из декларации (S0)',
    );
  }
  return found;
}

/**
 * МиБ → байты для Prisma BigInt. `null` пробрасывается как null: незаявленное
 * значение не превращается в ноль (ноль — это «нельзя ничего», а не «неизвестно»).
 * @param {number|null|undefined} mib
 */
export function mibToBytes(mib) {
  return mib == null ? null : BigInt(mib) * MIB;
}

/**
 * Находки декларации: `null` без причины и неизвестные поля-числа.
 * Чистая функция — зуб `tariff_scalars_declared` строится на ней.
 * @param {object} declaration
 * @returns {string[]} находки поимённо (пусто — декларация честна)
 */
export function declarationFindings(declaration) {
  const findings = [];
  for (const tariff of declaration?.tariffs ?? []) {
    for (const field of NULLABLE_SCALARS) {
      if (!(field in tariff)) continue;
      if (tariff[field] == null && !String(tariff[`${field}_note`] ?? '').trim()) {
        findings.push(
          `${tariff.id}.${field}: значение не объявлено и причина не названа — ` +
            `легальное «нет» требует поля ${field}_note`,
        );
      }
    }
  }
  return findings;
}
