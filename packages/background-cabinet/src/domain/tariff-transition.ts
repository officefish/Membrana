/**
 * Смена тарифа и промокод — единственная точка записи
 * (S8 плана интеграции; заседание `tariff-grid`, ратифицировано владельцем 29.07).
 *
 * **Меняется ровно одна вещь** — ссылка мембраны на тариф. Снимок прав в мембрану
 * не кладётся: права всегда читаются из сетки по текущей ссылке, иначе у них
 * появился бы второй автор, застывший во времени (вердикт M6).
 *
 * **Право менять подтверждается одним из двух:** команда администратора (в любую
 * сторону) или погашение промокода (только вверх по рангу). Самостоятельного
 * перехода без основания не существует.
 *
 * **Погашение атомарно:** проверка → применение → списание → запись в журнал.
 * Повторное погашение отвечает «уже использован», а не меняет тариф ещё раз.
 * Отказ по несоответствию цели НЕ списывает код — иначе пользователь терял бы
 * подарок из-за нашей же проверки.
 *
 * **Понижение ничего не разрушает:** данные, свои детекции и вшитые в сценарии
 * сущности остаются. Запрещается новое — это уже забота гейтов.
 *
 * Модуль ЧИСТЫЙ: без fs, сети, часов и Nest. Время передаёт вызывающий.
 */

import type { TariffGridDocument, TariffSku } from './tariff-grid';
import { findRow } from './tariff-grid';

/** Чем подтверждено право менять тариф. */
export type TariffChangeProof = 'admin' | 'promo';

/** Состояние промокода. */
export type PromoCodeStatus = 'active' | 'spent' | 'revoked';

/** Слепок промокода — то, что лежит в базе. */
export interface PromoCodeSnapshot {
  readonly id: string;
  readonly code: string;
  readonly targetTariffId: TariffSku;
  readonly status: PromoCodeStatus;
  readonly maxRedemptions: number;
  readonly redeemedCount: number;
  readonly expiresAt?: Date | null;
}

/** Заявка на смену тарифа. */
export interface TransitionRequest {
  readonly membraneId: string;
  readonly currentTariffId: TariffSku;
  readonly targetTariffId: TariffSku;
  readonly proofType: TariffChangeProof;
  readonly proofRef: string;
  readonly actorId: string;
}

/** Почему отказано — причина называется кодом, пригодным для ответа наружу. */
export type TransitionDenyReason =
  | 'unknown_target_tariff'
  | 'same_tariff'
  | 'promo_downgrade_forbidden'
  | 'promo_already_redeemed'
  | 'promo_revoked'
  | 'promo_expired'
  | 'promo_target_mismatch';

/** Запись в журнал смен — append-only, пишется только при успехе. */
export interface TariffChangeLogEntry {
  readonly membraneId: string;
  readonly fromTariffId: TariffSku;
  readonly toTariffId: TariffSku;
  readonly proofType: TariffChangeProof;
  readonly proofRef: string;
  readonly actorId: string;
}

/** Решение о переходе. При отказе сказано, надо ли списывать промокод. */
export interface TransitionDecision {
  readonly allowed: boolean;
  readonly reason?: TransitionDenyReason;
  /** Что записать в журнал при успехе. */
  readonly logEntry?: TariffChangeLogEntry;
  /**
   * Списывать ли промокод. Ложь при отказе по нашей проверке: подарок не
   * сгорает из-за того, что цель не подошла.
   */
  readonly spendPromo: boolean;
}

const deny = (reason: TransitionDenyReason, spendPromo = false): TransitionDecision => ({
  allowed: false,
  reason,
  spendPromo,
});

/** Ранг тарифа в сетке; `undefined` — тарифа нет. */
export function rankOf(grid: TariffGridDocument, sku: TariffSku): number | undefined {
  return findRow(grid, sku)?.rank;
}

/**
 * Решение о смене тарифа. Чистая функция: ни базы, ни часов — «сейчас»
 * передаёт вызывающий, иначе тест зависел бы от календаря.
 */
export function decideTransition(
  grid: TariffGridDocument,
  request: TransitionRequest,
  promo?: PromoCodeSnapshot,
  now: Date = new Date(0),
): TransitionDecision {
  const targetRank = rankOf(grid, request.targetTariffId);
  if (targetRank === undefined) return deny('unknown_target_tariff');
  if (request.targetTariffId === request.currentTariffId) return deny('same_tariff');

  if (request.proofType === 'promo') {
    if (!promo) return deny('promo_target_mismatch');
    if (promo.status === 'revoked') return deny('promo_revoked');
    if (promo.status === 'spent' || promo.redeemedCount >= promo.maxRedemptions) {
      return deny('promo_already_redeemed');
    }
    if (promo.expiresAt && promo.expiresAt.getTime() <= now.getTime()) return deny('promo_expired');
    if (promo.targetTariffId !== request.targetTariffId) return deny('promo_target_mismatch');

    const currentRank = rankOf(grid, request.currentTariffId) ?? -1;
    // Промокод ведёт только вверх: понижение — дело администратора, не подарка.
    if (targetRank <= currentRank) return deny('promo_downgrade_forbidden');
  }

  return {
    allowed: true,
    spendPromo: request.proofType === 'promo',
    logEntry: {
      membraneId: request.membraneId,
      fromTariffId: request.currentTariffId,
      toTariffId: request.targetTariffId,
      proofType: request.proofType,
      proofRef: request.proofRef,
      actorId: request.actorId,
    },
  };
}

/** Состояние промокода после успешного погашения. */
export function spendPromo(promo: PromoCodeSnapshot): PromoCodeSnapshot {
  const redeemedCount = promo.redeemedCount + 1;
  return {
    ...promo,
    redeemedCount,
    status: redeemedCount >= promo.maxRedemptions ? 'spent' : promo.status,
  };
}

/**
 * Что мембрана несёт после перехода. Возвращается ТОЛЬКО ссылка на тариф —
 * функция существует, чтобы «заодно скопировать права» было негде написать.
 */
export function membranePatch(decision: TransitionDecision): { tariffId: TariffSku } | undefined {
  return decision.allowed && decision.logEntry ? { tariffId: decision.logEntry.toTariffId } : undefined;
}
