/**
 * Night Triage — промоут кандидатов в карточку инсайта (#1445, шесть пунктов
 * комнаты 29.07 «Жатва инсайтов из ночных триажей»).
 *
 * Развод домов (п.1, Ожегов): сырьё среза живёт в core append-only своим путём;
 * ЗДЕСЬ рождаются кандидаты — только с `id` и причиной. PR открывается тогда и
 * только тогда, когда кандидат есть (п.2); нет кандидата — молчание легально и
 * называет причину (норма B10).
 *
 * Чистые функции: ноль I/O, два прогона совпадают.
 */

import type { TriageSnapshot } from './night-triage-core';

/**
 * Scorecard строки (п.3, Тарасов): gap / cost / reversible — закрытые enum'ы,
 * не свободный текст (иначе зверь B9 «Проза»). Значения — реализационный выбор:
 * gap: чем дыра бьёт (магистраль дня / системная доля / гигиена);
 * cost: порядок цены починки в размерах карточек; reversible: обратимость шага.
 */
export const GAP_VALUES = ['magistral', 'systemic', 'hygiene'] as const;
export const COST_VALUES = ['s', 'm', 'l'] as const;
export const REVERSIBLE_VALUES = ['yes', 'no'] as const;

export type Gap = (typeof GAP_VALUES)[number];
export type Cost = (typeof COST_VALUES)[number];
export type Reversible = (typeof REVERSIBLE_VALUES)[number];

export interface Scorecard {
  readonly gap: Gap;
  readonly cost: Cost;
  readonly reversible: Reversible;
}

/** Кандидат в карточку инсайта: рождается только с id и причиной (п.1). */
export interface PromoteCandidate {
  readonly id: string;
  readonly reason: string;
  readonly scorecard: Scorecard;
}

/** Свободный текст в scorecard не проходит (п.3): named problems, не булев провал. */
export function validateScorecard(s: unknown, label = 'scorecard'): string[] {
  const problems: string[] = [];
  const rec = s as Record<string, unknown> | null;
  if (!rec || typeof rec !== 'object') return [`${label}: не объект`];
  if (!GAP_VALUES.includes(rec.gap as Gap)) {
    problems.push(`${label}: gap «${String(rec.gap)}» ∉ {${GAP_VALUES.join(', ')}}`);
  }
  if (!COST_VALUES.includes(rec.cost as Cost)) {
    problems.push(`${label}: cost «${String(rec.cost)}» ∉ {${COST_VALUES.join(', ')}}`);
  }
  if (!REVERSIBLE_VALUES.includes(rec.reversible as Reversible)) {
    problems.push(
      `${label}: reversible «${String(rec.reversible)}» ∉ {${REVERSIBLE_VALUES.join(', ')}}`,
    );
  }
  return problems;
}

export interface PromoteContext {
  /** Магистраль дня из morning-gates-state.json; null — гейт не прочитан. */
  readonly magistral: string | null;
  /** Всего active-карточек реестра (для системной доли). */
  readonly activeTotal: number;
}

/**
 * Доля orphan от активного реестра, выше которой срез сообщает не «заброшенность»,
 * а дырку в процедуре заведения карточек (вещдок #1445: 158 из 212 = 75%).
 */
export const ORPHAN_SYSTEMIC_SHARE = 0.5;

/**
 * Детерминированный промоут (п.1–п.2): правила названы, свободных суждений нет.
 *
 * R1 — магистраль дня в срезе: карточка магистрали ghost/stale — наблюдение,
 *      достойное карточки (прямой ответ на primary focus, п.5).
 * R2 — системная доля: orphan > 50% активного реестра — триаж мерит дырку
 *      процедуры заведения, а не заброшенность (цифра комнаты: 158/212).
 *
 * Счётчики сами по себе кандидатами НЕ являются: строка без наблюдения — не идея.
 */
