import { stopDecision } from '@membrana/media-library-service';

import type { DeviceOverflowHold, HoldActivation, OverflowHoldAxis, OverflowHoldPolicy } from './types';

/**
 * Литерал причины для локального стража: страж читает квоту БУФЕРА прибора, значит субъект —
 * буфер прибора. Стаб-литерал словаря A (см. `stubs/refusal-contract.stub.ts`).
 */
export const LOCAL_GUARD_REASON_STUB = 'device_buffer_full';

/**
 * Локальный страж (M3 (б), вторичный источник): чтение квоты до отправки по тому же порогу,
 * что и вердикт ядра (`stopDecision`, 95%). Судит ТОЛЬКО при эффективной политике `stop`.
 */
export function judgeLocalGuard(fill: OverflowHoldAxis, policy: OverflowHoldPolicy): boolean {
  if (policy !== 'stop') return false;
  return stopDecision(fill, { policy: 'stop' }).action === 'stop';
}

/**
 * Адаптер квоты → носитель. Освобождение места (fill ниже порога) НИЧЕГО не делает:
 * авто-возобновления нет (M3 DoD 7) — выход только `release`.
 */
export function applyLocalGuardFromQuota(
  hold: DeviceOverflowHold,
  fill: OverflowHoldAxis,
  policy: OverflowHoldPolicy,
): HoldActivation {
  if (!judgeLocalGuard(fill, policy)) {
    return 'ignored';
  }
  return hold.activateFromLocalGuard({ reason: LOCAL_GUARD_REASON_STUB, buffer: fill, policy });
}
