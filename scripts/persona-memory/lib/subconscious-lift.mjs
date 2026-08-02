/**
 * subconscious-lift — облако подсознания (комната C3, #1615).
 *
 * ЛИФТ ≠ ПАМЯТЬ. Этот модуль строит конечное разнородное облако кандидатов и НИЧЕГО не
 * решает за персону: `emerged` и `rejected` он оставляет пустыми, `why` не пишет никогда.
 * Акт всплытия принадлежит судящему звену персоны — вердикт M3, и нарушение этого есть
 * BLOCK на приёмке, а не стилистическая придирка.
 *
 * Чистое ядро: ни fs, ни сети, ни времени. Порт retrieval приходит инъекцией, «сейчас» —
 * аргументом. Числа калибровки (λ, τ_out) НЕ имеют умолчаний: их назначает C5, а умолчание
 * протащило бы калибровку в v1 под видом удобства.
 */

/** Слоты облака. Список закрыт вердиктом M3. */
export const SLOT_KINDS = Object.freeze(['similar', 'contrast', 'outsider']);

/** Оси мультизапроса v1. `analogy` — слот v2, здесь его нет намеренно. */
export const QUERY_AXES = Object.freeze(['topic', 'contrast', 'dispute']);

/** Квоты слотов и потолок облака — ратифицированы, не настраиваются вызовом. */
export const SLOT_QUOTAS = Object.freeze({ similar: 5, contrast: 3, outsider: 2 });
export const CLOUD_MAX = 10;

/** Ординальные флаги в порядке старшинства. Значения строго 0|1. */
export const FLAG_ORDER = Object.freeze(['isPinned', 'hasOwnerQuote', 'hasConflict']);

/** Ранг класса из C2: озарение и прецедент старше позиции, позиция старше рутины. */
export const CLASS_RANK = Object.freeze({ insight: 2, precedent: 2, position: 1, routine: 0 });

/** Исходы оси запроса. `ran` с нулём попаданий и `failed` — РАЗНЫЕ вещи. */
export const AXIS_STATUS = Object.freeze(['ran', 'failed', 'skipped']);

/**
 * Полнота прогона оси. Ось, собранная лексиконом отрицаний вместо LLM-порта, БЕЖАЛА —
 * статус у неё честный `ran`, — но покрыла предмет урезанно. Без этой оси различения
 * «оси хватило» и «оси хватило, насколько смогли» выглядят в плане одинаково.
 *
 * Список заморожен отдельно от `AXIS_STATUS` и независимо от него: статус отвечает на
 * вопрос «прогон состоялся?», режим — на вопрос «прогон покрыл предмет?». Смешать их
 * значило бы завести четвёртый статус и потерять оба ответа сразу.
 */
export const AXIS_MODES = Object.freeze(['full', 'reduced']);

/**
 * Ординальные флаги кандидата. Наблюдаемые факты, а не оценки: поле есть — единица.
 * @param {Record<string, any>} record
 * @returns {{isPinned: number, hasOwnerQuote: number, hasConflict: number}}
 */
export function ordinalFlags(record) {
  const meta = record ?? {};
  const text = typeof meta.text === 'string' ? meta.text : '';
  return {
    isPinned: meta.importanceSnapshot === 'pinned' ? 1 : 0,
    hasOwnerQuote: /слово владельца|владелец сказал|дословно/iu.test(text) ? 1 : 0,
    hasConflict: /расхожд|спор|опроверг|возраж|против/iu.test(text) ? 1 : 0,
  };
}

/**
 * Грубое ведро близости. Ординал, а не число: сравнивать float'ы значило бы
 * протащить в comparator калибровку, которой в v1 нет.
 * @param {number} similarity
 * @returns {number}
 */
export function simBucket(similarity) {
  const s = Number(similarity);
  if (!Number.isFinite(s)) return 0;
  return Math.max(0, Math.min(4, Math.floor(s * 5)));
}

/**
 * Сравнение кандидатов ВНУТРИ пула оси. Лексикографически: флаги старшинством, затем ранг
 * класса, затем ведро свежести, затем ведро близости, затем id.
 *
 * Близость идёт ПОСЛЕ флагов сознательно (вердикт C2 «свежесть свергнута»): закреплённое и
 * сказанное владельцем весит больше, чем похожесть, иначе облако вырождается в top-K.
 *
 * @param {Record<string, any>} a
 * @param {Record<string, any>} b
 * @returns {number}
 */
export function compareCandidates(a, b) {
  const fa = a.flags ?? ordinalFlags(a);
  const fb = b.flags ?? ordinalFlags(b);
  for (const flag of FLAG_ORDER) {
    const d = (fb[flag] ?? 0) - (fa[flag] ?? 0);
    if (d !== 0) return d;
  }
  const rank = (CLASS_RANK[b.class] ?? -1) - (CLASS_RANK[a.class] ?? -1);
  if (rank !== 0) return rank;
  const recency = (b.recencyBucket ?? 0) - (a.recencyBucket ?? 0);
  if (recency !== 0) return recency;
  const sim = simBucket(b.similarity) - simBucket(a.similarity);
  if (sim !== 0) return sim;
  return String(a.id).localeCompare(String(b.id));
}

