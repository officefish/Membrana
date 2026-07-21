/**
 * layer-direction — конституция границы слоёв «процедуры → киты → скрипты».
 *
 * Канон: вердикт `m3-boundary-manual` заседания procedural-layer (ратифицирован
 * 21.07). Правила — В ФАЙЛЕ `docs/procedures/layer-rules.json` (один файл — один
 * SHA), не в коде (Р5): менять отношение легальности = править файл правил.
 *
 * Чистые функции; файловая система — только в builder-е графа.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Слой пути по файлу правил. null — путь вне объявленных слоёв (не судим).
 * @param {string} relPath путь от корня репо, forward slashes
 * @param {{layers: {rank: number, name: string, prefixes: string[]}[]}} rules
 * @returns {{rank: number, name: string} | null}
 */
export function layerOf(relPath, rules) {
  const p = String(relPath).replace(/\\/gu, '/');
  for (const layer of rules?.layers ?? []) {
    if (layer.prefixes.some((pre) => p.startsWith(pre))) return { rank: layer.rank, name: layer.name };
  }
  return null;
}

/**
 * Проверка направленности на статическом графе импортов.
 * Ребро законно ⟺ rank(from) ≤ rank(to) (вниз или внутри слоя).
 *
 * @param {{from: string, to: string}[]} importGraph рёбра (пути от корня репо)
 * @param {object} rules файл правил
 * @returns {{violations: {from: string, to: string, reason: string}[]}}
 *   «0 нарушений» — явный пустой список.
 */
export function checkLayerDirection(importGraph, rules) {
  const violations = [];
  for (const { from, to } of importGraph ?? []) {
    const lf = layerOf(from, rules);
    const lt = layerOf(to, rules);
    if (!lf || !lt) continue; // вне объявленных слоёв — не судим
    if (lf.rank > lt.rank) {
      violations.push({
        from,
        to,
        reason: `обратное ребро: ${lf.name} (rank ${lf.rank}) ссылается вверх на ${lt.name} (rank ${lt.rank})`,
      });
    }
  }
  return { violations };
}

/** Статические import-источники в тексте модуля (без выполнения). */
const IMPORT_RE = /(?:import\s[^'"]*?|import\s*\(\s*|export\s[^'"]*?\sfrom\s*)['"]([^'"]+)['"]/gu;

/**
 * Построить статический граф импортов для .mjs под данными корнями.
 * Ошибка чтения — throw (инструментальная ошибка ОБЯЗАНА быть отличима от
 * честного «0 нарушений» — вердикт M3, анти-Молчун).
 *
 * @param {string} repoRoot
 * @param {string[]} scanDirs каталоги от корня (например ['scripts'])
 * @returns {{from: string, to: string}[]}
 */
export function buildImportGraph(repoRoot, scanDirs = ['scripts']) {
  const edges = [];
  for (const dir of scanDirs) {
    const abs = join(repoRoot, dir);
    const files = readdirSync(abs, { recursive: true })
      .map(String)
      .filter((f) => f.endsWith('.mjs'));
    for (const f of files) {
      const fileAbs = join(abs, f);
      const from = relative(repoRoot, fileAbs).replace(/\\/gu, '/');
      const text = readFileSync(fileAbs, 'utf8');
      for (const m of text.matchAll(IMPORT_RE)) {
        const spec = m[1];
        if (!spec.startsWith('.') && !spec.startsWith('docs/') && !spec.startsWith('kits/')) continue;
        const toAbs = spec.startsWith('.') ? join(fileAbs, '..', spec) : join(repoRoot, spec);
        edges.push({ from, to: relative(repoRoot, toAbs).replace(/\\/gu, '/') });
      }
    }
  }
  return edges;
}
