/**
 * CC1 — источники канона для контура communications.
 *
 * Пути читаются агентом (CC8) через `fs`-read рабочей копии — НЕ через `import @membrana/*`.
 * «Чтение ≠ импорт»: строковые пути не создают ребро зависимости, поэтому инвариант границ
 * (`indegree(comms от продуктовых) = 0`, `outdegree(comms к продуктовым) = 0`) держится
 * по построению. См. INSIGHT `insight-comms-contour-topology` (Вариант A).
 *
 * Пути — относительно корня монорепо (рабочей копии), не относительно этого пакета.
 */

/** Слой 1 — носитель истины (факты, стадия, дорожная карта). Существует, читается живьём. */
export const LAYER_1_TRUTH = [
  'docs/foundation/PROMPT_WHITE_PAPER.md',
  'docs/ARCHITECTURE.md',
  'docs/INTEGRATIONS_STRATEGY.md',
  'docs/prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md',
] as const;

/** Слой 2 — носитель формы (тон, термины, ограничения). Существует, читается живьём. */
export const LAYER_2_FORM = [
  'docs/foundation/CLAUDE_PROJECT_SYSTEM_PROMPT.md',
  'docs/foundation/MEMBRANA_ONE_PAGER.md',
] as const;

/**
 * Слой 3 — производные артефакты канона. Создаются в этом спринте (CC5–CC7) в `docs/comms/canon/`.
 * До создания агент помечает соответствующие факты как недоступные, а не выдумывает их.
 */
export const LAYER_3_DERIVED = [
  'docs/comms/canon/FACTS_SHEET.md',
  'docs/comms/canon/GLOSSARY.md',
  'docs/comms/canon/BRAND_TOKENS.md',
] as const;

/** Полный канонический минимум контура (Слой 1 + 2 + 3). */
export const CANON_SOURCES = [
  ...LAYER_1_TRUTH,
  ...LAYER_2_FORM,
  ...LAYER_3_DERIVED,
] as const;
