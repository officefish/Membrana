/**
 * Читатель эффективной политики переполнения на приборе (#2308, M1).
 *
 * Держит последнее значение сервера и отвечает на один вопрос: «что мне исполнять сейчас».
 *
 * Правила (вердикт M1, таблица (в)): `effective(⊥/corrupt/sync-fail) = stop`.
 *   - до первого успешного чтения — `stop` (`never_received`);
 *   - чтение упало (сеть / исключение источника) — `stop` (`sync_failed`), пока следующее
 *     чтение не пройдёт; последнее валидное НЕ держится: дыра синка есть дыра синка;
 *   - ответ без политики / вне словаря / с дырявым S — `stop` (`malformed`).
 *
 * Читатель НЕ ходит в сеть сам: источник — абстракция `BufferPolicySourceFn`, частоту
 * чтения задаёт вызывающий (M4: квота читается ≥ 1/мин, после стопа тоже). До интеграции
 * источник — стаб в `stubs/`; живой `getQuota()` подставляет блок C / координатор.
 *
 * Локального умолчания автоочистки здесь нет и быть не может: тип результата её не содержит.
 */
import { effectiveBufferPolicy } from './effectiveBufferPolicy';
import { STOP_POLICY, type EffectiveBufferPolicy } from './types';

/** Источник сырого ответа: корень `/quota` или сам объект политики. Бросок = дыра синка. */
export type BufferPolicySourceFn = () => Promise<unknown>;

export interface BufferPolicyReader {
  /** Прочитать источник один раз и обновить текущее значение. Никогда не бросает. */
  refresh(): Promise<EffectiveBufferPolicy>;
  /** Что прибор обязан исполнять прямо сейчас. */
  current(): EffectiveBufferPolicy;
  /** Подписка на смену текущего значения (по факту смены, не на каждый refresh). */
  subscribe(listener: (next: EffectiveBufferPolicy) => void): () => void;
}

const NEVER_RECEIVED: EffectiveBufferPolicy = Object.freeze({ policy: STOP_POLICY, source: 'never_received' });
const SYNC_FAILED: EffectiveBufferPolicy = Object.freeze({ policy: STOP_POLICY, source: 'sync_failed' });

function samePolicy(a: EffectiveBufferPolicy, b: EffectiveBufferPolicy): boolean {
  if (a.source !== b.source || a.policy.mode !== b.policy.mode) return false;
  if (a.policy.params === null || b.policy.params === null) return a.policy.params === b.policy.params;
  return (
    a.policy.params.thresholdPercent === b.policy.params.thresholdPercent &&
    a.policy.params.selection === b.policy.params.selection &&
    a.policy.params.protectLabeled === b.policy.params.protectLabeled
  );
}

export function createBufferPolicyReader(source: BufferPolicySourceFn): BufferPolicyReader {
  let value: EffectiveBufferPolicy = NEVER_RECEIVED;
  const listeners = new Set<(next: EffectiveBufferPolicy) => void>();

  const set = (next: EffectiveBufferPolicy) => {
    if (samePolicy(value, next)) return;
    value = next;
    for (const listener of listeners) listener(value);
  };

  return {
    async refresh() {
      let raw: unknown;
      try {
        raw = await source();
      } catch {
        set(SYNC_FAILED);
        return value;
      }
      set(effectiveBufferPolicy(raw));
      return value;
    },
    current: () => value,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
