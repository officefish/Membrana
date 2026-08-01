/**
 * Замороженный enum РОДОВ АКТА ПЛАНА — вторая ось следа, отдельная от исполнения.
 *
 * ЗАЧЕМ ОТДЕЛЬНАЯ ЛЕНТА, а не пятый род в `TRACE_KINDS`.
 * Роды исполнения закрыты **по построению**: у окна работы четыре момента (до старта ·
 * на входе · по ходу · на выходе), в каждом ровно один акт, который исполнитель не может
 * произвести, не будучи им. Форма следа исполнения требует `blockId`.
 *
 * Акт нарезки блоку **не принадлежит**: он про план целиком и происходит ДО окна. Втиснуть
 * его в ленту исполнения значило бы соврать формой — блок пришлось бы выдумать либо занулить,
 * и оба варианта портят предикаты соседей. Пятый род потребовал бы пятого момента окна, а
 * моментов четыре. Поэтому здесь — своя ось со своими тремя моментами плана.
 *
 * ВЕЩДОК, ради которого ось заведена (долг `#sprint-cut-act-has-no-trace`, 30.07):
 * план `mfcc-compare-sprint` v1 был подписан `cutBy=tarasov` БЕЗ прогона контекста тимлида.
 * Поймал владелец словами «не вижу, что ты вызвал спринт через скилл» — не механизм.
 * Повтор 01.08 в прогоне `meeting-gates-teeth`: та же подпись рукой, плюс перерезка v1→v2,
 * не оставившая следа нигде, кроме смены дайджеста.
 *
 * Род вне списка — НЕ «прочее»: это ошибка входа. Открытый список означал бы обход
 * проверки новым словом, ровно то, от чего закрыт список родов исполнения.
 *
 * Зеркало для человека — `docs/sprint/cut/ACT_KINDS.md`; расхождение ловится зубом
 * в `scripts/sprint-cut-acts.test.mjs`.
 */

/** Три момента жизни плана. Список закрыт. */
export const ACT_KINDS = Object.freeze({
  /** Резчик прогнал СВОЙ профильный контекст прежде, чем резать. */
  CUT_CONTEXT_RUN: 'cut_context_run',
  /** Акт нарезки: план такой-то версии написан. */
  CUT_ACT: 'cut_act',
  /** Акт перерезки: план изменён в работе, прежнее согласие снято. */
  RECUT_ACT: 'recut_act',
});

/**
 * Канонический порядок моментов плана: контекст ≺ нарезка ≺ перерезка.
 * Перерезка законно повторяется; первые два — по одному разу на версию плана.
 * @type {readonly string[]}
 */
export const ACT_KIND_ORDER = Object.freeze([
  ACT_KINDS.CUT_CONTEXT_RUN,
  ACT_KINDS.CUT_ACT,
  ACT_KINDS.RECUT_ACT,
]);

/** Момент плана, который род покрывает (для отчёта и доки-зеркала). */
export const ACT_KIND_MOMENT = Object.freeze({
  [ACT_KINDS.CUT_CONTEXT_RUN]: 'до нарезки',
  [ACT_KINDS.CUT_ACT]: 'нарезка',
  [ACT_KINDS.RECUT_ACT]: 'перерезка',
});

/** Код ошибки входа: род вне закрытого списка. Не находка — вердиктов по такой ленте нет. */
export const E_ACT_KIND_UNKNOWN = 'E_ACT_KIND_UNKNOWN';

/** @param {unknown} kind */
export function isKnownActKind(kind) {
  return ACT_KIND_ORDER.includes(/** @type {string} */ (kind));
}

/**
 * Разобрать одну запись ленты актов.
 *
 * Возвращает либо запись, либо ошибку входа с причиной — «нет» здесь всегда с именем,
 * пустое поле отказом не является.
 *
 * @param {unknown} raw
 * @returns {{ok: true, act: {kind: string, sprintId: string, subject: string, at: string, ref: string|null, planDigest: string|null}} | {ok: false, error: string, reason: string}}
 */
export function parseAct(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: E_ACT_KIND_UNKNOWN, reason: 'запись не объект — читать нечего' };
  }
  const r = /** @type {Record<string, unknown>} */ (raw);
  if (!isKnownActKind(r.kind)) {
    return {
      ok: false,
      error: E_ACT_KIND_UNKNOWN,
      reason: `род «${String(r.kind)}» вне закрытого списка (${ACT_KIND_ORDER.join(', ')})`,
    };
  }
  const filled = (v) => typeof v === 'string' && v.trim() !== '';
  if (!filled(r.sprintId)) {
    return { ok: false, error: E_ACT_KIND_UNKNOWN, reason: 'нет sprintId — акту не к чему относиться' };
  }
  if (!filled(r.subject)) {
    return { ok: false, error: E_ACT_KIND_UNKNOWN, reason: 'нет subject — акт без автора не акт' };
  }
  if (!filled(r.at)) {
    return { ok: false, error: E_ACT_KIND_UNKNOWN, reason: 'нет at — момент обязателен' };
  }
  return {
    ok: true,
    act: {
      kind: /** @type {string} */ (r.kind),
      sprintId: /** @type {string} */ (r.sprintId),
      subject: /** @type {string} */ (r.subject),
      at: /** @type {string} */ (r.at),
      ref: filled(r.ref) ? /** @type {string} */ (r.ref) : null,
      planDigest: filled(r.planDigest) ? /** @type {string} */ (r.planDigest) : null,
    },
  };
}

/**
 * Прогонял ли резчик свой контекст для этого плана.
 *
 * Предикат, а не побочный эффект: проверяется без чтения ФС, лента приходит значением.
 * Пустая лента — НЕ «прогонял»: отсутствие вещдока не есть вещдок отсутствия наоборот.
 *
 * @param {Array<{kind: string, sprintId: string, subject: string}>} acts разобранная лента
 * @param {{sprintId?: string, cutBy?: string}} plan
 */
export function cutterRanContext(acts, plan) {
  const sprintId = plan?.sprintId;
  const cutBy = plan?.cutBy;
  if (!sprintId || !cutBy) return false;
  return (acts ?? []).some(
    (a) => a?.kind === ACT_KINDS.CUT_CONTEXT_RUN && a.sprintId === sprintId && a.subject === cutBy,
  );
}
