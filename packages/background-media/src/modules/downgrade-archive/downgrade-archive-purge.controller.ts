/**
 * Дверь уборки холодного архива (#2588 b5): `POST /v1/internal/downgrade-archive/purge-expired {dryRun}`.
 *
 * Охрана — `ApiTokenGuard` (внутренний токен `X-Membrana-Token`, тот же класс, что у пусковика office:
 * `MEDIA_API_TOKEN` office = `API_INTERNAL_TOKEN` media). Зовёт её `ColdArchiveSweepClient` office раз в
 * час (b6) и ручка `sweep-preview` панели (всегда dryRun).
 *
 * `dryRun` В ТЕЛЕ ОБЯЗАТЕЛЕН И БУЛЕВ (P25 плана): умолчания «боевой» у двери нет — пропущенное поле или
 * строка `"false"` отвечают 400 `dry_run_required`, не удалением. Время — только серверное: подменить
 * `now` телом нельзя (иначе можно было бы убрать неистёкшее).
 *
 * Ответ 200 явно (прецедент 201/200 двери #2393); форма — `PurgeReport` сервиса, даты строками в JSON.
 *
 * #2632 g4a — двери ЧТЕНИЯ журнала под тем же охранником (служебные, для панели office; кнопок удаления
 * нет): `GET purge-runs?limit`, `GET purge-runs/:id`, `GET purge-pulse`. g4b — `GET purge-schedule?limit`
 * (Т5: frozen-партии по сроку) и `GET purge-runs/:id/verify` (Т4: аудит сейчас). Наружу — счётчики, id и
 * булевы признаки, без адресов файлов. Незнакомый прогон — 404 `run_not_found`.
 */
import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiOperation, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { API_TOKEN_SECURITY } from '../../common/swagger/openapi.constants';
import { BlobStorageService } from '../../blob/blob-storage.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DowngradeArchivePurgeService, type PurgeReport } from './downgrade-archive-purge.service';
import {
  PurgePulseDto,
  PurgeRunDetailDto,
  PurgeRunSummaryDto,
  PurgeRunVerificationDto,
  PurgeScheduleRowDto,
  parseLimit,
  parseRunId,
} from './purge-journal.dto';
import { getRun, listRuns, purgePulse } from './purge-journal-read';
import { blobExistsProbe, purgeSchedule, verifyRun } from './purge-journal-verify';

export const PURGE_ROUTE_PREFIX = 'v1/internal/downgrade-archive';

export interface PurgeExpiredDto {
  readonly dryRun?: unknown;
}

/** Разбор тела — чистая функция ради зуба: только `true`/`false` как булев, всё иное — отказ. */
export function parseDryRun(body: PurgeExpiredDto | undefined): boolean {
  const value = body?.dryRun;
  if (value !== true && value !== false) {
    throw new BadRequestException({ code: 'dry_run_required', detail: 'body.dryRun must be boolean true or false' });
  }
  return value;
}

@ApiTags('downgrade-archive')
@Controller(PURGE_ROUTE_PREFIX)
@UseGuards(ApiTokenGuard)
@ApiSecurity(API_TOKEN_SECURITY)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
export class DowngradeArchivePurgeController {
  constructor(
    private readonly purge: DowngradeArchivePurgeService,
    private readonly prisma: PrismaService,
    private readonly blobs: BlobStorageService,
  ) {}

  @Post('purge-expired')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purge expired downgrade-archive batches (frozen and past expiresAt); dryRun lists candidates only' })
  async purgeExpired(@Body() body: PurgeExpiredDto): Promise<PurgeReport> {
    // async — чтобы отказ разбора тела был отклонённым промисом, а не синхронным броском (единый путь для Nest и зубов).
    const dryRun = parseDryRun(body);
    return this.purge.purgeExpired(new Date(), { dryRun });
  }

  @Get('purge-runs')
  @ApiOperation({ summary: 'Cold-archive purge journal: latest runs (counters only, no file paths)' })
  @ApiQuery({ name: 'limit', required: false, description: 'integer 1..100, default 20' })
  @ApiOkResponse({ type: [PurgeRunSummaryDto] })
  async runs(@Query('limit') limit?: string) {
    return listRuns(this.prisma, parseLimit(limit));
  }

  @Get('purge-runs/:id')
  @ApiOperation({ summary: 'One purge run with its jobs (path counts and outcome counts, no file paths)' })
  @ApiOkResponse({ type: PurgeRunDetailDto })
  async run(@Param('id') id: string) {
    return found(await getRun(this.prisma, parseRunId(id)));
  }

  @Get('purge-runs/:id/verify')
  @ApiOperation({ summary: 'Audit a purge run now: batch state, archive rows left, existence of each snapshot path (booleans only)' })
  @ApiOkResponse({ type: PurgeRunVerificationDto })
  async verify(@Param('id') id: string) {
    return found(await verifyRun(this.prisma, blobExistsProbe(this.blobs), parseRunId(id)));
  }

  @Get('purge-pulse')
  @ApiOperation({ summary: 'Last finished and last succeeded purge run' })
  @ApiOkResponse({ type: PurgePulseDto })
  async pulse() {
    return purgePulse(this.prisma);
  }

  @Get('purge-schedule')
  @ApiOperation({ summary: 'Upcoming deletions: frozen batches ordered by expiresAt (no file paths)' })
  @ApiQuery({ name: 'limit', required: false, description: 'integer 1..100, default 20' })
  @ApiOkResponse({ type: [PurgeScheduleRowDto] })
  async schedule(@Query('limit') limit?: string) {
    return purgeSchedule(this.prisma, parseLimit(limit));
  }
}

function found<T>(value: T | null): T {
  if (value === null) throw new NotFoundException({ code: 'run_not_found', detail: 'no purge run with this id' });
  return value;
}
