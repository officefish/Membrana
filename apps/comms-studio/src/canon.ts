/**
 * CC8 — живое чтение канона контуром communications.
 *
 * Читает канон (Слой 1–3) через `fs`-read рабочей копии, НЕ через `import @membrana/*`
 * (чтение ≠ импорт). Пути — из `canon-sources.ts`. Отсутствующий источник помечается
 * `available: false`, а не выдумывается (агент не галлюцинирует факты).
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CANON_SOURCES, LAYER_1_TRUTH, LAYER_2_FORM, LAYER_3_DERIVED } from './canon-sources.js';

export interface CanonDocument {
  readonly path: string;
  readonly layer: 1 | 2 | 3;
  readonly available: boolean;
  readonly text: string;
}

export interface CanonContext {
  readonly repoRoot: string;
  readonly documents: readonly CanonDocument[];
  /** Пути объявленного канона, которых нет в рабочей копии (агент их не использует как факт). */
  readonly missing: readonly string[];
}

function layerOf(path: string): 1 | 2 | 3 {
  if ((LAYER_1_TRUTH as readonly string[]).includes(path)) return 1;
  if ((LAYER_2_FORM as readonly string[]).includes(path)) return 2;
  if ((LAYER_3_DERIVED as readonly string[]).includes(path)) return 3;
  return 3;
}

/**
 * Загружает канон живьём из рабочей копии.
 * @param repoRoot корень монорепо (рабочей копии).
 */
export function loadCanon(repoRoot: string): CanonContext {
  const documents: CanonDocument[] = [];
  const missing: string[] = [];
  for (const rel of CANON_SOURCES) {
    const abs = resolve(repoRoot, rel);
    const available = existsSync(abs);
    if (!available) missing.push(rel);
    documents.push({
      path: rel,
      layer: layerOf(rel),
      available,
      text: available ? readFileSync(abs, 'utf8') : '',
    });
  }
  return { repoRoot, documents, missing };
}

/** Достаёт текст конкретного канон-документа (или null, если он недоступен). */
export function canonText(ctx: CanonContext, relPath: string): string | null {
  const doc = ctx.documents.find((d) => d.path === relPath);
  return doc && doc.available ? doc.text : null;
}
