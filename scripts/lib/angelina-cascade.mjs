/**
 * Ангелина — координатор ритуала: детерминированный оркестратор каскада документов
 * + вызыватель страж-функций свежести и структуры. Вердикт заседания `ritual-refactor`
 * M1 (docs/seanses/ritual-refactor-m1-angelina-2026-07-20.md), ратифицирован владельцем.
 *
 * ЧИСТОЕ ЯДРО: функции от `(graph, snapshot)` — без сети, DOM и `mtime`. Версия документа
 * = `git log -1` (канон `lastTouchedAt`), digest = упорядоченный sha256 — считаются
 * АДАПТЕРОМ снаружи и передаются в `snapshot`. Здесь их только сравнивают. Так модуль
 * тестируется без моков (юнит-тесты кормят готовый снимок).
 *
 * Ангелина НЕ редактирует документы и НЕ судит их пользу — только свежесть+структуру
 * по формальным признакам: пропустить или остановить каскад. Автор пишет, Ангелина
 * проверяет (M1: граница ролей).
 */

import { createHash } from 'node:crypto';

/** Автор документа каскада ∈ {5 персон, человек}. Субагент автором быть не может (M1). */
export const AUTHOR_ROLES = new Set(['vesnin', 'ozhegov', 'dynin', 'kuryokhin', 'rodchenko', 'human']);

/** Три исхода проверки свежести ребра. `unknown` («не проверено») ≠ `fresh` — не мёртвая дверь. */
export const FRESHNESS = Object.freeze({ FRESH: 'fresh', STALE: 'stale', UNKNOWN: 'unknown' });

/**
 * Упорядоченный sha256: детерминизм, не порядок аргументов и не `mtime`. Адаптер даёт
 * части (пути/содержимое), здесь — стабильная склейка (sort) + хэш.
 * @param {Iterable<string>} parts
 * @returns {string}
 */
export function orderedDigest(parts) {
  const h = createHash('sha256');
  for (const p of [...parts].map(String).sort()) h.update(`${p}\n`);
  return h.digest('hex');
}

/**
 * Свежесть одного ребра: потребитель `d_j` прочитал производителя `d_i`.
 * M1: `fresh = (version(d_i) ≤ readAt(d_j)) ∧ digest совпал`. На практике версия —
 * идентичность коммита (`git log -1`), а не порядок строк, поэтому сравниваем на
 * равенство «прочитал ли потребитель ТЕКУЩУЮ версию производителя».
 *  - `fresh`   — версия совпала И digest совпал;
 *  - `stale`   — производителя тронули после чтения (версия/digest разошлись);
 *  - `unknown` — потребитель не читал производителя, либо версии/digest нет.
 * @param {{version?: string|null, digest?: string|null}|null|undefined} producer снимок производителя
 * @param {{version?: string|null, digest?: string|null}|null|undefined} edgeRead что потребитель прочитал
 * @returns {'fresh'|'stale'|'unknown'}
 */
export function freshness(producer, edgeRead) {
  if (!producer || producer.version == null || producer.digest == null) return FRESHNESS.UNKNOWN;
  if (!edgeRead || edgeRead.version == null) return FRESHNESS.UNKNOWN;
  if (edgeRead.version !== producer.version) return FRESHNESS.STALE;
  if (edgeRead.digest !== producer.digest) return FRESHNESS.STALE;
  return FRESHNESS.FRESH;
}

/**
 * Проверка провенанса узла.
 * Машинный: `{author, guard, digest, readAt}`.
 * Честная ручная чеканка (#999): `{kind:'honest-manual', author, mintedAt, reason, digest}` —
 * штатный фолбэк, не «нет провенанса». Автор ∈ {5 персон, человек}; субагент запрещён.
 * @param {{provenance?: {kind?: string, author?: string, guard?: string, digest?: string, readAt?: unknown, mintedAt?: string, reason?: string}|null}|null|undefined} snap
 * @returns {string} пустая строка = ок, иначе текст проблемы
 */
export function provenanceProblem(snap) {
  const p = snap?.provenance;
  if (!p) return 'нет провенанса {author, guard, digest, readAt}';
  if (p.kind === 'honest-manual') {
    for (const field of ['author', 'mintedAt', 'reason', 'digest']) {
      if (p[field] == null || String(p[field]).trim() === '') {
        return `honest-manual без поля «${field}»`;
      }
    }
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(String(p.mintedAt))) {
      return 'honest-manual: mintedAt должен быть YYYY-MM-DD';
    }
    if (!AUTHOR_ROLES.has(p.author)) {
      return `автор «${p.author}» не ∈ {5 персон, человек} — субагент автором быть не может`;
    }
    return '';
  }
  for (const field of ['author', 'guard', 'digest', 'readAt']) {
    if (p[field] == null) return `провенанс без поля «${field}»`;
  }
  if (!AUTHOR_ROLES.has(p.author)) {
    return `автор «${p.author}» не ∈ {5 персон, человек} — субагент автором быть не может`;
  }
  return '';
}

/** Метка исхода провенанса: машинный ok · honest-manual · текст проблемы. */
export function provenanceOutcome(snap) {
  const problem = provenanceProblem(snap);
  if (problem !== '') return problem;
  if (snap?.provenance?.kind === 'honest-manual') return 'honest-manual';
  return 'ok';
}

/**
 * Детерминированная топологическая сортировка (алгоритм Кана), tie-break по `id`
 * (лексикографически) — один и тот же граф даёт один и тот же порядок. Цикл → бросает.
 * @param {{nodes: {id: string}[], edges: {from: string, to: string}[]}} graph
 * @returns {string[]} порядок обхода
 */
