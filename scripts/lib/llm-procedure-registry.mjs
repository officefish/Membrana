/**
 * LLM procedure registry (P1 / S1) — git-канон `llm-procedures.json`.
 * Чистые проверки; ФС — у вызывающего через opts.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const PROCEDURE_ID_RE = /^[a-z][a-z0-9-]*$/;
export const V1_PROCEDURE_IDS = Object.freeze(['code-review', 'consilium']);

/**
 * @param {string} [path]
 * @returns {{ procedures: Array<Record<string, unknown>> }}
 */
export function loadProcedureRegistry(path = join(HERE, 'llm-procedures.json')) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * @param {string} [path]
 * @returns {Record<string, { chain: Array<{ provider: string; model: string }> }>}
 */
export function loadProcedureDefaults(path = join(HERE, 'llm-procedure-defaults.json')) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * @param {string} [path]
 * @returns {{ providers: Record<string, object>; ritualEnum: string[] }}
 */
export function loadProviderCatalog(path = join(HERE, 'llm-provider-catalog.json')) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * @param {{ procedures?: unknown }} reg
 * @param {{ fileExists?: (relPath: string) => boolean; requireV1?: boolean }} [opts]
 * @returns {string[]}
 */
export function procedureRegistryProblems(reg, opts = {}) {
  const problems = [];
  if (!Array.isArray(reg?.procedures)) return ['procedures — не массив'];
  const seen = new Set();
  for (const p of reg.procedures) {
    const id = typeof p?.id === 'string' ? p.id : '<без id>';
    if (seen.has(id)) problems.push(`дубль id ${id}`);
    seen.add(id);
    if (!PROCEDURE_ID_RE.test(id)) problems.push(`${id}: id не kebab /^[a-z][a-z0-9-]*$/`);
    if (typeof p?.entryMjs !== 'string' || !p.entryMjs.trim()) {
      problems.push(`${id}: entryMjs пуст`);
    } else if (opts.fileExists && !opts.fileExists(p.entryMjs)) {
      problems.push(`${id}: entryMjs «${p.entryMjs}» не найден`);
    }
    if (typeof p?.meters !== 'boolean') problems.push(`${id}: meters — не boolean`);
    if (p?.yarnScript != null && (typeof p.yarnScript !== 'string' || !p.yarnScript.trim())) {
      problems.push(`${id}: yarnScript пуст`);
    }
    if (p?.title != null && (typeof p.title !== 'string' || !p.title.trim())) {
      problems.push(`${id}: title пуст`);
    }
  }
  if (opts.requireV1 !== false) {
    for (const id of V1_PROCEDURE_IDS) {
      if (!seen.has(id)) problems.push(`нет обязательной v1-записи «${id}»`);
    }
  }
  if (seen.has('local-code-review')) {
    problems.push('local-code-review — запрещённый id (P1: тот же code-review)');
  }
  return problems;
}

/**
 * @param {Record<string, unknown>} defaults
 * @param {{ ritualEnum?: string[] }} [opts]
 * @returns {string[]}
 */
export function procedureDefaultsProblems(defaults, opts = {}) {
  const problems = [];
  if (!defaults || typeof defaults !== 'object' || Array.isArray(defaults)) {
    return ['defaults — не объект'];
  }
  const ritualEnum = opts.ritualEnum ?? [
    'anthropic',
    'openrouter',
    'deepseek',
    'perplexity',
    'openai',
  ];
  for (const [id, cfg] of Object.entries(defaults)) {
    if (!PROCEDURE_ID_RE.test(id)) problems.push(`${id}: ключ defaults не kebab`);
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
      problems.push(`${id}: конфиг не объект`);
      continue;
    }
    if (!Array.isArray(cfg.chain) || cfg.chain.length < 1) {
      problems.push(`${id}: chain пуст`);
      continue;
    }
    cfg.chain.forEach((step, i) => {
      if (!step || typeof step !== 'object') {
        problems.push(`${id}: chain[${i}] не объект`);
        return;
      }
      if (typeof step.provider !== 'string' || !step.provider) {
        problems.push(`${id}: chain[${i}].provider пуст`);
      } else if (
        step.provider !== 'ollama' &&
        !ritualEnum.includes(step.provider)
      ) {
        problems.push(
          `${id}: chain[${i}].provider «${step.provider}» вне ritualEnum (${ritualEnum.join('|')}|ollama)`,
        );
      }
      if (typeof step.model !== 'string' || !step.model.trim()) {
        problems.push(`${id}: chain[${i}].model пуст`);
      }
    });
  }
  return problems;
}

/**
 * @param {{ providers?: unknown; ritualEnum?: unknown }} catalog
 * @returns {string[]}
 */
export function providerCatalogProblems(catalog) {
  const problems = [];
  if (!catalog?.providers || typeof catalog.providers !== 'object') {
    return ['providers — не объект'];
  }
  if (!Array.isArray(catalog.ritualEnum) || catalog.ritualEnum.length < 1) {
    return ['ritualEnum — не массив'];
  }
  for (const id of catalog.ritualEnum) {
    if (typeof id !== 'string' || !catalog.providers[id]) {
      problems.push(`ritualEnum «${id}» без записи в providers`);
    }
  }
  for (const [id, p] of Object.entries(catalog.providers)) {
    if (typeof p?.apiKeyEnv !== 'string' || !p.apiKeyEnv) {
      problems.push(`${id}: apiKeyEnv пуст`);
    }
    if (typeof p?.apiFormat !== 'string' || !p.apiFormat) {
      problems.push(`${id}: apiFormat пуст`);
    }
    if (typeof p?.defaultBaseUrl !== 'string' || !p.defaultBaseUrl) {
      problems.push(`${id}: defaultBaseUrl пуст`);
    }
    if (typeof p?.path !== 'string' || !p.path) {
      problems.push(`${id}: path пуст`);
    }
    if (!Array.isArray(p?.models) || p.models.length < 1) {
      problems.push(`${id}: models — нужен непустой список {id,label}`);
    } else {
      const ids = new Set();
      for (const m of p.models) {
        if (!m || typeof m.id !== 'string' || !m.id.trim()) {
          problems.push(`${id}: model.id пуст`);
        } else if (ids.has(m.id)) {
          problems.push(`${id}: дубль model.id «${m.id}»`);
        } else {
          ids.add(m.id);
        }
        if (typeof m?.label !== 'string' || !m.label.trim()) {
          problems.push(`${id}: model «${m?.id ?? '?'}» без label`);
        }
      }
      const def =
        typeof p.defaultModel === 'string' && p.defaultModel.trim()
          ? p.defaultModel.trim()
          : typeof p.suggestedModel === 'string'
            ? p.suggestedModel.trim()
            : '';
      if (!def) {
        problems.push(`${id}: defaultModel пуст`);
      } else if (!ids.has(def)) {
        problems.push(`${id}: defaultModel «${def}» не в models`);
      }
    }
  }
  const forbidden = ['freemodel', 'freemodel-dev'];
  for (const id of Object.keys(catalog.providers)) {
    if (forbidden.includes(id)) {
      problems.push(`${id}: запрещён в ritual catalog v1 (X1)`);
    }
  }
  return problems;
}
