/**
 * Чтение тарифной сетки — чистый резолв и проекция для клиента
 * (S2 плана интеграции; заседание `tariff-grid`, ратифицировано владельцем 29.07).
 *
 * **Три исхода без третьего статуса** (вердикт M3). Состояний ровно три, но enum
 * их только два: «право есть, условие не выполнено» = `entitled` **и** непустой
 * список невыполненных условий. Третий статус в проводе не вводится — иначе
 * каждый потребитель обязан знать про него, и половина забудет.
 *
 * **Deny-by-default дважды:** нет ячейки, неизвестный id, чужой род → права нет;
 * и отдельно — нет факта об условии → условие считается НЕвыполненным. Пока
 * контур сети не подключён, честный ответ «условие не подключено»
 * (`stub_unwired`), а не молчаливое «выполнено».
 *
 * **Payload переживает невыполненное условие:** право куплено, значение реально —
 * витрине есть что показать («вот что откроется, когда сеть будет построена»).
 *
 * Модуль ЧИСТЫЙ: без fs, сети и Nest. Клиент получает `TariffWireView` проводом
 * и читает тем же кодом — но автор сетки один, серверный (вердикт M2).
 */

import {
  findRow,
  valueMatchesKind,
  type EntitlementDefinition,
  type EntitlementId,
  type EntitlementValue,
  type TariffGridDocument,
  type TariffSku,
} from './tariff-grid';

/** Почему права нет — причина называется, а не проглатывается. */
export type NotEntitledReason =
  | 'no_tariff'
  | 'unknown_entitlement_id'
  | 'no_cell'
  | 'kind_mismatch'
  | 'disabled';

/** Невыполненное условие: что не выполнено и откуда это известно. */
export interface UnmetPrecondition {
  readonly preconditionId: string;
  /** `stub_unwired` — контур, считающий факт, ещё не подключён (вердикт M3). */
  readonly code: 'unsatisfied' | 'stub_unwired';
}

/** Решение о праве: два статуса, три состояния. */
export interface EntitlementDecision {
  readonly status: 'entitled' | 'not_entitled';
  readonly entitlementId: EntitlementId;
  /** Значение ячейки. Живёт и при невыполненном условии — витрине есть что показать. */
  readonly value?: EntitlementValue;
  /** Пусто при `not_entitled` ВСЕГДА: нет права — нечему ждать условия. */
  readonly unmetPreconditions: readonly UnmetPrecondition[];
  readonly reason?: NotEntitledReason;
}

/**
 * Факты об условиях: `id → выполнено ли`. Ключа нет → условие НЕ выполнено
 * (deny-by-default). Контур, считающий факты, подключается отдельно — сетка
 * их не вычисляет и не хранит.
 */
export interface PreconditionContext {
  readonly facts: Readonly<Record<string, boolean>>;
  /** Контур фактов ещё не подключён: причина будет `stub_unwired`, не «нет». */
  readonly unwired?: boolean;
}

/** Условие построенной сети: валидация ∧ калибровка внутри своего контура. */
export const MINIMAL_NETWORK_READY = 'minimal_network_ready';

const denied = (entitlementId: EntitlementId, reason: NotEntitledReason): EntitlementDecision => ({
  status: 'not_entitled',
  entitlementId,
  unmetPreconditions: [],
  reason,
});

/**
 * Решение по одному праву. Чистая функция: ни fs, ни сети, ни часов.
 *
 * @param grid документ сетки (у клиента — его проекция)
 * @param sku тариф мембраны
 * @param entitlementId право из реестра
 * @param ctx факты об условиях; отсутствует → все условия невыполнены
 */
