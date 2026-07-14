import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { MinRole } from '../panel-auth/panel-auth.decorators';
import { PanelAuthGuard } from '../panel-auth/panel-auth.guard';
import { benchmarkReportSchema } from './benchmark-report.dto';
import { BenchmarkService } from './benchmark.service';

/**
 * Транспорт сводки бенчмарка детекторов для панели (#454, консилиум
 * quality-control-contour): producer (`yarn benchmark:push`) PUSH'ит агрегаты,
 * панель читает за operator-уровнем (норма OP5: новый панельный API —
 * default-deny; no-store/rate-limit/аудит приходят из PanelAuthGuard).
 */
@ApiTags('benchmark')
@Controller('v1/benchmark')
export class BenchmarkController {
  constructor(private readonly benchmark: BenchmarkService) {}

  @Post('report')
  @UseGuards(ApiTokenGuard)
  @ApiBearerAuth('X-Membrana-Token')
  @ApiOperation({ summary: 'Ingest an aggregated benchmark summary (no per-sample data)' })
  @ApiResponse({ status: 201, description: 'Report accepted' })
  @ApiResponse({ status: 400, description: 'Invalid report shape (per-sample payload is rejected)' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API token' })
  ingest(@Body() raw: unknown): { ok: true } {
    const parsed = benchmarkReportSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    this.benchmark.ingest(parsed.data);
    return { ok: true };
  }

  @Get('summary')
  @UseGuards(PanelAuthGuard)
  @MinRole('operator')
  @ApiOperation({ summary: 'Latest benchmark summary for the panel board (operator+)' })
  @ApiResponse({ status: 200, description: 'Latest summary with provenance' })
  @ApiResponse({ status: 401, description: 'Panel authentication required' })
  @ApiResponse({ status: 403, description: 'Insufficient panel access level' })
  @ApiResponse({ status: 404, description: 'No report ingested since office start' })
  summary() {
    const latest = this.benchmark.latest();
    if (!latest) {
      throw new NotFoundException('benchmark: no report ingested (run yarn benchmark:push)');
    }
    return latest;
  }
}
