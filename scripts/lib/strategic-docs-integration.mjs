/**
 * Cowork Phase 4 · интеграционный адаптер контейнера стратегических документов.
 *
 * Блоки строились изолированно и разошлись на стыке (это адаптер и мирит, НЕ переписывая блоки):
 *  · canon-data `valid(template, index)` ждёт `index.get(key)` и `slot.pin`;
 *  · generators `generate(template, index)` ждёт `index.resolve(id, version)` и `slot.version`.
 * Ниже — реконсайл к INTERFACE_CONTRACT: один индекс с ОБОИМИ интерфейсами + нормализация слотов.
 */
import { valid, syncGranule, granuleKey, extractGranule } from './strategic-docs-model.mjs';
import { generate } from './strategic-docs-generate.mjs';
import { renderRelease } from './strategic-docs-render-adapter.mjs';

/** Индекс гранул с ДВОЙНЫМ интерфейсом: .get(key) для canon-data.valid и .resolve(id,version) для generate. */
export function buildGranuleIndex(granules) {
  const map = new Map();
  for (const g of granules) {
    if (!g?.id || !g?.version) continue;
    map.set(granuleKey(g.id, g.version), g);
  }
  return {
    get: (key) => map.get(key),
    resolve: (id, version) => map.get(granuleKey(id, version)),
    has: (key) => map.has(key),
    get size() {
      return map.size;
    },
  };
}

/** Нормализация шаблона к общей форме стыка: у слота есть и `pin` (canon-data), и `version` (generate). */
export function normalizeTemplate(template) {
  return {
    ...template,
    slots: (template.slots || []).map((s) => ({
      ...s,
      pin: s.pin ?? s.version,
      version: s.version ?? s.pin,
    })),
  };
}

/** Обёртка реального canon-data.valid под сигнатуру, которую ждёт generate: validate(template, draft) → {ok, reasons}. */
function makeRealValidate(index) {
  return async (template) => {
    const r = valid(normalizeTemplate(template), index);
    return { ok: r.ok === true, reasons: r.reasons ?? [] };
  };
}

/** Интегрированный генератор: generate + РЕАЛЬНЫЙ предикат canon-data (а не стаб-предикат блока). */
export async function integratedGenerate(template, granules) {
  const index = buildGranuleIndex(granules);
  return generate(normalizeTemplate(template), index, { validate: makeRealValidate(index) });
}

/** Рендер поверхности релиза через engine-renderer (renderRelease уже рендерит — не двойной вызов). */
export async function renderAndSync(surface, providerId = 'affine', ctx = {}) {
  return renderRelease(surface, { selectedProvider: providerId, ...ctx });
}

export { buildGranuleIndex as buildIndex, syncGranule, extractGranule, normalizeTemplate as normTpl };