/**
 * MMR внутри слота: argmax [λ·sim(a,q) − (1−λ)·max sim(a,b)] по уже выбранным.
 *
 * @param {Array<Record<string, any>>} pool
 * @param {number} limit
 * @param {object} input
 * @param {number} input.lambda — назначает C5; умолчания нет
 * @param {(a: object, b: object) => number} input.similarityBetween
 * @returns {Array<Record<string, any>>}
 */
export function mmrSelect(pool, limit, { lambda, similarityBetween }) {
  if (!Number.isFinite(lambda)) {
    throw new Error('subconscious-lift: λ не назначена — калибровка предмет C5, умолчания нет');
  }
  if (typeof similarityBetween !== 'function') {
    throw new Error('subconscious-lift: similarityBetween обязателен — близость не выдумывается');
  }
  const rest = [...pool].sort(compareCandidates);
  const chosen = [];
  while (chosen.length < limit && rest.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < rest.length; i += 1) {
      const candidate = rest[i];
      let maxToChosen = 0;
      for (const picked of chosen) {
        maxToChosen = Math.max(maxToChosen, Number(similarityBetween(candidate, picked)) || 0);
      }
      const score = lambda * (Number(candidate.similarity) || 0) - (1 - lambda) * maxToChosen;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    chosen.push(rest.splice(bestIndex, 1)[0]);
  }
  return chosen;
}

/**
 * Нормализовать ответ порта. Законны две формы: голый массив попаданий (прежний контракт,
 * зубы блоков 1–2 стоят на нём) и `{hits, mode, modeReason}` — когда порт хочет сообщить,
 * что бежал урезанно.
 *
 * Неизвестное значение режима НЕ становится `full`: заявить полное покрытие из-за поломки
 * порта значило бы соврать в пользу зелёного. Непонятый режим честно считается урезанным,
 * и причина называет само непонятое значение.
 *
 * @param {Array<object>|{hits?: Array<object>, mode?: string, modeReason?: string}} result
 * @returns {{hits: Array<object>, mode: 'full'|'reduced', modeReason: string|undefined}}
 */
export function normalizeRetrieval(result) {
  if (Array.isArray(result)) return { hits: result, mode: 'full', modeReason: undefined };
  const hits = Array.isArray(result?.hits) ? result.hits : [];
  const declared = result?.mode;
  if (declared !== undefined && !AXIS_MODES.includes(declared)) {
    return { hits, mode: 'reduced', modeReason: `режим «${String(declared)}» вне закрытого списка` };
  }
  const mode = declared ?? 'full';
  const given = typeof result?.modeReason === 'string' ? result.modeReason.trim() : '';
  if (mode === 'full') return { hits, mode, modeReason: undefined };
  // Пометка без содержания — та же молчаливая пустота, только с ярлыком. Пункт DoD требует
  // не флага, а различимости: читатель обязан узнать, ЧЕМ прогон был урезан.
  return { hits, mode, modeReason: given === '' ? 'порт не назвал причину урезания' : given };
}

/** Запись оси в план запроса. Несущие поля пустыми не бывают. */
function axisEntry(axis, status, hitCount, reason, mode, modeReason) {
  return {
    axis,
    status,
    hitCount,
    ...(reason === undefined ? {} : { reason }),
    // Режим описывает полноту ПРОГОНА, поэтому существует только у оси, которая бежала.
    // У `failed` и `skipped` прогона не было вовсе: написать им `full` значило бы заявить
    // полное покрытие того, чего не происходило. Здесь я отступаю от совета держателя
    // «mode пишется всегда» — «всегда» верно внутри `ran`, но не за его границей.
    ...(status === 'ran' && mode !== undefined ? { mode } : {}),
    ...(status === 'ran' && modeReason !== undefined ? { modeReason } : {}),
  };
}

/**
 * Построить облако подсознания.
 *
 * @param {object} input
 * @param {string} input.personaId
 * @param {string} input.topic
 * @param {(axis: string, query: string) => Promise<Array<object>|{hits: Array<object>, mode?: string, modeReason?: string}>} input.retrieve — порт (соседний блок); вторая форма нужна порту, чтобы объявить урезанный прогон
 * @param {(id: string) => boolean} input.notAlreadyOperational — вычитание эха оперативной проекции
 * @param {(a: object, b: object) => number} input.similarityBetween
 * @param {number} input.lambda — из C5
 * @param {number|null} input.tauOut — из C5; `null` = слот аутсайдеров честно пуст
 * @param {string} input.cloudId — «сейчас» и случайность снаружи: ядро детерминировано
 * @returns {Promise<{cloudId: string, personaId: string, queryPlan: object, items: object[], emerged: never[], rejected: false}>}
 */
