import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { driftAnchorRecordSchema } from './drift-anchor-record.dto';
import { DriftAnchorService } from './drift-anchor.service';

/**
 * Транспорт журнала drift-anchor (ADR 0004): producer'ы (CI-гейт, office-cron)
 * PUSH'ят свою запись сюда, кабинет читает сырые записи и сам считает
 * divergence через `evaluateProdMainDivergence` (@membrana/core) — office не
 * импортирует core (автономность, BACKGROUND_SERVERS.md).
 */
@ApiTags('drift-anchor')
@Controller('v1/drift-anchor')
export class DriftAnchorController {
  constructor(private readonly driftAnchor: DriftAnchorService) {}

  @Post('records')
  @UseGuards(ApiTokenGuard)
  @ApiBearerAuth('X-Membrana-Token')
  @ApiOperation({ summary: 'Ingest a DriftAnchorRecord from a producer (CI gate or office cron)' })
  @ApiResponse({ status: 200, description: 'Record accepted' })
  @ApiResponse({ status: 400, description: 'Invalid record shape' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API token' })
  ingest(@Body() raw: unknown): { ok: true } {
    const parsed = driftAnchorRecordSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    this.driftAnchor.ingest(parsed.data);
    return { ok: true };
  }

  @Get('digest')
  @ApiOperation({
    summary:
      'Raw drift-anchor records currently held (public, no auth — verdict/F1 already public in DETECTOR_BENCHMARK.md)',
  })
  @ApiResponse({ status: 200, description: 'Current records (0..3)' })
  digest() {
    return { records: this.driftAnchor.list() };
  }
}
