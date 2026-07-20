/**
 * Каркас плана дня — детерминированный слой (компонент K эпика ritual-refactor, вердикт M2).
 * Стенка `Slot → Text`: этот слой владеет `id/order/title` пяти слотов и отбором топ-3;
 * LLM владеет только ТЕКСТОМ внутри слота (`fill`, снаружи). Чистые функции без сети/DOM/LLM.
 *
 * Пять слотов ВСЕГДА присутствуют; пустой слот — легальное явное состояние, не исчезновение
 * (анти-«молчун»). Топ-3 — детерминированный балансирующий ранжировщик, НЕ модель.
 */

/** Пять слотов плана дня. Порядок константный — каркас не плавает от прогона к прогону. */
export const SLOT_DEFS = Object.freeze([
  { id: 'magistral', order: 1, title: 'Магистраль', kind: 'magistral', cardinality: 1 },
  { id: 'reinforcement', order: 2, title: 'Подкрепление', kind: 'reinforcement', cardinality: 2 },
  { id: 'perspective', order: 3, title: 'Перспективные', kind: 'perspective', cardinality: 3 },
  { id: 'experimental', order: 4, title: 'Экспериментальные', kind: 'experimental', cardinality: 3 },
  { id: 'sanitary', order: 5, title: 'Санитарные', kind: 'sanitary', cardinality: 5 },
]);

/** Фиксированный порядок зон для балансировки топ-3 (продукт ↔ тулинг/бизнес). */
export const ZONE_ORDER = Object.freeze(['product', 'tooling', 'business']);

/** Вес размера для ранга: L сильнее M сильнее S. */
const SIZE_WEIGHT = Object.freeze({ L: 3, M: 2, S: 1, XS: 0 });

/**
 * Каркас: ровно 5 слотов в константном порядке. Тотальная функция без входа — один и тот
 * же результат между вызовами. Слоты заморожены (структуру нельзя мутировать из `fill`).
 * @returns {ReadonlyArray<{id: string, order: number, title: string, kind: string, cardinality: number}>}
 */
export function frame() {
  return SLOT_DEFS.map((s) => Object.freeze({ ...s }));
}

/**
 * Детерминированный балансирующий ранг кандидатов магистрали. Внутри зоны — по силе
 * (вес размера ↓, tie-break по `id` лексикографически). Между зонами — round-robin в
 * `ZONE_ORDER`, чтобы НЕ выдать три из одной зоны при наличии альтернатив (M2:
 * балансировка = ключ сортировки, не отдельный этап модели).
 * @param {Array<{id: string, zone: string, size?: string}>} candidates
 * @returns {Array<{id: string, zone: string, size?: string}>}
 */
export function rank(candidates) {
  const byZone = new Map(ZONE_ORDER.map((z) => [z, []]));
  const extra = []; // кандидаты вне известных зон — в хвост, стабильно
  for (const c of candidates ?? []) {
    if (byZone.has(c.zone)) byZone.get(c.zone).push(c);
    else extra.push(c);
  }
  const score = (c) => SIZE_WEIGHT[c.size] ?? 0;
  const inZone = (arr) =>
    [...arr].sort((a, b) => score(b) - score(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const z of ZONE_ORDER) byZone.set(z, inZone(byZone.get(z)));
  extra.sort((a, b) => score(b) - score(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  // Round-robin по зонам: сначала сильнейший каждой зоны, потом вторые, и т.д.
  const ranked = [];
  const cursors = new Map(ZONE_ORDER.map((z) => [z, 0]));
  let progress = true;
  while (progress) {
    progress = false;
    for (const z of ZONE_ORDER) {
      const i = cursors.get(z);
      const arr = byZone.get(z);
      if (i < arr.length) {
        ranked.push(arr[i]);
        cursors.set(z, i + 1);
        progress = true;
      }
    }
  }
  return [...ranked, ...extra];
}

/**
 * Топ-3 кандидата магистрали из снимка — детерминированно, с балансировкой зон. При `n<3`
 * возвращает МЕНЬШЕ, без добивки (M2: «меньше, но честно»). Провенанс кандидата сохраняется.
 * @param {{candidates?: Array<{id: string, zone: string, size?: string}>}} snapshot
 * @returns {Array<{id: string, zone: string, size?: string}>} длиной ≤ 3
 */
export function buildTop3(snapshot) {
  return rank(snapshot?.candidates ?? []).slice(0, 3);
}

/**
 * Черновик плана: каркас (5 слотов) + топ-3 кандидата магистрали. Текст слотов НЕ здесь —
 * его даёт `fill` (LLM) снаружи, читая этот черновик. Детерминирован от снимка.
 * @param {{candidates?: Array<object>}} snapshot
 * @returns {{slots: ReadonlyArray<object>, top3: Array<object>}}
 */
export function buildPlanDraft(snapshot) {
  return { slots: frame(), top3: buildTop3(snapshot) };
}

/**
 * Вход для `fill` (LLM) — только то, что модель ВПРАВЕ читать: `kind` слота и назначенные
 * задачи. Структурные поля (`id/order/title`) НЕ передаются — стенка `Slot → Text`.
 * @param {{kind: string}} slot
 * @param {Array<object>} tasks
 * @returns {{kind: string, tasks: Array<object>}}
 */
export function fillInput(slot, tasks) {
  return Object.freeze({ kind: slot.kind, tasks: [...(tasks ?? [])] });
}

/**
 * Кандидаты магистрали из реестра — чистая проекция активных карточек заданного размера
 * (по умолчанию `L`) в форму `{id, zone, size}`. `zone` берётся из поля карточки (`product`
 * / `tooling` / `business`); карточка без зоны получает `zone=null` → `rank` кладёт её в
 * хвост (не в балансируемую тройку). Так балансировка активируется по мере разметки зон,
 * а до разметки топ-3 честно берётся по силе. Реестр читает вызывающий (fs снаружи ядра).
 * @param {Array<{id: string, status?: string, size?: string, zone?: string}>} tasks
 * @param {{size?: string}} [opts]
 * @returns {Array<{id: string, zone: string|null, size: string}>}
 */
export function candidatesFromRegistry(tasks, opts = {}) {
  const size = opts.size ?? 'L';
  return (tasks ?? [])
    .filter((t) => t && t.status === 'active' && t.size === size)
    .map((t) => ({ id: t.id, zone: t.zone ?? null, size: t.size }));
}
