/**
 * apps/comms-studio — контур внешних коммуникаций (Вариант A, leaf-воркспейс).
 *
 * Инвариант «сток, не исток»: контур читает канон живьём (fs-read рабочей копии), пишет
 * ТОЛЬКО в `out/`, и не импортирует `@membrana/*` (чтение ≠ импорт). Изоляция — по записи,
 * не по чтению. Агент живого чтения — CC8; здесь каркас и декларация источников канона.
 */
import { CANON_SOURCES, LAYER_1_TRUTH, LAYER_2_FORM, LAYER_3_DERIVED } from './canon-sources.js';

/** Единственный разрешённый каталог выхода контура. */
export const OUT_DIR = 'out';

export { CANON_SOURCES, LAYER_1_TRUTH, LAYER_2_FORM, LAYER_3_DERIVED };
