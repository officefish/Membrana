/**
 * Чистый разбор ответа сервера в эффективную политику (#2308, M1).
 *
 * `effective(⊥) = stop`, `effective(порча) = stop`, `effective(smart_cleanup без полного S) = stop`.
 * Разбор принимает СЫРОЙ JSON, а не типизированный ответ: поле `bufferPolicy` едет в ответе
 * `/quota` сервера записей, и протаскивать его через тип квоты соседнего пакета значило бы
 * связать блоки до Interface Consilium. Читатель сам достаёт поле из корня ответа `/quota`
 * либо принимает уже вынутый объект политики — обе формы законны.
 */
import { OVERFLOW_POLICIES, SMART_CLEANUP_AVAILABLE } from '@membrana/plugin-contracts';

import {
  BUFFER_POLICY_MODES,
  SMART_CLEANUP_SELECTIONS,
  STOP_POLICY,
  type BufferPolicy,
  type EffectiveBufferPolicy,
  type SmartCleanupParams,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseParams(raw: unknown): SmartCleanupParams | null {
  if (!isRecord(raw)) return null;
  const { thresholdPercent, selection, protectLabeled } = raw;
  if (
    typeof thresholdPercent !== 'number' ||
    !Number.isInteger(thresholdPercent) ||
    thresholdPercent < 1 ||
    thresholdPercent > 100
  ) {
    return null;
  }
  if (typeof selection !== 'string' || !(SMART_CLEANUP_SELECTIONS as readonly string[]).includes(selection)) {
    return null;
  }
  if (typeof protectLabeled !== 'boolean') return null;
  return {
    thresholdPercent,
    selection: selection as SmartCleanupParams['selection'],
    protectLabeled,
  };
}

/**
 * Опция гейта (#2318) — ТОЛЬКО для зубов ветки полноты параметров; боевой код опцию не передаёт
 * (сканирует зуб media `buffer-policy.test.ts`). Умолчание — переключатель словаря.
 */
export interface BufferPolicyGateOptions {
  readonly smartCleanupAvailable?: boolean;
}

function smartCleanupAvailable(options: BufferPolicyGateOptions | undefined): boolean {
  return options?.smartCleanupAvailable ?? SMART_CLEANUP_AVAILABLE;
}

/** Умная очистка в ответе при выключенном переключателе — то, что читатель гасит fail-closed (#2318). */
export function isSmartCleanupGated(raw: unknown, options?: BufferPolicyGateOptions): boolean {
  if (smartCleanupAvailable(options)) return false;
  return isRecord(raw) && raw.mode === OVERFLOW_POLICIES.SMART_CLEANUP;
}

/**
 * Разобрать объект политики `{ mode, params }`. Любая порча → `null` (звонящий решает, как
 * назвать причину). Наружу никогда не выходит ничего, кроме двух режимов словаря; и с #2318 —
 * умная очистка наружу не выходит, пока переключатель словаря выключен (гейт РАНЬШЕ полноты S).
 */
export function parseBufferPolicy(raw: unknown, options?: BufferPolicyGateOptions): BufferPolicy | null {
  if (!isRecord(raw)) return null;
  const mode = raw.mode;
  if (typeof mode !== 'string' || !(BUFFER_POLICY_MODES as readonly string[]).includes(mode)) return null;
  if (mode === 'stop') return STOP_POLICY;
  if (!smartCleanupAvailable(options)) return null;
  const params = parseParams(raw.params);
  // Строка режима не пишется: единственный носитель литералов — словарь `plugin-contracts` (B-1).
  return params ? { mode: OVERFLOW_POLICIES.SMART_CLEANUP, params } : null;
}

/**
 * Достать политику из того, что вернул источник: либо это сам объект политики, либо корень
 * ответа `/quota` с полем `bufferPolicy`. Порядок намеренный — сначала «это политика?», чтобы
 * объект `{ mode: 'stop' }` не искал в себе поле `bufferPolicy`.
 */
function pickPolicyCandidate(raw: unknown): unknown {
  if (!isRecord(raw)) return undefined;
  if ('mode' in raw) return raw;
  if ('bufferPolicy' in raw) return raw.bufferPolicy;
  return undefined;
}

/** Эффективная политика из сырого ответа сервера; порча и пустота названы причиной. */
export function effectiveBufferPolicy(raw: unknown, options?: BufferPolicyGateOptions): EffectiveBufferPolicy {
  const candidate = pickPolicyCandidate(raw);
  const policy = parseBufferPolicy(candidate, options);
  if (policy) return { policy, source: 'server' };
  // #2318 fail-closed: сервер прислал умную очистку, а переключателя нет — это не порча ответа,
  // а гейт; причина названа своим словом, чтобы панель не врала «ответ сломан».
  if (isSmartCleanupGated(candidate, options)) return { policy: STOP_POLICY, source: 'gated' };
  return { policy: STOP_POLICY, source: 'malformed' };
}
