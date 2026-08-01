/**
 * «Ратифицирован» — предикат, а не отметка (Block `cut-contract`, Phase 2).
 *
 * Форма не изобретается, а берётся из дерева: утренние гейты держат согласия
 * владельца дайджестом (`frozenDigest` на снимок топ-3, `draftDigest` + `ownerAck`
 * на черновик ласточки — `scripts/lib/morning-gates.mjs`). Булев флаг переносится
 * сам собой: правишь блоки — `true` остаётся. Дайджест — нет, и вердикт M2
 * («перенос согласия на изменённый контракт запрещён») выполняется машинно.
 *
 * `node:crypto` — единственный встроенный модуль здесь: хеш детерминирован, это
 * не ФС, не сеть и не часы. Часов в ядре нет вовсе: время приходит параметром.
 */
import { createHash } from 'node:crypto';

import { finding } from './cut-plan.mjs';

/** Ратифицировать вправе только владелец: аудит нарезки уходит ему. */
export const RATIFIED_BY = 'owner';

/** ISO-8601 обязателен СО СМЕЩЕНИЕМ: время без зоны — не момент, а намёк. */
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/** @param {unknown} at @returns {boolean} */
export const isIsoWithOffset = (at) => typeof at === 'string' && ISO_WITH_OFFSET.test(at);

/**
 * Метка блока годна и в форме `…Z`: ратификация требует смещения (владелец называет момент
 * явно), а `revisionAt` живёт в планах и в UTC-виде — существующие планы дерева написаны так.
 * Принимать только «со смещением» значило бы объявить их метку отсутствующей и снести.
 */
const isIsoValue = (v) => typeof v === 'string' && (ISO_WITH_OFFSET.test(v) || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(v));

