/**
 * Порт retrieval лифта всплытия (C3, блок `lift-retrieval-port`).
 *
 * Ядро (`subconscious-lift.mjs`) чисто и принимает `retrieve(axis, topic)` инъекцией. Этот
 * модуль — единственное место контура, которому позволено читать файловую систему.
 *
 * **Шов проведён нарочно:** `loadArchive` читает и только читает; `retrieveByAxis` — чистая
 * функция над уже прочитанными записями. Зуб бьёт по чистой части настоящими записями, а не
 * подсовывает фикстуру мимо чтения.
 *
 * **Почему свой словарь близости, а не `bm25LiteScore` из `@membrana/rag-service`.** Пакет
 * отдаёт его наружу, но это TypeScript, и `dist/` не коммитится. Существующий потребитель
 * (`rag-ritual.mjs`) переживает отсутствие сборки мягко — возвращает `skipped` с причиной,
 * RAG ритуалу необязателен. Лифту близость обязательна: без неё MMR не считается вовсе, то
 * есть слот `similar` не существует. Жёсткая зависимость на сборку чужого пакета уронила бы
 * порт в любом несобранном дереве. Цена решения названа честно: реализаций BM25 в проекте
 * стало две, и разойтись на одном корпусе они могут. Приговор резчика: расхождение — беда
 * второго порядка, неподнимающееся дерево — первого.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HOMES } from './archive-schema.mjs';

/**
 * Лексикон отрицания для оси `contrast`. Закрыт и заморожен: открытый набор означал бы, что
 * любой вызывающий подсовывает свой, и предикат оси перестаёт быть предикатом.
 * Сопоставление префиксное — язык флективный, «возражение» и «возражал» одно и то же.
 */
export const NEGATION_MARKERS = Object.freeze([
  'не', 'нет', 'без', 'вместо', 'нельзя', 'отказ', 'отверг', 'отриц', 'анти', 'контр', 'обратн',
]);

/** Маркеры неразрешённого противоречия для оси `dispute`. Закрыт и заморожен. */
export const CONFLICT_MARKERS = Object.freeze([
  'спор', 'расхожд', 'возраж', 'опроверг', 'против', 'конфликт', 'разногл', 'оспар', 'блокер',
]);

/** Константы BM25. Это не калибровка лифта (та — предмет C5), а умолчания самой формулы. */
const K1 = 1.2;
const B = 0.75;
/** Короткие слова несут падеж, а не смысл: в терминах запроса они дают шум. */
const MIN_QUERY_TERM = 3;

/** @param {string} text @returns {string[]} */
export function tokenize(text) {
  return String(text ?? '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t !== '');
}

/** Есть ли в токенах хоть один маркер из списка. Префиксно — язык флективный. */
export function hasMarker(tokens, markers) {
  return tokens.some((t) => markers.some((m) => t.startsWith(m)));
}

/**
 * Близость двух кандидатов для MMR — косинус на множествах токенов. Отдельная от `similarity`
 * величина: та про «похоже на запрос», эта про «похоже друг на друга».
 * @param {{tokens?: string[], text?: string}} a
 * @param {{tokens?: string[], text?: string}} b
 * @returns {number}
 */
export function similarityBetween(a, b) {
  const ta = new Set(a?.tokens ?? tokenize(a?.text));
  const tb = new Set(b?.tokens ?? tokenize(b?.text));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / Math.sqrt(ta.size * tb.size);
}

/** Статистика корпуса для idf. Считается по прочитанным записям, а не назначается. */
export function corpusStats(docs) {
  const df = new Map();
  let totalLength = 0;
  for (const tokens of docs) {
    totalLength += tokens.length;
    for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  return { df, docCount: docs.length, avgLength: docs.length === 0 ? 0 : totalLength / docs.length };
}

/**
 * BM25 без Okapi-хвостов, сжатый в [0..1). Сжатие нужно потому, что ядро кладёт similarity в
 * `simBucket` (floor(s·5)) и в MMR — обе операции ждут долю, а не сырой вес.
 * @returns {number}
 */
export function bm25Lite(queryTerms, docTokens, stats) {
  if (queryTerms.length === 0 || docTokens.length === 0 || stats.docCount === 0) return 0;
  const tf = new Map();
  for (const t of docTokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  let score = 0;
  for (const term of queryTerms) {
    const f = tf.get(term) ?? 0;
    if (f === 0) continue;
    const df = stats.df.get(term) ?? 0;
    const idf = Math.log(1 + (stats.docCount - df + 0.5) / (df + 0.5));
    const norm = stats.avgLength === 0 ? 1 : 1 - B + (B * docTokens.length) / stats.avgLength;
    score += idf * ((f * (K1 + 1)) / (f + K1 * norm));
  }
  return score / (score + 1);
}

/**
 * Свежесть числом — БЕЗ порогов. Ядро вычитает `recencyBucket` числом и ставит больший вперёд,
 * поэтому здесь отрицательный возраст в днях: сегодняшняя запись даёт 0, вчерашняя −1.
 *
 * Это порядок, а не вёдра с границами. Границы («горячее до трёх дней») были бы назначенным
 * порогом, а калибровка — предмет C5. Прецедент рядом, в самом ядре: при неоткалиброванном
 * `τ_out` слот аутсайдеров остаётся ПУСТ, и причина пишется в план, вместо выдуманного числа.
 *
 * @param {string} ts дата записи архива
 * @param {string} now «сегодня» приходит снаружи: часов в чистой функции нет
 * @returns {number}
 */
export function recencyBucketOf(ts, now) {
  const a = Date.parse(String(ts));
  const b = Date.parse(String(now));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  const days = Math.floor((b - a) / 86_400_000);
  // Сегодняшняя запись обязана дать ровно 0, а не -0: минус-ноль не равен нулю строго и
  // просачивается в сравнения незаметно.
  return days === 0 ? 0 : -days;
}

/**
 * Запись архива → кандидат в форме, которую читает ядро.
 *
 * `fullRef` при `kind: 'verbatim'` в записи отсутствует по схеме, и это НЕ нарушение C1:
 * инвариант направлен «конспект ⇒ указатель», обратное не требуется. Но указателем здесь
 * служит `provenance` — он есть у каждой записи и ведёт в исходный документ. Класть `null`
 * значило бы отнять у персоны дорогу к полному тексту там, где дорога существует.
 */
export function toCandidate(record, similarity, now, tokens) {
  return {
    id: record.id,
    similarity,
    class: record.class,
    lifecycle: record.lifecycle,
    importanceSnapshot: record.importanceSnapshot,
    recencyBucket: recencyBucketOf(record.ts, now),
    text: record.text,
    tokens,
    snippetRef: { text: record.text, fullRef: record.fullRef ?? record.provenance ?? null },
  };
}

/**
 * Чтение архива персоны. Единственное место модуля, знающее про диск.
 *
 * Нечитаемые строки НЕ проглатываются: их число возвращается наружу и становится причиной
 * урезанного прогона. Молча пропустить их значило бы выдать неполный корпус за полный.
 *
 * @returns {{records: object[], unreadable: number}}
 */
export function loadArchive(personaId, { repoRoot = '.', read = readFileSync } = {}) {
  const path = join(repoRoot, HOMES.archive(personaId));
  let raw;
  try {
    raw = String(read(path, 'utf8'));
  } catch {
    return { records: [], unreadable: 0 };
  }
  const records = [];
  let unreadable = 0;
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed?.id === undefined) unreadable += 1;
      else records.push(parsed);
    } catch {
      unreadable += 1;
    }
  }
  return { records, unreadable };
}

