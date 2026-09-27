import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AUDIO_FORMATS,
  MEDIA_MIME_EXAMPLES,
  SAMPLE_LABELS,
  SAMPLE_SOURCES_API,
} from '../../common/swagger/openapi.constants';
import {
  BUFFER_OVERFLOW_REASON_VALUES,
  OVERFLOW_POLICY_VALUES,
  type BufferOverflowReason,
  type OverflowPolicy,
} from './buffer-overflow-refusal';
import {
  MAX_MOVE_BATCH_SAMPLES,
  MOVE_BATCH_STAY_REASONS,
  type MoveBatchStayReason,
} from './move-batch-plan';

/** Ось квоты — те же ключи и та же арифметика, что `GET :deviceId/quota`. */
export class QuotaAxisDto {
  @ApiProperty({ example: 1_073_741_824 })
  usedBytes!: number;

  @ApiProperty({ example: 1_073_741_824 })
  limitBytes!: number;
}

/**
 * Доменный отказ «места нет» (вердикт M2, #2307): HTTP 200, не ошибка транспорта. Строки
 * `reason`/`overflowPolicy` — из mapper'а, который единственный чеканит их на сервере; в этом
 * файле литералов словаря нет.
 */
export class BufferOverflowRefusalDto {
  @ApiProperty({ enum: [false], example: false })
  ok!: false;

  @ApiProperty({
    enum: BUFFER_OVERFLOW_REASON_VALUES,
    description:
      'Closed dictionary (@membrana/plugin-contracts buffer-overflow): device buffer full vs user storage full. Read this, not the HTTP status.',
  })
  reason!: BufferOverflowReason;

  @ApiProperty({ type: QuotaAxisDto })
  buffer!: QuotaAxisDto;

  @ApiProperty({ type: QuotaAxisDto })
  userStorage!: QuotaAxisDto;

  @ApiProperty({ enum: OVERFLOW_POLICY_VALUES, description: 'Device overflow policy known to the server' })
  overflowPolicy!: OverflowPolicy;

  @ApiProperty({
    format: 'uuid',
    description: 'Opaque overflow episode id — identical for every refusal of one episode',
  })
  overflowId!: string;

  @ApiProperty({ format: 'date-time', description: 'First refusal of the episode (ISO-8601 UTC)' })
  overflowAt!: string;
}

export class UploadMetaOverrideDto {
  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'unclassified' })
  class?: string;

  @ApiPropertyOptional({ enum: SAMPLE_LABELS })
  label?: (typeof SAMPLE_LABELS)[number];

  @ApiPropertyOptional({ enum: SAMPLE_SOURCES_API })
  source?: string;

  @ApiPropertyOptional()
  durationSec?: number;

  @ApiPropertyOptional({ example: 48000 })
  sampleRate?: number;

  @ApiPropertyOptional({ enum: [1, 2] })
  channels?: 1 | 2;

  @ApiPropertyOptional()
  notes?: string;
}

export class SampleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  collectionId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  class!: string;

  @ApiProperty({ enum: SAMPLE_LABELS })
  label!: string;

  @ApiProperty({ enum: SAMPLE_SOURCES_API })
  source!: string;

  @ApiProperty()
  durationSec!: number;

  @ApiProperty()
  sampleRate!: number;

  @ApiProperty({ enum: [1, 2] })
  channels!: 1 | 2;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty()
  storageRef!: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ enum: AUDIO_FORMATS })
  audioFormat!: string;

  @ApiProperty({ example: 'audio/wav' })
  contentType!: string;

  @ApiProperty()
  sizeBytes!: number;
}

export class MoveSampleDto {
  @ApiProperty({ description: 'Target collection id' })
  toCollectionId!: string;
}

/**
 * Заказ массового вывоза проб из буфера в набор.
 *
 * `sampleIds` — РОВНО те пробы, что человек видел в окне: глагола «перенеси все ранние» у двери
 * нет намеренно, как и у уборки буфера. Повтор адреса в списке — один и тот же предмет.
 */
