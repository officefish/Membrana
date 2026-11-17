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
 */
import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { API_TOKEN_SECURITY } from '../../common/swagger/openapi.constants';
import { DowngradeArchivePurgeService, type PurgeReport } from './downgrade-archive-purge.service';

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
  constructor(private readonly purge: DowngradeArchivePurgeService) {}

  @Post('purge-expired')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Purge expired downgrade-archive batches (frozen and past expiresAt); dryRun lists candidates only' })
  async purgeExpired(@Body() body: PurgeExpiredDto): Promise<PurgeReport> {
    // async — чтобы отказ разбора тела был отклонённым промисом, а не синхронным броском (единый путь для Nest и зубов).
    const dryRun = parseDryRun(body);
    return this.purge.purgeExpired(new Date(), { dryRun });
  }
}
