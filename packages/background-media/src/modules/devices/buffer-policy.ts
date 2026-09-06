/**
 * ПОЛИТИКА ПЕРЕПОЛНЕНИЯ БУФЕРА — носитель на сервере записей (#2308, вердикт M1 заседания
 * `buffer-full-stop`, блок B коворка `overflow-policy`).
 *
 * Здесь живёт ТРЕТЬЯ скоба fail-closed (после backfill миграции и DEFAULT/NOT NULL колонки):
 * `effectiveBufferPolicy()` на пути чтения. Одной миграции мало — порченая строка, чужое
 * значение, `smart_cleanup` с дырявым набором параметров: всё это обязано читаться как `stop`,
 * а не падать и не выдавать прибору «умную очистку», которую никто не настраивал.
 *
 * Слово владельца 06.09: умолчание — стоп; умная очистка — только после настройки её
 * параметров. Гейт `paramsComplete(S)` проверяет сервер (здесь — при разноске из кабинета;
 * кабинет проверяет то же при записи). Алгоритм очистки (T12) здесь НЕ живёт: три слота S —
 * имена-закладки, по ним ничего не отбирается и не удаляется.
 *
 * Легаси `auto-cleanup` клиента в словарь не входит и не входит в тип: откат к старой
 * автоочистке невозможен на уровне типа, а не договорённости.
 *
 * Имена: `bufferPolicy` — ЭТО поле (настройка). `overflowPolicy` — поле ответа отказа блока A
 * (снимок настройки в эпизоде). Не сливать.
 */

export const BUFFER_POLICY_MODES = ['stop', 'smart_cleanup'] as const;
export type BufferPolicyMode = (typeof BUFFER_POLICY_MODES)[number];

/** Критерий отбора жертв — слот под T12. Закрытый список; T12 расширяет, гейт не ломается. */
export const SMART_CLEANUP_SELECTIONS = ['oldest_first', 'largest_first'] as const;
export type SmartCleanupSelection = (typeof SMART_CLEANUP_SELECTIONS)[number];

/** Каркас S (M1): порог срабатывания, критерий отбора, защита вещдоков. Все три обязательны. */
export interface SmartCleanupParams {
  /** Процент занятости буфера, при котором очистка вправе сработать: целое 1..100. */
  readonly thresholdPercent: number;
  readonly selection: SmartCleanupSelection;
  /** Не трогать размеченное. Указывается ЯВНО — отсутствие флага не равно `false`. */
  readonly protectLabeled: boolean;
}

export type BufferPolicy =
  | { readonly mode: 'stop'; readonly params: null }
  | { readonly mode: 'smart_cleanup'; readonly params: SmartCleanupParams };

/**
 * Закрытый список причин отказа записи политики. Конвенция 12.08: доменный отказ —
 * `200 { ok:false, reason }`, HTTP-коды остаются транспорту.
 */
export const BUFFER_POLICY_DENY_REASONS = [
  /** Режим вне словаря — в том числе легаси `auto-cleanup`. */
  'unknown_mode',
  /** `smart_cleanup`, но хотя бы одного слота S нет. */
  'params_incomplete',
  /** Слот есть, но значение вне домена. */
  'params_invalid',
] as const;
export type BufferPolicyDenyReason = (typeof BUFFER_POLICY_DENY_REASONS)[number];

export type BufferPolicyParseResult =
  | { readonly ok: true; readonly policy: BufferPolicy }
  | { readonly ok: false; readonly reason: BufferPolicyDenyReason };

/** Умолчание всей системы. Единственное место, где оно названо кодом на media. */
export const DEFAULT_BUFFER_POLICY: BufferPolicy = Object.freeze({ mode: 'stop', params: null });

const PARAM_KEYS = ['thresholdPercent', 'selection', 'protectLabeled'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMode(value: unknown): value is BufferPolicyMode {
  return typeof value === 'string' && (BUFFER_POLICY_MODES as readonly string[]).includes(value);
}

/**
 * Разбор параметров умной очистки: `incomplete` — слота нет; `invalid` — слот есть, но
 * значение чужое. Различаются намеренно: оператору «не заполнено» и «заполнено неверно» —
 * два разных действия.
 */
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

/**
 * Гейт записи: что кабинет прислал в разноске. Неизвестный режим и неполный S отвергаются —
 * режим НЕ записывается. Это вход ЗАПИСИ; на чтении работает `effectiveBufferPolicy`.
 */
export function parseBufferPolicy(raw: unknown): BufferPolicyParseResult {
  if (!isRecord(raw)) return { ok: false, reason: 'unknown_mode' };
  if (!isMode(raw.mode)) return { ok: false, reason: 'unknown_mode' };
  if (raw.mode === 'stop') return { ok: true, policy: DEFAULT_BUFFER_POLICY };
  const params = parseSmartCleanupParams(raw.params);
  if (!params.ok) return { ok: false, reason: params.reason };
  return { ok: true, policy: { mode: 'smart_cleanup', params: params.params } };
}

/** Строка прибора так, как её отдаёт Prisma; поля необязательны — читатель обязан пережить ⊥. */
export interface BufferPolicyRow {
  readonly bufferPolicy?: unknown;
  readonly bufferPolicyParams?: unknown;
}

/**
 * ЭФФЕКТИВНАЯ политика — что прибор обязан исполнять. `effective(⊥) = stop`,
 * `effective(порча) = stop`, `effective(smart_cleanup без полного S) = stop`.
 *
 * Чистая функция без Prisma и без сети — блок A зовёт её со строкой, которую уже держит для
 * квоты, и кладёт `mode` в `overflowPolicy` ответа отказа.
 */
export function effectiveBufferPolicy(row: BufferPolicyRow | null | undefined): BufferPolicy {
  if (!row) return DEFAULT_BUFFER_POLICY;
  const parsed = parseBufferPolicy({ mode: row.bufferPolicy, params: row.bufferPolicyParams });
  return parsed.ok ? parsed.policy : DEFAULT_BUFFER_POLICY;
}