export function promoteCandidates(
  snapshot: TriageSnapshot,
  ctx: PromoteContext,
): PromoteCandidate[] {
  const out: PromoteCandidate[] = [];

  if (ctx.magistral) {
    const hit = [...snapshot.ghosts, ...snapshot.stale].find((f) => f.id === ctx.magistral);
    if (hit) {
      out.push({
        id: `magistral-in-triage-${hit.id}`,
        reason:
          `магистраль дня «${hit.id}» найдена в срезе как ${hit.category} (${hit.detail}) — ` +
          'выбор владельца расходится с состоянием карточки',
        scorecard: { gap: 'magistral', cost: 's', reversible: 'yes' },
      });
    }
  }

  if (ctx.activeTotal > 0 && snapshot.counts.orphan / ctx.activeTotal > ORPHAN_SYSTEMIC_SHARE) {
    const share = Math.round((snapshot.counts.orphan / ctx.activeTotal) * 100);
    out.push({
      id: 'orphan-share-systemic',
      reason:
        `orphan ${snapshot.counts.orphan} из ${ctx.activeTotal} активных (${share}%) — ` +
        'триаж мерит дырку процедуры заведения карточек, а не заброшенность',
      scorecard: { gap: 'systemic', cost: 'm', reversible: 'yes' },
    });
  }

  return out;
}

/**
 * Стык с магистралью дня (п.5, Курёхин): одна строка на пункт среза. Нет
 * пересечения — так и пишется явной строкой; сканер без вопроса дня — фоновый шум.
 */
export function answerPrimaryFocus(snapshot: TriageSnapshot, magistral: string | null): string[] {
  if (!magistral) {
    return ['магистраль дня не прочитана (morning-gates-state) — стык не проверен, и это названо'];
  }
  const touch = (findings: readonly { id: string }[]): boolean =>
    findings.some((f) => f.id === magistral);
  return [
    `ghost: ${touch(snapshot.ghosts) ? `магистраль «${magistral}» в списке` : `магистраль «${magistral}» не затронута`}`,
    `orphan: ${touch(snapshot.orphans) ? `магистраль «${magistral}» в списке` : `магистраль «${magistral}» не затронута`}`,
    `stale: ${touch(snapshot.stale) ? `магистраль «${magistral}» в списке` : `магистраль «${magistral}» не затронута`}`,
  ];
}

/** Вердикты пачки черновиков (п.4, Структурщик): «оставим открытым» в перечне НЕТ. */
export const BATCH_VERDICTS = ['doc_merge', 'squash_memo', 'close_no_card'] as const;
export type BatchVerdict = (typeof BATCH_VERDICTS)[number];

export interface DraftVerdictRow {
  readonly date: string;
  readonly pr: number;
  readonly verdict: BatchVerdict;
  readonly cardId: string | null;
  readonly why: string;
}

/** Строка без вердикта роняет проверку С ИМЕНЕМ PR (DoD #1445). */
export function validateDraftVerdicts(rows: readonly unknown[]): string[] {
  const problems: string[] = [];
  rows.forEach((row, i) => {
    const r = row as Record<string, unknown> | null;
    const label = `PR #${r && typeof r.pr === 'number' ? r.pr : `(строка ${i + 1} без номера)`}`;
    if (!r || typeof r !== 'object') {
      problems.push(`${label}: строка вердикта — не объект`);
      return;
    }
    if (!BATCH_VERDICTS.includes(r.verdict as BatchVerdict)) {
      problems.push(
        `${label}: вердикт «${String(r.verdict)}» ∉ {${BATCH_VERDICTS.join(' | ')}} — «оставим открытым» в перечне нет`,
      );
    }
    if (typeof r.why !== 'string' || r.why.trim() === '') {
      problems.push(`${label}: why пуст — вердикт без причины не вердикт`);
    }
    if (r.verdict === 'doc_merge' || r.verdict === 'squash_memo') {
      // Карточка обязана существовать только там, где вердикт её обещает.
      if (typeof r.cardId !== 'string' || r.cardId.trim() === '') {
        problems.push(`${label}: вердикт ${String(r.verdict)} без cardId`);
      }
    }
  });
  return problems;
}

/**
 * Метрика v0 (Дынин): insight_yield = cards / night_triages за окно.
 * База зафиксирована комнатой: insight_yield(25–28.07) = 0.
 */
export function insightYield(cards: number, nightTriages: number): { value: number; text: string } {
  if (!Number.isInteger(cards) || cards < 0 || !Number.isInteger(nightTriages) || nightTriages < 0) {
    throw new Error('insightYield: cards и nightTriages — целые ≥ 0');
  }
  const value = nightTriages === 0 ? 0 : cards / nightTriages;
  return { value, text: `insight_yield = ${cards}/${nightTriages} = ${value.toFixed(2)}` };
}