export function topoOrder(graph) {
  const ids = graph.nodes.map((n) => n.id);
  const indeg = new Map(ids.map((id) => [id, 0]));
  const adj = new Map(ids.map((id) => [id, []]));
  for (const e of graph.edges) {
    if (!indeg.has(e.from) || !indeg.has(e.to)) {
      throw new Error(`ребро ссылается на неизвестный узел: ${e.from} → ${e.to}`);
    }
    adj.get(e.from).push(e.to);
    indeg.set(e.to, indeg.get(e.to) + 1);
  }
  // Готовые к выдаче — с нулевой полустепенью захода, в лексикографическом порядке.
  const ready = ids.filter((id) => indeg.get(id) === 0).sort();
  const order = [];
  while (ready.length > 0) {
    const id = ready.shift();
    order.push(id);
    const next = [...adj.get(id)].sort();
    for (const to of next) {
      indeg.set(to, indeg.get(to) - 1);
      if (indeg.get(to) === 0) {
        // Вставить с сохранением лексикографического порядка очереди готовых.
        const at = ready.findIndex((x) => x > to);
        if (at === -1) ready.push(to);
        else ready.splice(at, 0, to);
      }
    }
  }
  if (order.length !== ids.length) {
    throw new Error('каскад содержит цикл — топологический порядок невозможен');
  }
  return order;
}

/**
 * Оркестратор каскада — ЕДИНСТВЕННАЯ публичная точка входа. Страж-функции
 * (`freshness`, `provenanceProblem`) внутренние, но экспортированы для юнит-тестов.
 *
 * Проходит документы в детерминированном топологическом порядке. Для каждого узла
 * проверяет провенанс и свежесть всех входящих рёбер (что он читает у производителей).
 * Узел БЛОКИРУЕТ каскад, если он `stale` ИЛИ у него проблема провенанса (оба — громкий
 * отказ, M1). `unknown` — помечается, но НЕ блокирует (нейтральная метка, не мёртвая
 * дверь). `fresh` — чисто.
 *
 * @param {{nodes: {id: string, label?: string}[], edges: {from: string, to: string}[]}} graph
 * @param {Record<string, {version?: string|null, digest?: string|null, provenance?: object|null, readAt?: Record<string, {version?: string|null, digest?: string|null}>}>} snapshot
 * @returns {{order: string[], results: Record<string, {freshness: string, provenance: string, blocked: boolean, author: string|null, guard: string|null, digest: string|null, edges: Record<string,string>}>, ok: boolean, firstBlocked: string|null}}
 */
export function orchestrateCascade(graph, snapshot) {
  const order = topoOrder(graph);
  const results = {};
  let ok = true;
  let firstBlocked = null;

  for (const id of order) {
    const snap = snapshot?.[id] ?? {};
    const provOutcome = provenanceOutcome(snap);
    const provProblem = provenanceProblem(snap);

    const incoming = graph.edges.filter((e) => e.to === id);
    const edges = {};
    let worst = FRESHNESS.FRESH;
    for (const e of [...incoming].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))) {
      const fr = freshness(snapshot?.[e.from], snap.readAt?.[e.from]);
      edges[e.from] = fr;
      if (fr === FRESHNESS.STALE) worst = FRESHNESS.STALE;
      else if (fr === FRESHNESS.UNKNOWN && worst !== FRESHNESS.STALE) worst = FRESHNESS.UNKNOWN;
    }

    // honest-manual не блокирует по провенансу; stale по рёбрам — по-прежнему громкий блок.
    const blocked = worst === FRESHNESS.STALE || provProblem !== '';
    results[id] = {
      freshness: worst,
      provenance: provOutcome,
      blocked,
      author: snap.provenance?.author ?? null,
      guard: snap.provenance?.guard ?? (snap.provenance?.kind === 'honest-manual' ? 'honest-manual' : null),
      digest: snap.provenance?.digest ?? null,
      mintedAt: snap.provenance?.mintedAt ?? null,
      reason: snap.provenance?.reason ?? null,
      edges,
    };
    if (blocked) {
      ok = false;
      if (firstBlocked === null) firstBlocked = id;
    }
  }

  return { order, results, ok, firstBlocked };
}

/**
 * Предъявление узла человеку: строка `автор · страж · digest · состояние` (M1).
 * `stale`/провенанс-проблема — контрастно и первым словом; `unknown` явно «не проверено»;
 * `honest-manual` — отдельная метка (не красный «нет провенанса», не машинный ok).
 * @param {string} id
 * @param {{freshness: string, provenance: string, blocked: boolean, author: string|null, guard: string|null, digest: string|null, mintedAt?: string|null, reason?: string|null}} r
 * @returns {string}
 */
export function presentNode(id, r) {
  let mark;
  if (r.blocked) mark = '✖ БЛОК';
  else if (r.provenance === 'honest-manual') mark = '◇ ручная';
  else if (r.freshness === FRESHNESS.UNKNOWN) mark = '? не проверено';
  else mark = '✓ свежо';
  const dg = r.digest ? String(r.digest).slice(0, 8) : '—';
  const guard = r.guard ?? (r.provenance === 'honest-manual' ? 'honest-manual' : '—');
  let prov = '';
  if (r.provenance === 'honest-manual') {
    const when = r.mintedAt ? ` ${r.mintedAt}` : '';
    const why = r.reason ? ` · ${r.reason}` : '';
    prov = ` · чеканка: honest-manual${when}${why}`;
  } else if (r.provenance !== 'ok') {
    prov = ` · провенанс: ${r.provenance}`;
  }
  return `${mark} · ${id} · автор ${r.author ?? '—'} · страж ${guard} · ${dg}${prov}`;
}
