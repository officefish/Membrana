/**
 * DTO дверей архива понижения (#2587 блок b3; ADR-0031, раздел «Контракт приказа freeze»).
 *
 * Отказы — ЗАКРЫТЫЙ СЛОВАРЬ, чеканится здесь одним списком (как словарь переполнения в
 * `samples/buffer-overflow-refusal.ts`): дверь отдаёт 200 `{ ok: false, reason, detail }`, а не
 * HTTP-ошибку — «места не хватило» и «срок вышел» суть события домена, не сбои транспорта.
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ArchiveRefusalReason } from './downgrade-archive.store';

/** Режимы отбора — те же три, что у витрины chart-list; четвёртого нет. */
export const DOWNGRADE_CRITERIA = ['loudness-over-floor', 'spectral-variety', 'drone-likeness'] as const;

/** Все причины отказа дверей b3 + хранилища b2 — один список для Swagger и зуба полноты. */
export const DOWNGRADE_ARCHIVE_REFUSAL_REASONS = [
  'unknown_criterion',
  'invalid_limit',
  'preview_required',
  'plan_stale',
  'invalid_retention',
  'duplicate_plan',
  'partial_freeze',
  'concurrent_change',
  'quota_invariant_violated',
  'batch_not_found',
  'batch_not_frozen',
  'archive_expired',
  'insufficient_quota',
  'purge_not_implemented',
] as const satisfies readonly (ArchiveRefusalReason | 'unknown_criterion' | 'invalid_limit' | 'preview_required' | 'plan_stale' | 'insufficient_quota')[];
export type DowngradeArchiveRefusalReason = (typeof DOWNGRADE_ARCHIVE_REFUSAL_REASONS)[number];

export class DowngradePreviewDto {
  @ApiProperty({ enum: DOWNGRADE_CRITERIA, example: 'loudness-over-floor', description: 'Режим отбора живого (настройка пользователя в кабинете)' })
  criterion!: string;

  @ApiProperty({ example: 536870912, description: 'Лимит буфера на НОВОМ тарифе, байт (целое ≥ 0)' })
  bufferLimitBytes!: number;
}

export class DowngradeFreezeDto extends DowngradePreviewDto {
  @ApiProperty({ description: 'Хеш подтверждённого предпросмотра — из ответа preview' })
  planDigest!: string;

  @ApiProperty({ example: 14, description: 'Срок хранения в СУТКАХ — снимок от кабинета (целое ≥ 1)' })
  retentionDays!: number;

  @ApiProperty({ format: 'uuid' })
  membraneId!: string;

  @ApiProperty({ example: 'checkpoint-v1' })
  fromTariffId!: string;

  @ApiProperty({ example: 'free-v1' })
  toTariffId!: string;
}

export class DowngradePlanRowDto {
  @ApiProperty({ format: 'uuid' })
  sampleId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ example: 5242880 })
  bytes!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ description: 'Размечена или помечена «хранить» — остаётся первой' })
  pinned!: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'Позиция в порядке режима, 0 — лучший; null — режим пробу не измерил' })
  modeRank!: number | null;
}

export class DowngradeFailedTailDto {
  @ApiProperty({ type: [String], description: 'Пробы в прежних failed-партиях — их подберёт эта заморозка' })
  sampleIds!: string[];

  @ApiProperty()
  bytes!: number;
}

export class DowngradePreviewResponseDto {
  @ApiProperty({ enum: [true] })
  ok!: true;

  @ApiProperty({ enum: DOWNGRADE_CRITERIA })
  criterion!: string;

  @ApiProperty()
  bufferLimitBytes!: number;

  @ApiProperty({ description: 'Живых байт в буфере СЕЙЧАС, до заморозки' })
  activeBufferBytes!: number;

  @ApiProperty({ type: [DowngradePlanRowDto], description: 'Остаются живыми, в порядке приоритета' })
  keep!: DowngradePlanRowDto[];

  @ApiProperty({ type: [DowngradePlanRowDto], description: 'Уйдут в архив' })
  freeze!: DowngradePlanRowDto[];

  @ApiProperty()
  keepBytes!: number;

  @ApiProperty()
  freezeBytes!: number;

  @ApiProperty({ description: 'Проб, которые режим измерил' })
  measured!: number;

  @ApiProperty({ description: 'Проб, которые режим не измерил (тишина, ниже порога, не декодируются) — все во freeze' })
  unmeasured!: number;

  @ApiProperty({ type: DowngradeFailedTailDto })
  failedTail!: DowngradeFailedTailDto;

  @ApiProperty({ description: 'sha256 над составом keep/freeze/хвоста и лимитом — вход для freeze' })
  planDigest!: string;

  @ApiProperty({ description: 'Сколько миллисекунд заняло измерение (замер, не обещание)' })
  measuredMs!: number;
}

export class DowngradeBatchDto {
  @ApiProperty({ format: 'uuid' })
  batchId!: string;

  @ApiProperty({ format: 'uuid' })
  deviceId!: string;

  @ApiProperty({ format: 'uuid' })
  membraneId!: string;

  @ApiProperty({ enum: ['frozen', 'restored', 'deleted', 'failed'] })
  state!: string;

  @ApiProperty({ format: 'date-time' })
  frozenAt!: Date;

  @ApiProperty({ format: 'date-time', description: 'Снимок: frozenAt + retentionDays суток' })
  expiresAt!: Date;

  @ApiProperty()
  retentionDays!: number;

  @ApiProperty({ enum: DOWNGRADE_CRITERIA })
  criterion!: string;

  @ApiProperty()
  planDigest!: string;

  @ApiProperty({ example: 'checkpoint-v1' })
  fromTariffId!: string;

  @ApiProperty({ example: 'free-v1' })
  toTariffId!: string;

  @ApiProperty()
  frozenBytes!: number;

  @ApiProperty()
  keptBytes!: number;

  @ApiProperty()
  sampleCount!: number;
}

export class DowngradeFreezeResponseDto {
  @ApiProperty({ enum: [true] })
  ok!: true;

  @ApiProperty({ description: 'true — партия по этому planDigest уже была, повторной заморозки не делалось' })
  idempotent!: boolean;

  @ApiProperty({ type: DowngradeBatchDto })
  batch!: DowngradeBatchDto;

  @ApiProperty({ description: 'Строк прежних failed-партий, переподчинённых этой' })
  adopted!: number;

  @ApiPropertyOptional({ nullable: true, description: 'Живых байт после переноса (post-condition выполнен)' })
  activeBufferBytes!: number | null;
}

export class DowngradeRestoreResponseDto {
  @ApiProperty({ enum: [true] })
  ok!: true;

  @ApiProperty({ type: DowngradeBatchDto })
  batch!: DowngradeBatchDto;

  @ApiProperty({ type: [String] })
  restored!: string[];
}

export class DowngradeBatchesResponseDto {
  @ApiProperty({ type: [DowngradeBatchDto] })
  batches!: DowngradeBatchDto[];
}

export class DowngradeRefusalDto {
  @ApiProperty({ enum: [false] })
  ok!: false;

  @ApiProperty({ enum: DOWNGRADE_ARCHIVE_REFUSAL_REASONS, description: 'Закрытый словарь; читать его, не HTTP-статус' })
  reason!: DowngradeArchiveRefusalReason;

  @ApiProperty()
  detail!: string;

  @ApiPropertyOptional({ type: DowngradeBatchDto, nullable: true, description: 'Партия, если отказ её породил (failed) или нашёл (duplicate)' })
  batch?: DowngradeBatchDto | null;
}