/** Детерминированная канонизация значения: ключи сортированы, `//`-комментарии выброшены. */
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value)
      .filter((k) => !k.startsWith('//') && value[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * Тело плана БЕЗ узла `ratification` — иначе дайджест ссылался бы на себя.
 * @param {object} plan @returns {string}
 */
export function canonicalCutBody(plan) {
  const { ratification: _skip, ...body } = plan ?? {};
  return canonicalJson(body);
}

/** @param {object} plan @returns {string} sha256 канонического тела */
export const cutDigestOf = (plan) => createHash('sha256').update(canonicalCutBody(plan)).digest('hex');

/**
 * planRatified(plan) ⟺ by === 'owner' ∧ digest === sha256(canonicalBody(plan))
 *                    ∧ at — валидный ISO-8601 со смещением.
 * @param {object} plan @returns {boolean}
 */
export function planRatified(plan) {
  const r = plan?.ratification;
  if (!r || typeof r !== 'object') return false;
  return r.by === RATIFIED_BY && isIsoWithOffset(r.at) && r.digest === cutDigestOf(plan);
}

/** Находка `plan_unratified` с конкретной причиной: нет узла · не владелец · время · дайджест. */
export function ratificationFindings(plan) {
  const r = plan?.ratification;
  const at = 'ratification';
  if (!r || typeof r !== 'object') {
    return [finding('plan_unratified', at, 'отметки владельца нет — неретифицированный план не план')];
  }
  if (r.by !== RATIFIED_BY) {
    return [
      finding('plan_unratified', `${at}.by`, `«${r.by ?? '—'}» ратифицировать не вправе: ратификация принадлежит владельцу`),
    ];
  }
  if (!isIsoWithOffset(r.at)) {
    return [finding('plan_unratified', `${at}.at`, `время «${r.at ?? '—'}» не ISO-8601 со смещением`)];
  }
  if (r.digest !== cutDigestOf(plan)) {
    return [
      finding(
        'plan_unratified',
        `${at}.digest`,
        'дайджест разъехался с телом плана: тело правили после согласия — перенос согласия на изменённый контракт запрещён',
      ),
    ];
  }
  return [];
}

/**
 * Запись отметки — инструментом по явному слову владельца (решение владельца
 * 30.07, прецедент `morning:gate magistral`: слово владельца → запись
 * инструментом → `author=human`). Рука владельца в файл не лезет.
 *
 * Время НЕ берётся из часов: `at` подаётся снаружи. Отказ — легальный, с
 * причиной, а не пустое поле.
 *
 * @param {object} plan @param {{at: string}} opts
 * @returns {{ok: true, plan: object} | {ok: false, reason: string}}
 */
export function ratifyPlan(plan, { at } = {}) {
  if (!plan || typeof plan !== 'object') return { ok: false, reason: 'план не объект — ратифицировать нечего' };
  if (!isIsoWithOffset(at)) {
    return { ok: false, reason: `время «${at ?? '—'}» не ISO-8601 со смещением: зуб не подставляет now() за владельца` };
  }
  const body = { ...plan, blocks: stampRevisions(plan.blocks, at) };
  delete body.ratification;
  return { ok: true, plan: { ...body, ratification: { by: RATIFIED_BY, at, digest: cutDigestOf(body) } } };
}

/** Дайджест ТЕЛА блока — без полей самой отметки: иначе метка ссылалась бы на себя. */
export function blockRevisionDigest(block) {
  const body = { ...block };
  delete body.revisionAt;
  delete body.revisionOf;
  return createHash('sha256').update(canonicalJson(body)).digest('hex');
}

/**
 * Машинный `revisionAt`: метку ставит ИНСТРУМЕНТ при ратификации, а не резчик рукой.
 *
 * Зачем. `isStale(t, b) => t.at < b.revisionAt` — свежесть считается от ревизии предмета,
 * и это правильный предикат. Но `revisionAt` писал тот же, кто режет: замок, ключ от
 * которого у того, кого он запирает. Вещдок 01.08 (`meeting-gates-teeth`): председатель
 * перерезал план v1→v2 и метку не двинул — ничто не заставило, и следы, написанные после
 * перерезки, зачлись как свежие.
 *
 * Почему не «двигать всем на каждой ратификации». Перерезка одного блока не должна обнулять
 * вещдоки соседей: это ложное красное, а оно стоит столько же, сколько ложное зелёное.
 * Поэтому метка двигается ТОЛЬКО у блоков, чьё тело изменилось — сравнением дайджеста тела
 * с сохранённым `revisionOf`.
 *
 * Следствие для #1566, ради которого всё и делается: при перерезке дети получают новую метку,
 * и разбор родителя становится протухшим САМ СОБОЙ — наследовать нечего, механика сама
 * исполняет решение владельца «перерезал блок — прогоняй заново по каждому куску».
 *
 * @param {unknown} blocks
 * @param {string} at момент ратификации (ISO со смещением) — приходит параметром, часов здесь нет
 */
export function stampRevisions(blocks, at) {
  if (!Array.isArray(blocks)) return blocks;
  return blocks.map((b) => {
    if (!b || typeof b !== 'object') return b;
    const digest = blockRevisionDigest(b);
    // Тело не менялось с прошлой отметки — метка остаётся прежней: чужие вещдоки не гасим.
    if (b.revisionOf === digest && isIsoValue(b.revisionAt)) return b;
    // ПЕРВАЯ простановка на существующем плане: `revisionOf` ещё нет, потому что прежние
    // ратификации его не писали. Двигать метку здесь нельзя — иначе внедрение механизма
    // разом обнулит вещдоки КАЖДОГО плана в дереве, то есть заведёт ложное красное на всей
    // истории. Вещдок 01.08: на собственном спринте `cut-act-trace` перерезка v4 меняла зону
    // только третьего блока, а первые два получили новую метку и вышли `stale_trace`.
    // Цена перехода названа честно: рукописная метка принимается на веру ОДИН раз, дальше
    // ею владеет инструмент.
    if (b.revisionOf === undefined && isIsoValue(b.revisionAt)) {
      return { ...b, revisionOf: digest };
    }
    return { ...b, revisionAt: at, revisionOf: digest };
  });
}