export async function buildSubconsciousCloud({
  personaId,
  topic,
  retrieve,
  notAlreadyOperational,
  similarityBetween,
  lambda,
  tauOut = null,
  cloudId,
}) {
  if (typeof personaId !== 'string' || personaId.trim() === '') {
    throw new Error('subconscious-lift: personaId обязателен — облако без адресата не существует');
  }
  if (typeof cloudId !== 'string' || cloudId.trim() === '') {
    throw new Error('subconscious-lift: cloudId обязателен — ядро не выдумывает идентификатор');
  }

  const axes = [];
  const byId = new Map();
  let deduped = 0;

  for (const axis of QUERY_AXES) {
    let hits;
    try {
      hits = await retrieve(axis, topic);
    } catch (error) {
      // Сбой оси живёт В ПЛАНЕ и только там. Ставить здесь `rejected` значило бы написать
      // акт персоны за неё: «отверг облако» — суждение, а не поломка порта.
      axes.push(axisEntry(axis, 'failed', 0, String(error?.message ?? error)));
      continue;
    }
    const { hits: list, mode, modeReason } = normalizeRetrieval(hits);
    axes.push(axisEntry(axis, 'ran', list.length, undefined, mode, modeReason));
    for (const hit of list) {
      if (hit?.id === undefined) continue;
      if (typeof notAlreadyOperational === 'function' && !notAlreadyOperational(hit.id)) {
        deduped += 1;
        continue;
      }
      const known = byId.get(hit.id);
      if (known === undefined) byId.set(hit.id, { ...hit, axes: [axis] });
      else known.axes.push(axis);
    }
  }

  const pool = [...byId.values()].map((c) => ({ ...c, flags: ordinalFlags(c) }));
  const similarPool = pool.filter((c) => c.axes.includes('topic'));
  const similar =
    similarPool.length === 0
      ? []
      : mmrSelect(similarPool, SLOT_QUOTAS.similar, { lambda, similarityBetween });

  const takenIds = new Set(similar.map((c) => c.id));
  const contrast = pool
    .filter((c) => !takenIds.has(c.id) && (c.axes.includes('contrast') || c.axes.includes('dispute')))
    .sort(compareCandidates)
    .slice(0, SLOT_QUOTAS.contrast);
  for (const c of contrast) takenIds.add(c.id);

  // Аутсайдер без калиброванного порога НЕ добирается «примерно»: слот остаётся пуст, и
  // причина названа в плане. Выдуманный τ_out превратил бы дальнего в массовку.
  let outsider = [];
  if (tauOut === null || !Number.isFinite(tauOut)) {
    axes.push(axisEntry('outsider', 'skipped', 0, 'τ_out не откалиброван — предмет C5'));
  } else {
    outsider = pool
      .filter((c) => !takenIds.has(c.id) && (Number(c.similarity) || 0) < tauOut)
      .sort(compareCandidates)
      .slice(0, SLOT_QUOTAS.outsider);
  }

  const items = [
    ...similar.map((c) => ({ ...c, slot: 'similar' })),
    ...contrast.map((c) => ({ ...c, slot: 'contrast' })),
    ...outsider.map((c) => ({ ...c, slot: 'outsider' })),
  ].slice(0, CLOUD_MAX);

  return {
    cloudId,
    personaId,
    // Здоровье плана кладётся В план, а не отдаётся отдельной функцией: потребитель, забывший
    // её позвать, не отличил бы отказ порта от честной пустоты — и это негласное соглашение
    // ревью справедливо назвало риском.
    queryPlan: { axes, deduped, poolSize: pool.length, health: planHealth({ axes }) },
    items,
    // Пусты по построению: акт принадлежит персоне, лифт его не совершает.
    emerged: [],
    rejected: false,
  };
}

/**
 * Различить «архив пуст» и «мультизапрос сломан». Обе ситуации дают ноль кандидатов, и
 * без этого различения отказ инфраструктуры неотличим от честной пустоты.
 *
 * Режим оси сюда НЕ входит намеренно: здоровье отвечает на «прогон состоялся?», режим — на
 * «прогон покрыл предмет?». Урезанный прогон — это исправная работа в худших условиях, а не
 * поломка; смешать их значило бы объявлять `retrieval-broken` там, где всё цело, и потерять
 * оба ответа сразу.
 *
 * @param {{axes: Array<{status: string}>}} queryPlan
 * @returns {'ok'|'empty-archive'|'retrieval-broken'}
 */
export function planHealth(queryPlan) {
  const axes = queryPlan?.axes ?? [];
  if (axes.some((a) => a.status === 'failed')) return 'retrieval-broken';
  const ran = axes.filter((a) => a.status === 'ran');
  if (ran.length > 0 && ran.every((a) => a.hitCount === 0)) return 'empty-archive';
  return 'ok';
}
