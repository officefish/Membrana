/**
 * Гейт производства своего — право создавать, а не право вызывать
 * (S5 плана интеграции; заседание `tariff-grid`, ратифицировано владельцем 29.07).
 *
 * Главная новая возможность старших тарифов: пользователь индексирует свой
 * датасет и строит сценарии на **своих** детекциях. Это переход от потребления
 * чужих детекций к производству собственных — и проверяется он иначе, чем
 * право вызова.
 *
 * **Гейт стоит на создании и на расширяющем изменении.** Не на чтении, не на
 * удалении, не на запуске уже собранного сценария и — главное — **никогда на
 * существовании**: «проверка существования против тарифа» прямо запрещена
 * вердиктом M5.
 *
 * **При потере права созданное остаётся.** Понизился тариф — свои детекции живут,
 * читаются, удаляются владельцем и продолжают работать внутри сценариев, куда
 * уже вшиты. Запрещается ровно новое.
 *
 * Модуль ЧИСТЫЙ: без fs, сети и Nest.
 */

import type { ProduceScope, TariffGridDocument, TariffSku } from './tariff-grid';
import { isEntitledUnmet, isFullyGranted, resolveEntitlement, type PreconditionContext } from './tariff-resolve';

/** Право производить своё в реестре сетки. */
export const PRODUCE_ENTITLEMENT_ID = 'produce.own';

/**
 * Что делает пользователь. Гейт различает НАМЕРЕНИЕ, а не таблицу:
 * создание и расширение поверхности производимого — под правом; всё
 * остальное — вне его.
 */
export type ProduceAction =
  | 'create'
  | 'expanding_mutate'
  | 'read'
  | 'delete'
  | 'execute'
  | 'rename';

/** Действия, которые право производить НЕ сторожит (вердикт M5). */
export const UNGATED_ACTIONS: ReadonlySet<ProduceAction> = new Set<ProduceAction>([
  'read',
  'delete',
  'execute',
  'rename',
]);

/** Заявка на производство: что делаем и какого вида. */
export interface ProduceRequest {
  readonly action: ProduceAction;
  /** Вид производимого; нужен только действиям, которые гейт сторожит. */
  readonly scope?: ProduceScope;
}

/** Почему отказано — причина называется. */
export type ProduceDenyReason =
  | 'not_entitled'
  | 'scope_not_allowed'
  | 'precondition_unmet'
  | 'missing_scope';

/** Решение гейта. При отказе назван зуб — молчаливого отказа не бывает. */
export interface ProduceDecision {
  readonly allowed: boolean;
  readonly gated: boolean;
  readonly reason?: ProduceDenyReason;
  readonly toothId?: 'produce_on_create' | 'existence_check_forbidden';
}

/** Разрешает ли выданный scope этот вид. Пустой scope = все известные виды. */
export function scopeAllows(granted: readonly ProduceScope[] | undefined, wanted: ProduceScope): boolean {
  return granted === undefined || granted.length === 0 || granted.includes(wanted);
}

/**
 * Решение гейта производства.
 *
 * Порядок неслучаен: сперва спрашиваем, сторожит ли гейт вообще это действие —
 * иначе чтение чужого прошлого начало бы зависеть от сегодняшнего тарифа, а это
 * ровно запрещённая «проверка существования».
 */
export function decideProduce(
  grid: TariffGridDocument,
  sku: TariffSku,
  request: ProduceRequest,
  ctx?: PreconditionContext,
): ProduceDecision {
  // Вне гейта: читать, удалять, запускать собранное и переименовывать можно
  // всегда — что создано, то существует независимо от нынешнего тарифа.
  if (UNGATED_ACTIONS.has(request.action)) {
    return { allowed: true, gated: false };
  }

  const decision = resolveEntitlement(grid, sku, PRODUCE_ENTITLEMENT_ID, ctx);

  if (!isFullyGranted(decision) && !isEntitledUnmet(decision)) {
    return { allowed: false, gated: true, reason: 'not_entitled', toothId: 'produce_on_create' };
  }

  if (isEntitledUnmet(decision)) {
    // Право есть, но условие не выполнено: производить нельзя, однако причина
    // ДРУГАЯ — витрина скажет «нужна сеть», а не «купите старший тариф».
    return { allowed: false, gated: true, reason: 'precondition_unmet', toothId: 'produce_on_create' };
  }

  if (!request.scope) {
    return { allowed: false, gated: true, reason: 'missing_scope', toothId: 'produce_on_create' };
  }

  const granted = decision.value?.kind === 'produce' ? decision.value.scope : undefined;
  if (!scopeAllows(granted, request.scope)) {
    return { allowed: false, gated: true, reason: 'scope_not_allowed', toothId: 'produce_on_create' };
  }

  return { allowed: true, gated: true };
}

/**
 * Явный отказ отвечать на вопрос «имеет ли пользователь право НА СУЩЕСТВОВАНИЕ
 * этого объекта». Такой вопрос запрещён вердиктом M5: существование — факт
 * прошлого создания, а не сегодняшнее право. Функция существует, чтобы попытка
 * задать его падала громко, а не притворялась проверкой.
 */
export function assertNoExistenceCheck(callSite: string): never {
  throw new Error(
    `[existence_check_forbidden] ${callSite}: право производить проверяется на создании, ` +
      'а не на существовании — созданное живёт независимо от нынешнего тарифа (вердикт M5)',
  );
}
