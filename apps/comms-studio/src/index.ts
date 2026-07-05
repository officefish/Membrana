/**
 * apps/comms-studio — контур внешних коммуникаций (Вариант A, leaf-воркспейс).
 *
 * Инвариант «сток, не исток»: контур читает канон живьём (fs-read рабочей копии), пишет
 * ТОЛЬКО в `out/`, и не импортирует `@membrana/*` (чтение ≠ импорт). Изоляция — по записи,
 * не по чтению. Агент живого чтения — CC8.
 */
import { CANON_SOURCES, LAYER_1_TRUTH, LAYER_2_FORM, LAYER_3_DERIVED } from './canon-sources.js';

/** Единственный разрешённый каталог выхода контура. */
export const OUT_DIR = 'out';

export { CANON_SOURCES, LAYER_1_TRUTH, LAYER_2_FORM, LAYER_3_DERIVED };

// CC8 — агент живого чтения: канон, tone-guard, писатель out/, оркестратор.
export { loadCanon, canonText, type CanonContext, type CanonDocument } from './canon.js';
export { checkTone, formatToneViolations, type ToneViolation, type ToneCategory } from './tone-guard.js';
export { writeArtifact, resolveOutPath, outDir, OutWriteError, type WriteResult } from './out-writer.js';
export { runAgent, refreshWorkingCopy, StaleRefreshError, type AgentOptions, type AgentRunResult, type Artifact, type Generate } from './agent.js';

// CC9 — генератор первого выхода v0.1 (seam-реализация).
export { describeComponents, lookupGlossaryTerm, V01_COMPONENTS, type GlossaryEntry } from './generator.js';
