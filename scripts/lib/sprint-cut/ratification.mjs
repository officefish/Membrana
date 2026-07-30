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
  const body = { ...plan };
  delete body.ratification;
  return { ok: true, plan: { ...body, ratification: { by: RATIFIED_BY, at, digest: cutDigestOf(body) } } };
}