/** Причина урезания из-за нечитаемых строк — или пусто, если корпус прочитан целиком. */
function corpusReason(unreadable) {
  return unreadable > 0 ? `нечитаемых строк архива: ${unreadable}` : '';
}

/**
 * Отбор по одной оси. Чистая функция: записи приходят готовыми.
 *
 * Режим оси означает «предмет покрыт не тем способом, каким задумано», а НЕ «нашлось мало».
 * Поэтому:
 * - `topic` и `dispute` — `full`: их механика лексическая ПО ЗАМЫСЛУ (вердикт M3), а не
 *   заменяет собой отсутствующий LLM;
 * - `contrast` — всегда `reduced` в v1: замысел требует антонимов от LLM-порта, которого
 *   нет, и лексикон отрицаний его подменяет.
 *
 * Пустой результат режима НЕ меняет. Совет держателя «архив пуст ⇒ reduced» отвергнут: это
 * уничтожило бы различение, ради которого весь блок и делался, — пустой архив есть факт про
 * архив, а не про способ спрашивать.
 *
 * @returns {{hits: object[], mode: 'full'|'reduced', modeReason?: string}}
 */
export function retrieveByAxis(records, axis, topic, { now, unreadable = 0 } = {}) {
  const docs = records.map((r) => tokenize(r.text));
  const stats = corpusStats(docs);
  const queryTerms = [...new Set(tokenize(topic).filter((t) => t.length >= MIN_QUERY_TERM))];

  const hits = [];
  for (let i = 0; i < records.length; i += 1) {
    const tokens = docs[i];
    if (axis === 'contrast' && !hasMarker(tokens, NEGATION_MARKERS)) continue;
    if (axis === 'dispute' && !hasMarker(tokens, CONFLICT_MARKERS)) continue;
    const similarity = bm25Lite(queryTerms, tokens, stats);
    if (similarity === 0) continue;
    hits.push(toCandidate(records[i], similarity, now, tokens));
  }

  const reasons = [];
  if (axis === 'contrast') reasons.push('лексикон отрицаний вместо LLM-порта антонимов');
  const corpus = corpusReason(unreadable);
  if (corpus !== '') reasons.push(corpus);

  if (reasons.length === 0) return { hits, mode: 'full' };
  return { hits, mode: 'reduced', modeReason: reasons.join('; ') };
}

/**
 * Собрать `retrieve` для ядра. Архив читается ОДИН раз на облако, а не по разу на ось:
 * три чтения одного файла дали бы три разных корпуса, если файл дописали между осями.
 *
 * @param {{personaId: string, now: string, repoRoot?: string, load?: Function}} input
 * @returns {(axis: string, topic: string) => Promise<{hits: object[], mode: string, modeReason?: string}>}
 */
export function createArchiveRetrieve({ personaId, now, repoRoot = '.', load = loadArchive }) {
  if (typeof personaId !== 'string' || personaId.trim() === '') {
    throw new Error('subconscious-retrieval: personaId обязателен — архив без хозяина не существует');
  }
  if (typeof now !== 'string' || now.trim() === '') {
    throw new Error('subconscious-retrieval: now обязателен — часов в порту нет, «сегодня» приходит снаружи');
  }
  const corpus = load(personaId, { repoRoot });
  return async (axis, topic) =>
    retrieveByAxis(corpus.records, axis, topic, { now, unreadable: corpus.unreadable });
}
