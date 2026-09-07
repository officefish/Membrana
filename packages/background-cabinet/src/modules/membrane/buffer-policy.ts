/**
 * ПОЛИТИКА ПЕРЕПОЛНЕНИЯ БУФЕРА — origin в кабинете (#2308, вердикт M1 заседания
 * `buffer-full-stop`, блок B коворка `overflow-policy`).
 *
 * Кабинет — место команды оператора; сервер записей — carrier рантайма; клиент — зеркало.
 * Здесь: словарь режимов, каркас параметров умной очистки, гейт `paramsComplete(S)` (кабинет
 * проверяет при ЗАПИСИ; сервер записей — ещё раз при разноске) и семантика галочки-привязки.
 *
 * Словарь режимов и три причины гейта — FOLLOWER того же словаря на сервере записей
 * (`background-media/src/modules/devices/buffer-policy.ts`): общего пакета у двух серверов
 * сегодня нет, копии сторожат зубы полноты на каждом носителе (названо в CONCEPT блока).
 *
 * Легаси `auto-cleanup` в словарь не входит; откат к старой автоочистке невозможен на уровне типа.
 * Имена: `bufferPolicy` (настройка, этот блок) ≠ `overflowPolicy` (поле ответа отказа, блок A).
 */

export const BUFFER_POLICY_MODES = ['stop', 'smart_cleanup'] as const;
export type BufferPolicyMode = (typeof BUFFER_POLICY_MODES)[number];

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
  | { readonly mode: 'stop'; readonly params: null }
  | { readonly mode: 'smart_cleanup'; readonly params: SmartCleanupParams };

/**
 * Закрытый список причин отказа записи (конвенция 12.08: `200 { ok:false, reason }`).
 * Первые три — общие с сервером записей; остальные — только у origin.
 */
export const BUFFER_POLICY_DENY_REASONS = [
  'unknown_mode',
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
  | { readonly ok: false; readonly reason: 'unknown_mode' | 'params_incomplete' | 'params_invalid' };

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
export function parseBufferPolicy(raw: unknown): BufferPolicyParseResult {
  if (!isRecord(raw)) return { ok: false, reason: 'unknown_mode' };
  if (!isMode(raw.mode)) return { ok: false, reason: 'unknown_mode' };
  if (raw.mode === 'stop') return { ok: true, policy: DEFAULT_BUFFER_POLICY };
  const params = parseSmartCleanupParams(raw.params);
  if (!params.ok) return { ok: false, reason: params.reason };
  return { ok: true, policy: { mode: 'smart_cleanup', params: params.params } };
}

/** Строка (мембраны или прибора) так, как её отдаёт Prisma; читатель обязан пережить ⊥. */
export interface BufferPolicyRow {
  readonly bufferPolicy?: unknown;
  readonly bufferPolicyParams?: unknown;
}

/** `effective(⊥) = stop`, `effective(порча) = stop`, `effective(smart без полного S) = stop`. */
export function effectiveBufferPolicy(row: BufferPolicyRow | null | undefined): BufferPolicy {
  if (!row) return DEFAULT_BUFFER_POLICY;
  const parsed = parseBufferPolicy({ mode: row.bufferPolicy, params: row.bufferPolicyParams });
  return parsed.ok ? parsed.policy : DEFAULT_BUFFER_POLICY;
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
export function effectiveDevicePolicy(input: {
  readonly binding: boolean;
  readonly membrane: BufferPolicyRow | null | undefined;
  readonly device: BufferPolicyRow | null | undefined;
}): BufferPolicy {
  return input.binding ? effectiveBufferPolicy(input.membrane) : effectiveBufferPolicy(input.device);
}

/**
 * Строка `MembraneBufferPolicy` так, как её отдаёт Prisma. Отдельная таблица (см. schema):
 * отсутствие строки — законное состояние, читается как `stop` со снятой привязкой.
 */
export interface MembranePolicySetting {
  readonly mode?: unknown;
  readonly params?: unknown;
  readonly binding?: boolean;
}

/** Привести строку настройки мембраны к форме `BufferPolicyRow` + привязка — одно место перевода имён. */
export function membranePolicyScope(setting: MembranePolicySetting | null | undefined): {
  readonly bufferPolicy: unknown;
  readonly bufferPolicyParams: unknown;
  readonly bufferPolicyBinding: boolean;
} {
  return {
    bufferPolicy: setting?.mode,
    bufferPolicyParams: setting?.params,
    bufferPolicyBinding: setting?.binding === true,
  };
}
