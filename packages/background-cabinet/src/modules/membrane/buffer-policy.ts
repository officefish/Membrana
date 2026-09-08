/**
 * ПОЛИТИКА ПЕРЕПОЛНЕНИЯ БУФЕРА — origin в кабинете (#2308, вердикт M1 заседания
 * `buffer-full-stop`, блок B коворка `overflow-policy`).
 *
 * Кабинет — место команды оператора; сервер записей — carrier рантайма; клиент — зеркало.
 * Здесь: словарь режимов, каркас параметров умной очистки, гейт `paramsComplete(S)` (кабинет
 * проверяет при ЗАПИСИ; сервер записей — ещё раз при разноске) и семантика галочки-привязки.
 *
 * Словарь режимов — ОДИН на монорепо: `OVERFLOW_POLICIES` пакета `@membrana/plugin-contracts`
 * (адаптер B-1 контракта интеграции `cowork-buffer-full-stop`). Кабинетный сервер — CommonJS и
 * рантайм-объект ESM-пакета статически не импортирует (та же граница, что у media, см.
 * `journal-plugin-host.service.ts`), поэтому здесь ЕДИНСТВЕННОЕ в кабинете место, где строки
 * режимов набраны — и каждая проверена `satisfies` против union словаря: переименование в
 * словаре красит `tsc`. Зуб `buffer-overflow-dictionary.test.ts` (media) знает этот файл как
 * назначенного носителя литерала на CJS-сервере; второй файл кабинета со строкой режима — красный.
 * Три причины гейта — другой закрытый список (запись настройки), с A не пересекается.
 *
 * Легаси `auto-cleanup` в словарь не входит; откат к старой автоочистке невозможен на уровне типа.
 * Имена: `bufferPolicy` (настройка, этот блок) ≠ `overflowPolicy` (поле ответа отказа, блок A).
 */
import type {
  OVERFLOW_POLICIES,
  OverflowPolicy,
  SmartCleanupAvailability,
  SmartCleanupUnavailableReason,
} from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };

export const BUFFER_POLICY_MODES = ['stop', 'smart_cleanup'] as const satisfies readonly OverflowPolicy[];
export type BufferPolicyMode = OverflowPolicy;

/**
 * ГЕЙТ ДО T12 (#2318, долг D-1): зеркало переключателя `SMART_CLEANUP_AVAILABLE` словаря
 * `@membrana/plugin-contracts` (`buffer-overflow/smart-cleanup-gate.ts` — источник истины и
 * обоснование). Та же граница, что у строк режимов выше: CJS-сервер рантайм-объект ESM-словаря
 * не импортирует, `satisfies` против литерального типа делает зеркало проверяемым — переворот в
 * словаре красит `tsc` здесь. Руками не переворачивать — только вслед за словарём.
 */
export const SMART_CLEANUP_AVAILABLE = false satisfies SmartCleanupAvailability;
export const SMART_CLEANUP_UNAVAILABLE_REASON = 'smart_cleanup_unavailable' satisfies SmartCleanupUnavailableReason;

/** Опции гейта — ТОЛЬКО для зубов ветки «гейт снят»; боевой код опцию не передаёт (зуб media сканирует). */
export interface BufferPolicyGateOptions {
  readonly smartCleanupAvailable?: boolean;
}

function smartCleanupAvailable(options: BufferPolicyGateOptions | undefined): boolean {
  return options?.smartCleanupAvailable ?? SMART_CLEANUP_AVAILABLE;
}

type StopPolicy = (typeof OVERFLOW_POLICIES)['STOP'];
type SmartCleanupPolicy = (typeof OVERFLOW_POLICIES)['SMART_CLEANUP'];

/** Критерий отбора жертв — слот под T12. Закрытый список; T12 расширяет, гейт не ломается. */
export const SMART_CLEANUP_SELECTIONS = ['oldest_first', 'largest_first'] as const;
export type SmartCleanupSelection = (typeof SMART_CLEANUP_SELECTIONS)[number];

/** Каркас S (M1): порог срабатывания, критерий отбора, защита вещдоков. Все три обязательны. */
export interface SmartCleanupParams {
  readonly thresholdPercent: number;
  readonly selection: SmartCleanupSelection;
  readonly protectLabeled: boolean;
}

