/**
 * Сны v2 — соревнование 24→6 (компонент D эпика ritual-refactor, вердикт M5). Чистое ядро:
 * `select: Dream[24] → Winner[6]` — детерминированная тотальная функция. 24 сна/сутки
 * бьются СОСЕДНИМИ ЧЕТВЁРКАМИ (по метке часа `h//4`) → 6 заездов → 6 победителей.
 * Пустой заезд → `no-winner` явно (анти-«молчун»). Судья заезда — LLM (даёт `score`
 * снаружи); здесь score только сравнивают — детерминизм, не модель. Failover-кубик
 * `rollProvider` — воспроизводимая перестановка 4 провайдеров.
 */

/** 4 провайдера снов (порядок канонический; кубик его перемешивает воспроизводимо). */
export const DREAM_PROVIDERS = Object.freeze(['perplexity', 'deepseek', 'grok', 'gemini']);

/** Число заездов за сутки: 24 часа / 4 = 6. */
export const HEATS = 6;

/** Метка заезда для часа: соседние четвёрки (0-3→0, 4-7→1, …, 20-23→5). */
export function heatOf(hour) {
  return Math.floor(Number(hour) / 4);
}

/** Детерминированный uint32 из seed (FNV-1a) — без Math.random, воспроизводимо. */
function seededInt(seed) {
  let h = 2166136261 >>> 0;
  for (const ch of String(seed)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0 || 1;
}

/**
 * Воспроизводимая перестановка 4 провайдеров из seed (Fisher-Yates на сеяном LCG). Кубик:
 * один seed → одна цепочка. Биекция — каждый провайдер достижим ровно раз.
 * @param {string|number} seed
 * @returns {string[]}
 */
export function providerChain(seed) {
  const arr = [...DREAM_PROVIDERS];
  let s = seededInt(seed);
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Провайдер для попытки `attempt` (0-based) в failover-цепочке. Цепочка исчерпана
 * (`attempt ≥ 4`) → `null` = терминал `synthesisFailed`, не бесконечный ретрай.
 * @param {string|number} seed
 * @param {number} attempt
 * @returns {string|null}
 */
export function rollProvider(seed, attempt) {
  const chain = providerChain(seed);
  return attempt >= 0 && attempt < chain.length ? chain[attempt] : null;
}

/** Лексикографическое сравнение (null-безопасно). */
function cmp(a, b) {
  const x = a ?? '';
  const y = b ?? '';
  return x < y ? -1 : x > y ? 1 : 0;
}

/**
 * Соревнование: 24 сна → 6 заездов по метке часа. В каждом заезде победитель —
 * синтезированный сон с максимальным `score` (tie-break: раньше час, затем `id`). Пустой
 * заезд (все `failed`/`skipped`/нет) → `{heat, winner: null}` явно. Тотальна.
 * @param {Array<{id?: string, hour: number, status?: string, score?: number}>} dreams
 * @returns {Array<{heat: number, winner: object|null}>} длиной ровно HEATS(6)
 */
export function select(dreams) {
  const out = [];
  for (let h = 0; h < HEATS; h++) {
    const inHeat = (dreams ?? []).filter((d) => d?.status === 'synthesized' && heatOf(d.hour) === h);
    if (inHeat.length === 0) {
      out.push({ heat: h, winner: null });
      continue;
    }
    const best = [...inHeat].sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0) || a.hour - b.hour || cmp(a.id, b.id),
    )[0];
    out.push({ heat: h, winner: best });
  }
  return out;
}

/**
 * Дайджест — победители заездов (derived-проекция). При пустых заездах честно МЕНЬШЕ 6,
 * без добивки из проигравших (M5). Проигравшие/failed НЕ здесь — они в сторе-активе.
 * @param {Array<object>} dreams
 * @returns {Array<object>} длиной ≤ 6
 */
export function digest(dreams) {
  return select(dreams)
    .filter((w) => w.winner)
    .map((w) => w.winner);
}
