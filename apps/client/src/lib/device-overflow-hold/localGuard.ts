import { stopDecision } from '@membrana/media-library-service';
import { BUFFER_OVERFLOW_REASONS } from '@membrana/plugin-contracts';

import type { DeviceOverflowHold, HoldActivation, OverflowHoldAxis, OverflowHoldPolicy } from './types';

/**
 * Причина для локального стража: страж читает квоту БУФЕРА прибора, значит субъект —
 * буфер прибора. Значение — из словаря A (`@membrana/plugin-contracts`), не строка (A-3).
 */
export const LOCAL_GUARD_REASON = BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL;

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
  return hold.activateFromLocalGuard({ reason: LOCAL_GUARD_REASON, buffer: fill, policy });
}
