/**
 * Локальный барель каталога `buffer-overflow/` — одна точка, которую интеграция коворка
 * `cowork-buffer-full-stop` подключит к барелю пакета (`src/index.ts`, общий файл — в
 * изолированной фазе не трогается). Перечисление поимённо, как в барели пакета.
 */
export {
  BUFFER_OVERFLOW_REASONS,
  isBufferOverflowReason,
  type BufferOverflowReason,
} from './reasons.js';

export {
  OVERFLOW_POLICIES,
  QUOTA_SUBJECTS,
  isBufferOverflowRefusal,
  isOverflowPolicy,
  type BufferOverflowRefusal,
  type OverflowPolicy,
  type QuotaAxis,
  type QuotaSubject,
} from './refusal.js';

export {
  SMART_CLEANUP_AVAILABLE,
  SMART_CLEANUP_UNAVAILABLE_REASON,
  type SmartCleanupAvailability,
  type SmartCleanupUnavailableReason,
} from './smart-cleanup-gate.js';
