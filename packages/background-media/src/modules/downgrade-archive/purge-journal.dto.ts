/**
 * DTO дверей чтения журнала уборщика (#2632 g4a; формы графика и аудита — g4b): формы ответов для
 * Swagger и разбор параметров. Литералы — словарь `purge-journal.vocabulary.ts`; здесь их только
 * показывают. Адресов файлов в формах нет (см. `purge-journal-read.ts`, `purge-journal-verify.ts`).
 */
import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { PURGE_JOB_STATUSES, PURGE_JOB_TARGETS, PURGE_RUN_MODES, PURGE_RUN_STATUSES, PURGE_RUN_TRIGGERS } from './purge-journal.vocabulary';

export const PURGE_LIST_DEFAULT_LIMIT = 20;
export const PURGE_LIST_MAX_LIMIT = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `?limit`: пусто → 20; целое 1..100, иначе 400 `invalid_limit` (не молчаливое обрезание). */
export function parseLimit(raw: unknown): number {
  if (raw === undefined || raw === '') return PURGE_LIST_DEFAULT_LIMIT;
  const n = typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(n) || n < 1 || n > PURGE_LIST_MAX_LIMIT) {
    throw new BadRequestException({ code: 'invalid_limit', detail: `limit must be an integer 1..${PURGE_LIST_MAX_LIMIT}` });
  }
  return n;
}

/** `:id` прогона — uuid; иначе 400 `invalid_run_id` (Postgres на не-uuid ответил бы 500). */
export function parseRunId(raw: string): string {
  if (!UUID.test(raw)) throw new BadRequestException({ code: 'invalid_run_id', detail: 'run id must be a uuid' });
  return raw;
}

export class PurgeRunSummaryDto {
  @ApiProperty({ format: 'uuid' }) runId!: string;
  @ApiProperty({ enum: PURGE_RUN_TRIGGERS }) trigger!: string;
  @ApiProperty({ enum: PURGE_RUN_MODES }) mode!: string;
  @ApiProperty({ enum: PURGE_RUN_STATUSES }) status!: string;
  @ApiProperty({ format: 'date-time' }) startedAt!: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) finishedAt!: string | null;
  @ApiProperty() enabledSnapshot!: boolean;
  @ApiProperty() dryRunSnapshot!: boolean;
  @ApiProperty() jobsTotal!: number;
  @ApiProperty() jobsSucceeded!: number;
  @ApiProperty({ description: 'Неудачные попытки, оставившие долг (retry)' }) jobsFailed!: number;
  @ApiProperty() jobsDeadLetter!: number;
  @ApiProperty() bytesFreed!: number;
  @ApiPropertyOptional({ nullable: true, description: 'Класс ошибки обрыва, без путей' }) errorSummary!: string | null;
}

export class PurgePathOutcomeCountsDto {
  @ApiProperty() removed!: number;
  @ApiProperty() already_absent!: number;
  @ApiProperty() failed!: number;
}

export class PurgeJobSummaryDto {
  @ApiProperty({ format: 'uuid' }) jobId!: string;
  @ApiProperty({ enum: PURGE_JOB_TARGETS }) targetType!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) batchId!: string | null;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) deviceId!: string | null;
  @ApiProperty({ enum: PURGE_JOB_STATUSES }) status!: string;
  @ApiProperty() attempt!: number;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) nextAttemptAt!: string | null;
  @ApiProperty({ description: 'Число путей в снимке; самих путей наружу нет' }) pathsTotal!: number;
  @ApiProperty({ type: PurgePathOutcomeCountsDto }) outcomes!: PurgePathOutcomeCountsDto;
  @ApiProperty() bytesFreed!: number;
  @ApiPropertyOptional({ nullable: true, description: 'Сводка отказа без путей' }) lastError!: string | null;
}

export class PurgeRunDetailDto extends PurgeRunSummaryDto {
  @ApiProperty({ type: [PurgeJobSummaryDto] }) jobs!: PurgeJobSummaryDto[];
}

export class PurgePulseDto {
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) lastFinishedRunAt!: string | null;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) lastSucceededRunAt!: string | null;
}

export class PurgeScheduleRowDto {
  @ApiProperty({ format: 'uuid' }) batchId!: string;
  @ApiProperty({ format: 'uuid' }) membraneId!: string;
  @ApiProperty({ format: 'uuid' }) deviceId!: string;
  @ApiProperty({ format: 'date-time', description: 'Когда партия станет кандидатом уборки' }) expiresAt!: string;
  @ApiProperty() frozenBytes!: number;
}

export class PurgeJobVerificationDto {
  @ApiProperty({ format: 'uuid' }) jobId!: string;
  @ApiProperty({ enum: PURGE_JOB_TARGETS }) targetType!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) batchId!: string | null;
  @ApiProperty({ enum: PURGE_JOB_STATUSES }) status!: string;
  @ApiPropertyOptional({ nullable: true, description: 'Состояние партии сейчас' }) batchState!: string | null;
  @ApiProperty({ description: 'Строк архива партии сейчас' }) rowsRemaining!: number;
  @ApiProperty() pathsTotal!: number;
  @ApiProperty({ description: 'Путей снимка, существующих сейчас' }) pathsRemaining!: number;
  @ApiProperty({ type: [Boolean], description: 'Существует ли каждый путь снимка сейчас — в порядке снимка, без адресов' }) pathsExistNow!: boolean[];
  @ApiProperty({ description: 'Партия deleted, строк 0, путей 0' }) clean!: boolean;
}

export class PurgeRunVerificationDto {
  @ApiProperty({ format: 'uuid' }) runId!: string;
  @ApiProperty({ enum: PURGE_RUN_MODES }) mode!: string;
  @ApiProperty({ enum: PURGE_RUN_STATUSES }) status!: string;
  @ApiProperty() clean!: boolean;
  @ApiProperty({ type: [PurgeJobVerificationDto] }) jobs!: PurgeJobVerificationDto[];
}
