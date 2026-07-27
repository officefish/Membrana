/**
 * task-states-batch — состояния issue/PR СПИСКОМ, не поштучно (#1322, tw-state-batch-norm).
 *
 * Вещдок 26.07: цикл `gh issue view` по 13 номерам встал на пятиминутном таймауте и не
 * доехал; батч по тем же номерам отрабатывает одним вызовом. Дом — контракт мастерской
 * задач (рядом с validate/invariants): любой опрос состояний карточек идёт отсюда.
 *
 * Контракт честности: сеть не ответила → honest unknown (не «open», не «closed», не
 * пустой список — отсутствие ответа не является состоянием). Явный таймаут обязателен.
 *
 * Чистое ядро (query/parse/chunk) отделено от gh-адаптера — тестируется без сети.
 */
import { execFileSync } from 'node:child_process';

/** Явный таймаут внешнего вызова (#1320/#1322): дефолтный «без таймаута» вис на прокси. */
export const BATCH_TIMEOUT_MS = 30_000;

/** Номеров в одном GraphQL-вызове (алиасы). 13 вчерашних — один вызов с запасом. */
export const BATCH_CHUNK = 50;

/** @param {Array<number|string>} numbers @returns {number[]} нормализованные уникальные номера */
export function normalizeNumbers(numbers) {
  const out = [];
  const seen = new Set();
  for (const n of numbers ?? []) {
    const v = Number(String(n).replace(/^#/u, ''));
    if (Number.isInteger(v) && v > 0 && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/** @param {number[]} numbers @returns {number[][]} */
export function chunkNumbers(numbers, size = BATCH_CHUNK) {
  const chunks = [];
  for (let i = 0; i < numbers.length; i += size) chunks.push(numbers.slice(i, i + size));
  return chunks;
}

/**
 * GraphQL-запрос с алиасами: один вызов на пачку. issueOrPullRequest — номера issue
 * и PR живут в одном пространстве, поштучное «это issue или PR?» не нужно.
 * @param {string} owner @param {string} name @param {number[]} numbers
 */
export function buildStatesQuery(owner, name, numbers) {
  const fields = numbers
    .map((n) => `n${n}: issueOrPullRequest(number: ${n}) { ... on Issue { number state } ... on PullRequest { number state } }`)
    .join(' ');
  return `query { repository(owner: "${owner}", name: "${name}") { ${fields} } }`;
}

/**
 * Разбор ответа. Ненайденный номер — «missing» (говорим по имени), НЕ угадываем.
 * @param {object|null} data — data.repository из ответа GraphQL (может быть частичным)
 * @param {number[]} numbers
 * @returns {{ states: Record<number, string>, missing: number[] }}
 */
export function parseStatesResponse(data, numbers) {
  const repo = data?.repository ?? data ?? {};
  const states = {};
  const missing = [];
  for (const n of numbers) {
    const node = repo[`n${n}`];
    if (node && typeof node.state === 'string') states[n] = node.state;
    else missing.push(n);
  }
  return { states, missing };
}

/**
 * Батч-опрос состояний. ЕДИНСТВЕННАЯ дозволенная форма похода за состояниями
 * (норма AGENTS.md): не звать view поштучно в цикле.
 *
 * @param {Array<number|string>} rawNumbers
 * @param {{ run?: typeof execFileSync, repoSlug?: string|null, timeoutMs?: number }} [opts]
 * @returns {{ unknown: false, states: Record<number, string>, missing: number[] }
 *         | { unknown: true, reason: string }}
 */
export function fetchStatesBatch(rawNumbers, opts = {}) {
  const run = opts.run ?? execFileSync;
  const timeout = opts.timeoutMs ?? BATCH_TIMEOUT_MS;
  const numbers = normalizeNumbers(rawNumbers);
  if (numbers.length === 0) return { unknown: false, states: {}, missing: [] };

  let slug = opts.repoSlug ?? null;
  if (!slug) {
    try {
      slug = JSON.parse(String(run('gh', ['repo', 'view', '--json', 'nameWithOwner'], { encoding: 'utf8', timeout }))).nameWithOwner ?? null;
    } catch {
      slug = null;
    }
  }
  if (!slug || !slug.includes('/')) {
    return { unknown: true, reason: 'repo slug не определился (gh недоступен) — состояния НЕ известны' };
  }
  const [owner, name] = slug.split('/');

  const states = {};
  const missing = [];
  for (const chunk of chunkNumbers(numbers)) {
    const query = buildStatesQuery(owner, name, chunk);
    let raw;
    try {
      raw = String(run('gh', ['api', 'graphql', '-f', `query=${query}`], { encoding: 'utf8', timeout }));
    } catch (e) {
      // Ненайденный номер тоже приходит ошибкой процесса, но с телом data+errors на
      // stdout — частичный ответ честно разбираем, а вот пустой stdout = сеть: unknown.
      raw = typeof e.stdout === 'string' && e.stdout.trim() ? e.stdout : null;
      if (raw == null) {
        return {
          unknown: true,
          reason: `сеть/прокси не ответили за ${timeout} мс (${String(e.message ?? e).split('\n')[0]}) — состояния НЕ известны, отсутствие ответа ≠ состояние`,
        };
      }
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { unknown: true, reason: 'ответ GraphQL не разобрался — состояния НЕ известны' };
    }
    const { states: s, missing: m } = parseStatesResponse(parsed.data, chunk);
    Object.assign(states, s);
    missing.push(...m);
  }
  return { unknown: false, states, missing };
}