export type BufferPolicy =
  | { readonly mode: StopPolicy; readonly params: null }
  | { readonly mode: SmartCleanupPolicy; readonly params: SmartCleanupParams };

/**
 * Закрытый список причин отказа записи (конвенция 12.08: `200 { ok:false, reason }`).
 * Первые три — общие с сервером записей; остальные — только у origin.
 */
export const BUFFER_POLICY_DENY_REASONS = [
  'unknown_mode',
  /** Умная очистка выбрана, а алгоритма T12 нет (#2318). Судится РАНЬШЕ полноты параметров. */
  SMART_CLEANUP_UNAVAILABLE_REASON,
  'params_incomplete',
  'params_invalid',
  /** Правка режима прибора, пока стоит галочка-привязка: была бы молчаливым no-op. */
  'binding_active',
  /** Включение привязки без явного подтверждения — красно и на сервере, не только в форме. */
  'binding_not_confirmed',
  /** У узла нет прибора — политику некуда записать и некому разнести. */
  'node_not_paired',
] as const;
export type BufferPolicyDenyReason = (typeof BUFFER_POLICY_DENY_REASONS)[number];

export type BufferPolicyParseResult =
  | { readonly ok: true; readonly policy: BufferPolicy }
  | {
      readonly ok: false;
      readonly reason: 'unknown_mode' | SmartCleanupUnavailableReason | 'params_incomplete' | 'params_invalid';
    };

export const DEFAULT_BUFFER_POLICY: BufferPolicy = Object.freeze({ mode: 'stop', params: null });

