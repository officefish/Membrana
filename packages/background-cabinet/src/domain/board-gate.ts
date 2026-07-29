/**
 * Жёсткие гейты борда — загрузка, клонирование, запуск сценария
 * (S6 плана интеграции; заседание `tariff-grid`, ратифицировано владельцем 29.07).
 *
 * Решение владельца об эшелонированной границе (мостик 29.07): клиент ставится
 * инсталлятором, плагины физически лежат у пользователя — **прятать нечего**.
 * Витрина притемняет и объясняет (мягко), а вот борд и сервер отказывают
 * **наглухо**: сценарий со старшими узлами **не загружается И НЕ КЛОНИРУЕТСЯ**.
 *
 * Клонирование — отдельная дверь, а не частный случай загрузки. Аудитор поймал
 * её потерю по дороге из разговора в повестку: осталась только загрузка, и это
 * была бы готовая дыра обхода — скопировал чужой сценарий и работай.
 *
 * **Показ ≠ разрешение.** Каталог вправе показывать сценарий, который не
 * загрузится: пользователь должен видеть, что купить. Отказ живёт на входе в
 * борд, а не в витрине.
 *
 * Модуль ЧИСТЫЙ: без fs, сети и Nest.
 */

import type { EntitlementId, TariffGridDocument, TariffSku } from './tariff-grid';
import { isEntitledUnmet, isFullyGranted, resolveEntitlement, type PreconditionContext } from './tariff-resolve';

/** Что делают со сценарием на входе в борд. Все три — жёсткие двери. */
export type BoardAction = 'load' | 'clone' | 'start';

/** Заявка: какое действие и какие права требует сценарий. */
export interface BoardRequest {
  readonly action: BoardAction;
  /** Права, без которых сценарий не работает: узлы, инструменты, возможности. */
  readonly requiredEntitlements: readonly EntitlementId[];
}

/** Почему отказано — с точностью до права, а не «нельзя». */
export interface BoardDenyDetail {
  readonly entitlementId: EntitlementId;
  readonly kind: 'not_entitled' | 'precondition_unmet';
}

/** Решение борда. Отказ всегда назван зубом и перечнем виновных прав. */
export interface BoardDecision {
  readonly allowed: boolean;
  readonly action: BoardAction;
  readonly denied: readonly BoardDenyDetail[];
  readonly toothId?: 'senior_node_on_load_clone';
}

/**
 * Решение о допуске сценария в борд.
 *
 * Fail-closed: отказ, если хоть одно требуемое право недоступно ИЛИ доступно,
 * но с невыполненным условием. Второе — не придирка: сценарий с пеленгом при
 * непостроенной сети запустится и будет выдавать невалидную детекцию, а это
 * хуже честного отказа (слово владельца: без валидации и калибровки детекция
 * не валидна).
 */
export function decideBoardAccess(
  grid: TariffGridDocument,
  sku: TariffSku,
  request: BoardRequest,
  ctx?: PreconditionContext,
): BoardDecision {
  const denied: BoardDenyDetail[] = [];

  for (const entitlementId of request.requiredEntitlements ?? []) {
    const decision = resolveEntitlement(grid, sku, entitlementId, ctx);
    if (isFullyGranted(decision)) continue;
    denied.push({
      entitlementId,
      kind: isEntitledUnmet(decision) ? 'precondition_unmet' : 'not_entitled',
    });
  }

  if (denied.length === 0) {
    return { allowed: true, action: request.action, denied: [] };
  }

  return {
    allowed: false,
    action: request.action,
    denied,
    toothId: 'senior_node_on_load_clone',
  };
}

/**
 * Показывать ли сценарий в каталоге — ДА, даже когда он не загрузится.
 * Отдельная функция, чтобы «не грузится» никогда не превратилось в «спрятать»:
 * прятать нечего, пользователь должен видеть, что даёт старший тариф.
 */
export function isVisibleInCatalog(): boolean {
  return true;
}

/** Человеческая причина отказа для витрины — без внутренних имён в теле. */
export function denyHeadline(decision: BoardDecision): string | undefined {
  if (decision.allowed) return undefined;
  const unmet = decision.denied.some((d) => d.kind === 'precondition_unmet');
  const missing = decision.denied.some((d) => d.kind === 'not_entitled');
  if (missing && unmet) return 'Сценарию нужны возможности старшего тарифа, и часть из них ждёт построенной сети';
  if (missing) return 'Сценарий использует возможности старшего тарифа';
  return 'Возможности доступны, но сеть ещё не построена';
}
