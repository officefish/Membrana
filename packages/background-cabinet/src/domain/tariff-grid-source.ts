/**
 * Загрузка документа тарифной сетки и переключатель режима
 * (S3 плана интеграции; заседание `tariff-grid`, ратифицировано владельцем 29.07).
 *
 * Отделено от чистых модулей нарочно: `tariff-grid`, `tariff-resolve` и
 * `tariff-projection` не знают ни про ФС, ни про переменные окружения — их
 * можно проверять и переиспользовать. Вся грязь (диск, env, кеш) живёт здесь.
 *
 * **Режим сетки выключен по умолчанию.** Переключение на неё как на единственный
 * источник истины — отдельный шаг плана (S9), и делается оно после готовности
 * всех предыдущих и зелёных зубов, а не тихо вместе с проводкой.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

import { validateTariffGrid, type TariffGridDocument } from './tariff-grid';

/** Где лежит документ относительно корня репозитория. */
export const TARIFF_GRID_PATH = 'docs/tariffs/tariff-grid.json';

/** Сколько уровней вверх искать корень. Монорепо глубже не бывает. */
const MAX_LOOKUP_DEPTH = 6;

let cached: TariffGridDocument | undefined;
let cacheAttempted = false;

/**
 * Абсолютный путь к документу. Ищем ВВЕРХ от текущего каталога, а не считаем
 * его от `cwd`: сервер запускается и из корня монорепо, и из своего пакета, и
 * из образа — привязка к `cwd` дала бы «документа нет» там, где он есть.
 * Абсолютный путь берётся как есть.
 */
export function resolveGridPath(path: string = TARIFF_GRID_PATH, from: string = process.cwd()): string | undefined {
  if (isAbsolute(path)) return existsSync(path) ? path : undefined;
  let dir = from;
  for (let depth = 0; depth < MAX_LOOKUP_DEPTH; depth += 1) {
    const candidate = resolve(dir, path);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

/**
 * Документ сетки с диска. Читается однократно за процесс: сетка — декларация,
 * а не состояние. Битая форма — `undefined` с громким сообщением, а не половина
 * матрицы: работать по испорченному контракту прав хуже, чем по легаси.
 */
export function loadTariffGrid(path: string = TARIFF_GRID_PATH): TariffGridDocument | undefined {
  if (cacheAttempted) return cached;
  cacheAttempted = true;

  const absolute = resolveGridPath(path);
  if (!absolute) {
    cached = undefined;
    return cached;
  }

  try {
    const parsed = JSON.parse(readFileSync(absolute, 'utf8')) as TariffGridDocument;
    const findings = validateTariffGrid(parsed);
    if (findings.length > 0) {
      // Молчаливый зелёный запрещён: находки называются поимённо (норма M7).
      for (const f of findings) {
        console.error(`[tariff-grid] ✖ [${f.toothId}] ${f.where} — ${f.reason}`);
      }
      console.error('[tariff-grid] документ отвергнут — права остаются на прежнем авторе');
      cached = undefined;
      return cached;
    }
    cached = parsed;
  } catch (e) {
    console.error(`[tariff-grid] документ не прочитан: ${(e as Error).message}`);
    cached = undefined;
  }
  return cached;
}

/**
 * Включён ли режим сетки как источника истины. Выключен по умолчанию —
 * переключение это шаг S9, а не побочный эффект выкатки S3.
 */
export function isTariffGridMode(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.TARIFF_GRID_MODE === '1';
}

/** Сброс кеша — для тестов; в рантайме документ читается один раз. */
export function resetTariffGridCache(): void {
  cached = undefined;
  cacheAttempted = false;
}
