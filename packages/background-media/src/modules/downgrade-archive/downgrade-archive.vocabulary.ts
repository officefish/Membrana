/**
 * Словарь архива понижения — ЕДИНСТВЕННОЕ место чеканки литералов режимов и причин отказа
 * (#2587 b3a; ADR-0031, «отказы закрытым списком»). Образец — `samples/buffer-overflow-refusal.ts`:
 * литералы пишет один файл, потребители (сервис b3a, DTO и контроллер b3b) импортируют.
 *
 * Второй копии строк в модуле быть не должно: переименование здесь красит `tsc` у всех потребителей
 * разом, а не расползается по трём файлам.
 */
import type { ArchiveRefusalReason } from './downgrade-archive.store';

/** Режимы отбора — те же три, что у витрины chart-list; четвёртого нет (вердикт команды 3/3). */
export const DOWNGRADE_CRITERIA = ['loudness-over-floor', 'spectral-variety', 'drone-likeness'] as const;
export type DowngradeCriterion = (typeof DOWNGRADE_CRITERIA)[number];

/** Причины отказа дверей (b3) поверх причин хранилища (b2). Закрытый список: новая причина — правка здесь. */
export const DOOR_REFUSAL_REASONS = [
  'unknown_criterion',
  'invalid_limit',
  'preview_required',
  'plan_stale',
  'insufficient_quota',
] as const;
export type DoorRefusalReason = (typeof DOOR_REFUSAL_REASONS)[number];

/** Все причины отказа архива понижения — один список для Swagger-enum и зуба полноты. */
export const DOWNGRADE_ARCHIVE_REFUSAL_REASONS = [
  ...DOOR_REFUSAL_REASONS,
  'invalid_retention',
  'duplicate_plan',
  'partial_freeze',
  'concurrent_change',
  'quota_invariant_violated',
  'batch_not_found',
  'batch_not_frozen',
  'archive_expired',
  'purge_not_implemented',
] as const satisfies readonly (ArchiveRefusalReason | DoorRefusalReason)[];
export type DowngradeArchiveRefusalReason = (typeof DOWNGRADE_ARCHIVE_REFUSAL_REASONS)[number];