export function resolveEntitlement(
  grid: TariffGridDocument,
  sku: TariffSku,
  entitlementId: EntitlementId,
  ctx?: PreconditionContext,
): EntitlementDecision {
  const definition: EntitlementDefinition | undefined = grid?.registry?.find((d) => d.id === entitlementId);
  if (!definition) return denied(entitlementId, 'unknown_entitlement_id');

  const row = findRow(grid, sku);
  if (!row) return denied(entitlementId, 'no_tariff');

  const value = row.cells?.[entitlementId];
  if (value === undefined) return denied(entitlementId, 'no_cell');
  if (!valueMatchesKind(value, definition.kind)) return denied(entitlementId, 'kind_mismatch');

  // Флаговые роды: выключено — права нет, обсуждать условие незачем.
  if (
    (value.kind === 'instrument' || value.kind === 'gated' || value.kind === 'produce') &&
    value.enabled !== true
  ) {
    return denied(entitlementId, 'disabled');
  }

  // Право есть. Осталось спросить про условие — но только у рода, который его несёт.
  const unmet: UnmetPrecondition[] = [];
  if (value.kind === 'gated') {
    const satisfied = ctx?.facts?.[value.preconditionId] === true;
    if (!satisfied) {
      unmet.push({
        preconditionId: value.preconditionId,
        code: ctx?.unwired === true || ctx === undefined ? 'stub_unwired' : 'unsatisfied',
      });
    }
  }

  return { status: 'entitled', entitlementId, value, unmetPreconditions: unmet };
}

/** Право есть и применимо прямо сейчас — единственное состояние, дающее делать. */
export function isFullyGranted(d: EntitlementDecision): boolean {
  return d.status === 'entitled' && d.unmetPreconditions.length === 0;
}

/** Право есть, но условие не выполнено — витрина притемняет и объясняет. */
export function isEntitledUnmet(d: EntitlementDecision): boolean {
  return d.status === 'entitled' && d.unmetPreconditions.length > 0;
}

/** Права нет — витрина зовёт на старший тариф, а не притворяется пустотой. */
export function isNotEntitled(d: EntitlementDecision): boolean {
  return d.status === 'not_entitled';
}

/** Числовой потолок права; `undefined` — не потолок или права нет. */
export function quotaLimit(d: EntitlementDecision): number | undefined {
  return d.status === 'entitled' && d.value?.kind === 'quota' ? d.value.limit : undefined;
}

/** Строка проекции для клиента: одно право с решением по его тарифу. */
export interface TariffWireEntitlement {
  readonly id: EntitlementId;
  readonly titleKey: string;
  readonly kind: EntitlementDefinition['kind'];
  readonly status: EntitlementDecision['status'];
  readonly value?: EntitlementValue;
  readonly unmetPreconditions: readonly UnmetPrecondition[];
  readonly reason?: NotEntitledReason;
}

/**
 * Проекция сетки для одного тарифа — то, что уезжает клиенту.
 * Клиент читает её тем же резолвом, но автором не становится (вердикт M2).
 */
export interface TariffWireView {
  readonly sku: TariffSku;
  readonly productName: string;
  readonly rank: number;
  /** Версия формы: клиент, не понимающий версию, обязан отказать, а не гадать. */
  readonly gridVersion: number;
  readonly entitlements: readonly TariffWireEntitlement[];
}

/**
 * Собрать проекцию для тарифа. Права перечисляются ВСЕ из реестра, включая
 * недоступные: витрина обязана показать, что откроется на старшем тарифе —
 * прятать нечего (решение владельца об эшелонированной границе).
 */
export function buildTariffWireView(
  grid: TariffGridDocument,
  sku: TariffSku,
  ctx?: PreconditionContext,
): TariffWireView | undefined {
  const row = findRow(grid, sku);
  if (!row) return undefined;

  return {
    sku: row.sku,
    productName: row.productName,
    rank: row.rank,
    gridVersion: grid.version,
    entitlements: grid.registry.map((def) => {
      const d = resolveEntitlement(grid, sku, def.id, ctx);
      return {
        id: def.id,
        titleKey: def.titleKey,
        kind: def.kind,
        status: d.status,
        value: d.value,
        unmetPreconditions: d.unmetPreconditions,
        reason: d.reason,
      };
    }),
  };
}
