/**
 * ШОВ A→B: единственное место, где известна ФОРМА плана нарезки (CONCEPT §9).
 *
 * Предикаты видят только `NormalizedPlan` и о форме входа не знают ничего. Следствие:
 * если на Phase 3 форма соседа окажется другой, адаптируется ОДНА функция, а не гейт.
 * Форма ниже придумана односторонне и нарочно минимальна: всё, что предикату не нужно,
 * в нормализованную модель не попадает — «правильной» формы у соседа не требуется.
 *
 * Без `fs`, без сети, без `git`/`gh`, без `Date.now()`.
 */

import { INPUT_ERRORS } from './gate-exit-codes.mjs';

/** Тот же слаг, что `ID_RE` в `scripts/lib/evidence-index.mjs` — берём готовое, не переобъявляем смысл. */
export const BLOCK_ID_RE = /^[a-z0-9][a-z0-9-]{2,63}$/u;

export const MODES = Object.freeze({
  EXPLICIT_HONEST: 'explicit_honest',
  NO_PERSONAL_RESPONSIBILITY: 'no_personal_responsibility',
});

/**
 * @typedef {object} NormalizedBlock
 * @property {string} blockId
 * @property {string} assigned      personaId из `docs/virtual-team/voices.registry.json`
 * @property {string} mode          MODES.*
 * @property {string|null} reason   обязательна при MODES.NO_PERSONAL_RESPONSIBILITY
 * @property {number} revisionAt    epoch ms; ревизия ПРЕДМЕТА блока (не календарь)
 * @property {number} from          epoch ms, включительно
 * @property {number} to            epoch ms, исключительно (полуинтервал `[from, to)`)
 * @property {number} graceMs       допуск позднего закрытия; 0 по умолчанию `//provisional`
 *
 * @typedef {object} NormalizedPlan
 * @property {string} planId
 * @property {NormalizedBlock[]} blocks
 *
 * @typedef {{ code: string, subject: string, detail: string }} InputError
 */

/** ISO-8601 → epoch ms, либо null. Детерминировано: `Date.parse`, не `Date.now`. @param {unknown} v */
export function parseIso(v) {
  if (typeof v !== 'string' || v.trim() === '') return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Привести сырой план к нормализованной модели.
 *
 * @param {unknown} raw
 * @param {{ knownPersonas: readonly string[], allowedReasons: readonly string[] }} ctx
 * @returns {{ plan: NormalizedPlan|null, errors: InputError[] }}
 */
export function readPlan(raw, ctx) {
  /** @type {InputError[]} */
  const errors = [];
  const err = (code, subject, detail) => errors.push({ code, subject, detail });

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    err(INPUT_ERRORS.E_PLAN_UNREADABLE, 'plan', 'план не объект');
    return { plan: null, errors };
  }
  const p = /** @type {Record<string, any>} */ (raw);
  const planId = typeof p.planId === 'string' && p.planId.trim() !== '' ? p.planId : null;
  if (planId === null) err(INPUT_ERRORS.E_PLAN_UNREADABLE, 'plan', 'planId не строка');

  // Неретифицированный план — не план (M2, EXPECTATIONS). Пишет отметку инструмент по слову
  // владельца (OWNER_ANSWERS §1), рука в файл не лезет; гейт только читает факт.
  if (p.ratified !== true) {
    err(INPUT_ERRORS.E_PLAN_NOT_RATIFIED, planId ?? 'plan', 'ratified !== true');
  }

  const from = parseIso(p.window?.from);
  const to = parseIso(p.window?.to);
  if (from === null || to === null || !(from < to)) {
    err(INPUT_ERRORS.E_PLAN_NO_WINDOW, planId ?? 'plan', 'окно без границ или from >= to');
  }
  const planRevision = parseIso(p.revisionAt);

  const rawBlocks = Array.isArray(p.blocks) ? p.blocks : [];
  if (rawBlocks.length === 0) err(INPUT_ERRORS.E_PLAN_NO_BLOCKS, planId ?? 'plan', 'блоков нет');

  /** @type {NormalizedBlock[]} */
  const blocks = [];
  const seen = new Set();
  for (const b of rawBlocks) {
    const blockId = typeof b?.blockId === 'string' ? b.blockId : '';
    if (!BLOCK_ID_RE.test(blockId)) {
      err(INPUT_ERRORS.E_BLOCK_ID_INVALID, blockId || '(без blockId)', 'blockId не слаг 3-64 [a-z0-9-]');
      continue;
    }
    if (seen.has(blockId)) {
      err(INPUT_ERRORS.E_BLOCK_ID_INVALID, blockId, 'blockId не уникален внутри плана');
      continue;
    }
    seen.add(blockId);

    const assigned = typeof b.assigned === 'string' ? b.assigned : '';
    if (!ctx.knownPersonas.includes(assigned)) {
      // Персона вне реестра голосов — ошибка входа, а не «неизвестный исполнитель»:
      // объявленный обязан быть вызываемым (`yarn verify:voices`).
      err(INPUT_ERRORS.E_PERSONA_UNKNOWN, blockId, `assigned=${assigned || '(пусто)'} вне voices.registry.json`);
    }

    // Молчание не режим: отсутствие поля = explicit_honest.
    const mode = b.mode === undefined || b.mode === null ? MODES.EXPLICIT_HONEST : b.mode;
    if (mode !== MODES.EXPLICIT_HONEST && mode !== MODES.NO_PERSONAL_RESPONSIBILITY) {
      err(INPUT_ERRORS.E_PLAN_UNREADABLE, blockId, `mode=${String(mode)} вне двух`);
      continue;
    }
    const reason = typeof b.reason === 'string' ? b.reason : null;
    if (mode === MODES.NO_PERSONAL_RESPONSIBILITY && (reason === null || !ctx.allowedReasons.includes(reason))) {
      // Вторая дверь без причины из закрытого списка — тихая кнопка «пропустить честность».
      err(INPUT_ERRORS.E_REASON_UNKNOWN, blockId, `reason=${reason ?? '(пусто)'} вне закрытого списка четырёх`);
    }

    // Протухание считается относительно ревизии ПРЕДМЕТА: своя метка блока, иначе плановая.
    const revisionAt = parseIso(b.revisionAt) ?? planRevision;
    if (revisionAt === null) {
      // Считать «всё свежее» при отсутствии метки — молчаливый перенос согласия на изменённый
      // контракт (запрет M2). Поэтому это ошибка входа, а не мягкая ветка.
      err(INPUT_ERRORS.E_PLAN_NO_REVISION, blockId, 'revisionAt нет ни у блока, ни у плана');
    }

    const graceMs = Number.isFinite(b.graceMs) ? Number(b.graceMs) : 0; // `//provisional`
    blocks.push({
      blockId,
      assigned,
      mode,
      reason,
      revisionAt: revisionAt ?? 0,
      from: from ?? 0,
      to: to ?? 0,
      graceMs,
    });
  }

  if (errors.length > 0) return { plan: null, errors };
  return { plan: { planId: /** @type {string} */ (planId), blocks }, errors };
}
