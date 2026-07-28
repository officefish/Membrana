/**
 * Схема второго контура памяти персон — P0 стройки (заседание memory-subconscious,
 * вердикт C1, ратифицирован 28.07; сшивка — MEETING_VERDICT.md).
 *
 * ArchiveRecord — единица подсознания: append-only, «ничто не умирает» на уровне
 * схемы (оператора erase в модулях контура НЕ СУЩЕСТВУЕТ — это инвариант, зуб
 * держит его тестом на экспорты). Причина transfer живёт в СОБЫТИИ op-log
 * (межа сшивки №2) — записи архива полем политики не разбухают.
 *
 * Чистые функции: валидация/резолв без fs. Дома (homes) — path-схема C1/C5.
 */

/** Виды записи архива (C1): дословная либо конспект с обязательным указателем. */
export const RECORD_KINDS = Object.freeze(['verbatim', 'summary']);

/** Снимок важности на момент перетока (C1): join importance.json, не live-ссылка. */
export const IMPORTANCE_LEVELS = Object.freeze(['pinned', 'normal']);

/** Дома контура (C1 + C5), от корня репозитория. */
export const HOMES = Object.freeze({
  archive: (personaId) => `docs/virtual-team/memory/archive/${personaId}.jsonl`,
  projection: (personaId) => `docs/virtual-team/memory/${personaId}.md`,
  opLog: (personaId, date) => `docs/virtual-team/memory/op-log/${personaId}/${date}.jsonl`,
  metrics: (date) => `docs/virtual-team/memory/metrics/${date}.json`,
  signals: (date) => `docs/virtual-team/memory/signals/${date}.json`,
});

/**
 * Слоты v2 — именованы вердиктами, НЕ реализуются в v1 (C1/C3/C5). Имя в этом
 * списке — легальная ссылка; поле/механика без записи здесь — самодеятельность.
 */
export const V2_SLOTS = Object.freeze([
  'ttlEpisodic', 'semanticIndex', 'embeddingRef', 'crossPersonaLinks',
  'summarizer', 'ratio', 'runId', 'supersededBy',
  'metric.retrieval_recall_benchmark', 'metric.weight_calibration',
  'analogy-query', 'learned-rerank', 'cross-persona-surfacing',
]);

const REQUIRED = Object.freeze(['id', 'personaId', 'ts', 'provenance', 'source', 'kind', 'text']);

/**
 * Структурные проблемы записи архива. Пусто = запись годна к append.
 * Инвариант C1: summary ⇒ fullRef (конспект без указателя не существует).
 * @param {Record<string, unknown>} r
 * @returns {string[]}
 */
export function recordProblems(r) {
  const problems = [];
  for (const f of REQUIRED) {
    if (r?.[f] == null || r[f] === '') problems.push(`нет поля ${f}`);
  }
  if (r?.kind != null && !RECORD_KINDS.includes(r.kind)) {
    problems.push(`kind «${r.kind}» вне {${RECORD_KINDS.join('|')}}`);
  }
  if (r?.kind === 'summary' && (typeof r.fullRef !== 'string' || !r.fullRef.trim())) {
    problems.push('summary без fullRef — конспект без указателя не существует (C1)');
  }
  if (r?.importanceSnapshot != null && !IMPORTANCE_LEVELS.includes(r.importanceSnapshot)) {
    problems.push(`importanceSnapshot «${r.importanceSnapshot}» вне {${IMPORTANCE_LEVELS.join('|')}}`);
  }
  if (r?.ts != null && !/^\d{4}-\d{2}-\d{2}/.test(String(r.ts))) {
    problems.push('ts не начинается с даты ISO — факт без метки времени не факт');
  }
  return problems;
}

/**
 * Разбор jsonl-ленты архива: битые строки — problems поимённо, не exception;
 * дубль id — problem (append-only не означает «одно и то же дважды»).
 * @param {string} text
 * @returns {{records: Array<Record<string, unknown>>, problems: string[]}}
 */
export function parseArchive(text) {
  const records = [];
  const problems = [];
  const seen = new Set();
  let n = 0;
  for (const line of String(text ?? '').split(/\r?\n/)) {
    n += 1;
    if (!line.trim()) continue;
    let r;
    try {
      r = JSON.parse(line);
    } catch {
      problems.push(`строка ${n}: битый JSON`);
      continue;
    }
    const p = recordProblems(r);
    if (p.length) {
      problems.push(`строка ${n} (${r?.id ?? 'без id'}): ${p.join('; ')}`);
      continue;
    }
    if (seen.has(r.id)) {
      problems.push(`строка ${n}: дубль id «${r.id}»`);
      continue;
    }
    seen.add(r.id);
    records.push(r);
  }
  return { records, problems };
}

/**
 * Монотонность append-only: newText обязан начинаться с oldText байт-в-байт
 * (историю не переписывают — только дописывают). Зуб C1/C6.
 * @param {string} oldText
 * @param {string} newText
 * @returns {boolean}
 */
export function appendMonotonic(oldText, newText) {
  return String(newText ?? '').startsWith(String(oldText ?? ''));
}

/**
 * Резолв fullRef конспекта: указатель обязан вести к существующей цели.
 * resolveFn подаёт вызывающий (fs/сеть — снаружи чистого ядра).
 * @param {Array<Record<string, unknown>>} records
 * @param {(ref: string) => boolean} resolveFn
 * @returns {string[]} проблемы нерезолва
 */
export function fullRefProblems(records, resolveFn) {
  const problems = [];
  for (const r of records) {
    if (r.kind === 'summary' && !resolveFn(String(r.fullRef))) {
      problems.push(`${r.id}: fullRef «${r.fullRef}» не резолвится — конспект потерял полный текст`);
    }
  }
  return problems;
}