export class MoveSamplesBatchDto {
  @ApiProperty({
    type: [String],
    description: `Sample ids to carry out of the buffer; at most ${MAX_MOVE_BATCH_SAMPLES} per call`,
  })
  sampleIds!: string[];

  @ApiProperty({ description: 'Target collection id (must not be the buffer itself)' })
  toCollectionId!: string;

  @ApiPropertyOptional({
    description:
      'true — compute the plan and move NOTHING. The modal shows this to the human before the word of confirmation; the real run picks the same set for unchanged state.',
  })
  dryRun?: boolean;
}

/** Числа пачки: сколько поместится/останется и сколько это байт. */
export class MoveSamplesBatchPlanDto {
  @ApiProperty({ example: 740, description: 'How many samples fit into the target axis' })
  willMove!: number;

  @ApiProperty({ example: 317, description: 'How many stay in the buffer' })
  willStay!: number;

  @ApiProperty({ example: 340_000_000 })
  moveBytes!: number;

  @ApiProperty({
    example: 146_000_000,
    description: 'Bytes of the staying samples whose size the server knows (not-found have none)',
  })
  stayBytes!: number;
}

/** Осталась в буфере — поимённо и с причиной. Молчаливого пропуска в контракте нет. */
export class MoveSamplesBatchStayDto {
  @ApiProperty()
  sampleId!: string;

  @ApiProperty({
    enum: MOVE_BATCH_STAY_REASONS,
    description:
      'no-space — target axis is full; not-found — no such sample on this device; not-in-buffer — already out of the buffer (e.g. a repeated call)',
  })
  reason!: MoveBatchStayReason;
}

/**
 * Итог массового вывоза. 200 с непустым `stayed` — ЧАСТИЧНЫЙ УСПЕХ, а не ошибка: наборы
 * младшего тарифа держат столько же, сколько буфер, и полный буфер в непустой набор целиком не
 * влезает по устройству тарифа. Оси — состояние на конец вызова (при `dryRun` — текущее).
 */
export class MoveSamplesBatchResponseDto {
  @ApiProperty({ type: MoveSamplesBatchPlanDto })
  plan!: MoveSamplesBatchPlanDto;

  @ApiProperty({
    type: [String],
    description: 'Moved sample ids in transfer order (oldest first); empty on dryRun',
  })
  moved!: string[];

  @ApiProperty({ type: [MoveSamplesBatchStayDto] })
  stayed!: MoveSamplesBatchStayDto[];

  @ApiProperty({ type: QuotaAxisDto })
  userStorage!: QuotaAxisDto;

  @ApiProperty({ type: QuotaAxisDto })
  buffer!: QuotaAxisDto;

  @ApiProperty({
    example: MAX_MOVE_BATCH_SAMPLES,
    description: 'Declared per-call ceiling on sampleIds — paginate by this, not by the first 400',
  })
  maxBatch!: number;
}

export class PatchSampleLabelDto {
  @ApiPropertyOptional({ enum: SAMPLE_LABELS, description: 'drone | not_drone | unlabeled (not-drone accepted)' })
  label?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Training / curation notes; null clears' })
  notes?: string | null;
}

/** Multipart upload: `file` (binary) + optional `meta` (JSON string). */
export class UploadSampleMultipartDto {
  @ApiProperty({ type: 'string', format: 'binary', description: MEDIA_MIME_EXAMPLES })
  file!: unknown;

  @ApiPropertyOptional({
    type: 'string',
    description: 'JSON string matching UploadMetaOverrideDto',
  })
  meta?: string;
}

export class PaginatedSamplesResponseDto {
  @ApiProperty({ type: [SampleResponseDto] })
  items!: SampleResponseDto[];

  @ApiProperty({ example: 1, description: '1-based page index' })
  page!: number;

  @ApiProperty({ example: 40 })
  limit!: number;

  @ApiProperty({ example: 120 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
