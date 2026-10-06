/**
 * Двери архива понижения (#2587 блок b3; ADR-0031).
 *
 * ДВЕ ФОРМЫ ОТВЕТА У ПРИКАЗОВ: 201 — сделано (партия заморожена / возвращена), 200 `{ ok: false,
 * reason, detail }` — доменный отказ из закрытого словаря (конвенция 12.08, как у загрузки проб).
 * Статус ставится через `reply`, не `@HttpCode`: Nest выставил бы 201 обеим формам.
 * Предпросмотр ничего не создаёт — всегда 200.
 */
import { Body, Controller, Get, HttpCode, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';

import { MediaDeviceAccessGuard } from '../../common/guards/media-device-access.guard';
import { ApiBadRequest, ApiStandardErrors } from '../../common/swagger/api-decorators';
import { API_TOKEN_SECURITY } from '../../common/swagger/openapi.constants';

import {
  DowngradeBatchesResponseDto,
  DowngradeFreezeDto,
  DowngradeFreezeResponseDto,
  DowngradePreviewDto,
  DowngradePreviewResponseDto,
  DowngradeRefusalDto,
  DowngradeRestoreResponseDto,
} from './downgrade-archive.dto';
import { DowngradeArchiveService } from './downgrade-archive.service';

@ApiTags('downgrade-archive')
@Controller('v1/devices/:deviceId/downgrade-archive')
@UseGuards(MediaDeviceAccessGuard)
@ApiSecurity(API_TOKEN_SECURITY)
@ApiHeader({ name: 'X-Membrana-Token', required: true })
@ApiParam({ name: 'deviceId', format: 'uuid' })
export class DowngradeArchiveController {
  constructor(private readonly archive: DowngradeArchiveService) {}

  @Post('preview')
  @HttpCode(200)
  @ApiOperation({ summary: 'What stays live and what goes to the downgrade archive under the new buffer limit (buffer axis only; changes nothing)' })
  @ApiResponse({ status: 200, type: DowngradePreviewResponseDto, description: 'Plan with planDigest, or { ok:false, reason } for unknown criterion / invalid limit' })
  @ApiStandardErrors()
  @ApiBadRequest()
  preview(@Param('deviceId') deviceId: string, @Body() body: DowngradePreviewDto) {
    return this.archive.preview(deviceId, { criterion: body?.criterion, bufferLimitBytes: Number(body?.bufferLimitBytes) });
  }

  @Post('freeze')
  @ApiOperation({ summary: 'Freeze the confirmed plan into one batch (recomputes the plan and checks planDigest; post-condition before ack)' })
  @ApiResponse({ status: 201, type: DowngradeFreezeResponseDto, description: 'Batch frozen (or the same batch for a repeated planDigest, idempotent=true)' })
  @ApiResponse({ status: 200, type: DowngradeRefusalDto, description: 'Domain refusal: preview_required, plan_stale, invalid_retention, partial_freeze, quota_invariant_violated, concurrent_change' })
  @ApiStandardErrors()
  @ApiBadRequest()
  async freeze(@Param('deviceId') deviceId: string, @Body() body: DowngradeFreezeDto, @Res() reply: FastifyReply) {
    const outcome = await this.archive.freeze(deviceId, {
      criterion: body?.criterion,
      bufferLimitBytes: Number(body?.bufferLimitBytes),
      planDigest: body?.planDigest,
      retentionDays: Number(body?.retentionDays),
      membraneId: body?.membraneId,
      fromTariffId: body?.fromTariffId,
      toTariffId: body?.toTariffId,
    });
    return reply.status(outcome.ok ? 201 : 200).send(outcome);
  }

  @Get('batches')
  @ApiOperation({ summary: 'Downgrade archive batches of the device with state and expiresAt (snapshot)' })
  @ApiResponse({ status: 200, type: DowngradeBatchesResponseDto })
  @ApiStandardErrors()
  async batches(@Param('deviceId') deviceId: string) {
    return { batches: await this.archive.listBatches(deviceId) };
  }

  @Post('batches/:batchId/restore')
  @ApiParam({ name: 'batchId', format: 'uuid' })
  @ApiOperation({ summary: 'Return a whole batch to the live buffer (only frozen, before expiresAt, only if it fits the current limit)' })
  @ApiResponse({ status: 201, type: DowngradeRestoreResponseDto })
  @ApiResponse({ status: 200, type: DowngradeRefusalDto, description: 'Domain refusal: batch_not_found, batch_not_frozen, archive_expired, insufficient_quota' })
  @ApiStandardErrors()
  async restore(@Param('deviceId') deviceId: string, @Param('batchId') batchId: string, @Res() reply: FastifyReply) {
    const outcome = await this.archive.restore(deviceId, batchId);
    return reply.status(outcome.ok ? 201 : 200).send(outcome);
  }
}
