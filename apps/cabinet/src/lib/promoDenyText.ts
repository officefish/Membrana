/**
 * Словарь человеческих текстов причин отказа погашения промокода — FOLLOWER
 * закрытого списка сервера (блок b2 спринта `tariff-promo-server-wiring`, #1761).
 *
 * Дом истины — сервер; словарь обязан покрывать известный список 1:1 (зуб полноты
 * в `promoDenyText.test.ts`) и НЕ имеет права молчать о неизвестном: рассинхрон с
 * сервером показывается fallback-веткой «неизвестная причина: <код>», а не глотается
 * (поправка формы из прогона Веснина 12.08 — «рассинхрон показывается, не молчит»).
 *
 * Все отказы визуально одинаковы (alert-error) — различие в ТЕКСТЕ, не в цвете
 * (разбор Родченко 12.08).
 */
import { PROMO_DENY_REASONS, type PromoDenyReason } from '@/api/tariff';

const DENY_TEXT: Record<PromoDenyReason, string> = {
  unknown_target_tariff: 'Код ссылается на тариф, которого больше нет в сетке — сообщите нам об этом коде',
  same_tariff: 'Этот тариф у вас уже подключён — код менять нечего',
  promo_downgrade_forbidden: 'Код ведёт на тариф ниже текущего — по коду тариф не понижается',
  promo_already_redeemed: 'Этот код уже был использован',
  promo_revoked: 'Код отозван выпустившей стороной',
  promo_expired: 'Срок действия кода истёк',
  promo_target_mismatch: 'Код не подходит к вашему тарифу',
  promo_not_single_use: 'Код выпущен с ошибкой — сообщите нам об этом коде',
  promo_unknown: 'Такого кода не существует — проверьте написание',
  membrane_unknown: 'Ваша мембрана не найдена — перезайдите в кабинет',
  grid_unavailable: 'Сетка тарифов сейчас недоступна — попробуйте позже',
  tariff_moved_concurrently: 'Ваш тариф только что изменился с другого устройства — обновите страницу и повторите',
};

/** Человеческий текст причины; неизвестная причина не молчит, а называется кодом. */
export function promoDenyText(reason: string): string {
  if ((PROMO_DENY_REASONS as readonly string[]).includes(reason)) {
    return DENY_TEXT[reason as PromoDenyReason];
  }
  return `Неизвестная причина отказа: ${reason}`;
}
