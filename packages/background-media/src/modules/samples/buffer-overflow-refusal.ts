/**
 * Mapper «квота → отказ» — единственное место сервера записей, где ЧЕКАНЯТСЯ литералы словаря
 * отказа (вердикт M2, #2307: «пишет литералы при отказе — сервер; потребители — импорт»).
 *
 * Почему литералы здесь, а не импорт рантайм-объекта: `@membrana/plugin-contracts` — ESM-only,
 * media — CommonJS; рантайм-значения оттуда достаются лишь динамическим `import()`, а типы —
 * статически (`with { 'resolution-mode': 'import' }`, как в `first-wave.registrar.ts`). Каждый
 * литерал ниже проверен `satisfies` против union словаря: переименование в словаре красит `tsc`
 * этого пакета. Второй копии строк в media нет — это сторожит `buffer-overflow-dictionary.test.ts`
 * (сканирует исходники пакетов и приложений). Поле политики B (`devices/buffer-policy.ts`) берёт
 * значения отсюда, а не пишет своих — адаптер B-1 контракта интеграции `cowork-buffer-full-stop`.
 */
import type {
  BUFFER_OVERFLOW_REASONS,
  BufferOverflowReason,
  BufferOverflowRefusal,
  OVERFLOW_POLICIES,
  OverflowPolicy,
  QuotaAxis,
  QuotaSubject,
} from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };

export type {
  BufferOverflowReason,
  BufferOverflowRefusal,
  OverflowPolicy,
  QuotaAxis,
  QuotaSubject,
};

/**
 * Литералы режимов и причин как ТИПЫ — для дискриминированных union'ов в CJS-коде media (B-1):
 * ключи const-объектов словаря доступны через `typeof` даже из type-only импорта, строк здесь
 * не появляется.
 */
export type StopPolicy = (typeof OVERFLOW_POLICIES)['STOP'];
export type SmartCleanupPolicy = (typeof OVERFLOW_POLICIES)['SMART_CLEANUP'];
export type DeviceBufferFullReason = (typeof BUFFER_OVERFLOW_REASONS)['DEVICE_BUFFER_FULL'];

/**
 * Чеканка: ось квоты → причина. Единственная связь «субъект ↔ литерал» на сервере.
 * `satisfies` — типовая сверка со словарём, не объявление нового типа.
 */
const REASON_BY_SUBJECT = {
  buffer: 'device_buffer_full',
  userStorage: 'user_storage_full',
} as const satisfies Record<QuotaSubject, BufferOverflowReason>;

/** Все литералы, которые сервер умеет чеканить — для swagger-enum и зуба полноты. */
export const BUFFER_OVERFLOW_REASON_VALUES: readonly BufferOverflowReason[] = Object.values(
  REASON_BY_SUBJECT,
);

/**
 * Значения политики для swagger-enum. Те же строки, что `OVERFLOW_POLICIES` словаря — сверены
 * `satisfies`; причина дубля та же (ESM-словарь, CJS-сервер), и зуб словаря считает этот файл
 * единственным допустимым местом литерала `smart_cleanup` в media.
 */
export const OVERFLOW_POLICY_VALUES = ['stop', 'smart_cleanup'] as const satisfies readonly OverflowPolicy[];

export function refusalReasonFor(subject: QuotaSubject): BufferOverflowReason {
  return REASON_BY_SUBJECT[subject];
}

/** Форма коллекции, по которой выбирается ось квоты — ровно то, что читает `getQuota`. */
export interface QuotaCollectionShape {
  readonly kind: 'buffer' | 'user' | 'system';
  readonly systemKey: string | null;
}

/**
 * Ось квоты для коллекции. То же правило, что в `DevicesService.getQuota` (зона блока B —
 * не правится в изоляции): буфер — ось `buffer`; пользовательские и системные (кроме тарифного
 * датасета) — ось `userStorage`; тарифный датасет — вне квоты (`null`). Долг сведения правила
 * в одно место назван в EXPECTATIONS блока A.
 */
export function resolveQuotaSubject(
  collection: QuotaCollectionShape,
  tariffDatasetSystemKey: string,
): QuotaSubject | null {
  if (collection.kind === 'buffer') return 'buffer';
  if (collection.kind === 'user') return 'userStorage';
  if (collection.kind === 'system' && collection.systemKey !== tariffDatasetSystemKey) {
    return 'userStorage';
  }
  return null;
}

export interface QuotaAxes {
  readonly buffer: QuotaAxis;
  readonly userStorage: QuotaAxis;
}

export interface OverflowEpisodeView {
  readonly overflowId: string;
  readonly overflowAt: Date;
}

/** Ось не вмещает пробу — предикат отказа; `used ≤ limit` на сервере держится всегда. */
export function axisRefuses(axis: QuotaAxis, incomingBytes: number): boolean {
  return axis.usedBytes + incomingBytes > axis.limitBytes;
}

export function buildBufferOverflowRefusal(input: {
  readonly subject: QuotaSubject;
  readonly quota: QuotaAxes;
  readonly overflowPolicy: OverflowPolicy;
  readonly episode: OverflowEpisodeView;
}): BufferOverflowRefusal {
  return {
    ok: false,
    reason: refusalReasonFor(input.subject),
    buffer: { usedBytes: input.quota.buffer.usedBytes, limitBytes: input.quota.buffer.limitBytes },
    userStorage: {
      usedBytes: input.quota.userStorage.usedBytes,
      limitBytes: input.quota.userStorage.limitBytes,
    },
    overflowPolicy: input.overflowPolicy,
    overflowId: input.episode.overflowId,
    overflowAt: input.episode.overflowAt.toISOString(),
  };
}