const PARAM_KEYS = ['thresholdPercent', 'selection', 'protectLabeled'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMode(value: unknown): value is BufferPolicyMode {
  return typeof value === 'string' && (BUFFER_POLICY_MODES as readonly string[]).includes(value);
}

export function parseSmartCleanupParams(
  raw: unknown,
): { ok: true; params: SmartCleanupParams } | { ok: false; reason: 'params_incomplete' | 'params_invalid' } {
  if (!isRecord(raw)) return { ok: false, reason: 'params_incomplete' };
  for (const key of PARAM_KEYS) {
    if (raw[key] === undefined || raw[key] === null) return { ok: false, reason: 'params_incomplete' };
  }
  const threshold = raw.thresholdPercent;
  if (typeof threshold !== 'number' || !Number.isInteger(threshold) || threshold < 1 || threshold > 100) {
    return { ok: false, reason: 'params_invalid' };
  }
  const selection = raw.selection;
  if (typeof selection !== 'string' || !(SMART_CLEANUP_SELECTIONS as readonly string[]).includes(selection)) {
    return { ok: false, reason: 'params_invalid' };
  }
  if (typeof raw.protectLabeled !== 'boolean') return { ok: false, reason: 'params_invalid' };
  return {
    ok: true,
    params: {
      thresholdPercent: threshold,
      selection: selection as SmartCleanupSelection,
      protectLabeled: raw.protectLabeled,
    },
  };
}

/** Гейт записи: что прислал оператор. Неизвестный режим и неполный S — режим не записывается. */
export function parseBufferPolicy(raw: unknown, options?: BufferPolicyGateOptions): BufferPolicyParseResult {
  if (!isRecord(raw)) return { ok: false, reason: 'unknown_mode' };
  if (!isMode(raw.mode)) return { ok: false, reason: 'unknown_mode' };
  if (raw.mode === 'stop') return { ok: true, policy: DEFAULT_BUFFER_POLICY };
  // Гейт доступности — РАНЬШЕ полноты параметров (#2318): иначе «не хватает параметров» лжёт
  // о причине — оператор заполнит все три слота и упрётся в ту же стену без объяснения.
  if (!smartCleanupAvailable(options)) return { ok: false, reason: SMART_CLEANUP_UNAVAILABLE_REASON };
  const params = parseSmartCleanupParams(raw.params);
  if (!params.ok) return { ok: false, reason: params.reason };
  // `raw.mode` уже сужен словарём до умной очистки — вторая строка режима здесь не нужна (B-1).
  return { ok: true, policy: { mode: raw.mode, params: params.params } };
}

/** Строка (мембраны или прибора) так, как её отдаёт Prisma; читатель обязан пережить ⊥. */
export interface BufferPolicyRow {
  readonly bufferPolicy?: unknown;
  readonly bufferPolicyParams?: unknown;
}

/** Эффективная политика вместе с причиной подмены (`null` — строка прочитана как есть или её нет). */
export interface ExplainedBufferPolicy {
  readonly policy: BufferPolicy;
  readonly fallback: BufferPolicyDenyReason | null;
}

/**
 * Чтение с объяснением: кому логировать (#2318 — `smart_cleanup` в строке при выключенном гейте
 * → warn с id субъекта), тот зовёт это; сама функция чиста и не логирует.
 */
export function explainBufferPolicy(
  row: BufferPolicyRow | null | undefined,
  options?: BufferPolicyGateOptions,
): ExplainedBufferPolicy {
  if (!row) return { policy: DEFAULT_BUFFER_POLICY, fallback: null };
  const parsed = parseBufferPolicy({ mode: row.bufferPolicy, params: row.bufferPolicyParams }, options);
  return parsed.ok ? { policy: parsed.policy, fallback: null } : { policy: DEFAULT_BUFFER_POLICY, fallback: parsed.reason };
}

/**
 * `effective(⊥) = stop`, `effective(порча) = stop`, `effective(smart без полного S) = stop`,
 * и с #2318 — `effective(smart при выключенном гейте) = stop` (fail-closed).
 */
export function effectiveBufferPolicy(row: BufferPolicyRow | null | undefined, options?: BufferPolicyGateOptions): BufferPolicy {
  return explainBufferPolicy(row, options).policy;
}

/**
 * СЕМАНТИКА ПРИВЯЗКИ (T13/T17). Что прибор обязан исполнять:
 *
 *   binding = true  → политика мембраны (для каждого прибора, включая будущие — у нового
 *                     прибора строки ещё нет, `device` = null, и он всё равно слушает мембрану);
 *   binding = false → собственная политика прибора (нет строки → stop).
 *
 * Per-device строка при стоящей привязке НЕ перезаписывается — поэтому снятие галочки
 * ВОЗВРАЩАЕТ приборам их настройки, а не обнуляет их. Это и отличает привязку от снимка.
 */
export function effectiveDevicePolicy(
  input: {
    readonly binding: boolean;
    readonly membrane: BufferPolicyRow | null | undefined;
    readonly device: BufferPolicyRow | null | undefined;
  },
  options?: BufferPolicyGateOptions,
): BufferPolicy {
  return explainDevicePolicy(input, options).policy;
}

/** То же с причиной подмены и указанием, чья строка подменена (для warn #2318). */
export function explainDevicePolicy(
  input: {
    readonly binding: boolean;
    readonly membrane: BufferPolicyRow | null | undefined;
    readonly device: BufferPolicyRow | null | undefined;
  },
  options?: BufferPolicyGateOptions,
): ExplainedBufferPolicy & { readonly subject: 'membrane' | 'device' } {
  return input.binding
    ? { ...explainBufferPolicy(input.membrane, options), subject: 'membrane' }
    : { ...explainBufferPolicy(input.device, options), subject: 'device' };
}

/**
 * Строка `MembraneBufferPolicy` так, как её отдаёт Prisma. Отдельная таблица (см. schema):
 * отсутствие строки — законное состояние, читается как `stop` со снятой привязкой.
 */
export interface MembranePolicySetting {
  /** Есть у строки Prisma; нужен журналу fail-closed (#2318) — адрес субъекта. */
  readonly membraneId?: string;
  readonly mode?: unknown;
  readonly params?: unknown;
  readonly binding?: boolean;
}

/** Привести строку настройки мембраны к форме `BufferPolicyRow` + привязка — одно место перевода имён. */
export function membranePolicyScope(setting: MembranePolicySetting | null | undefined): {
  readonly membraneId: string | null;
  readonly bufferPolicy: unknown;
  readonly bufferPolicyParams: unknown;
  readonly bufferPolicyBinding: boolean;
} {
  return {
    membraneId: setting?.membraneId ?? null,
    bufferPolicy: setting?.mode,
    bufferPolicyParams: setting?.params,
    bufferPolicyBinding: setting?.binding === true,
  };
}
