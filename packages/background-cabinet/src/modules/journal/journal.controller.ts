import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import type { FastifyReply } from 'fastify';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';
import type {
  CreateTelemetryLiveRecordDto,
  CreateTelemetryReportDto,
  ListJournalQueryDto,
  UpdateTelemetryLiveRecordDto,
} from './journal.dto';
import { JournalService } from './journal.service';

@Controller('v1/telemetry')
@UseGuards(SessionGuard)
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Post('reports')
  createReport(@Req() req: AuthenticatedRequest, @Body() body: CreateTelemetryReportDto) {
    return this.journalService.createReport(req.authUser!.id, body);
  }

  @Get('reports')
  listReports(@Req() req: AuthenticatedRequest, @Query() query: ListJournalQueryDto) {
    return this.journalService.listReports(req.authUser!.id, query.limit, query.mediaDeviceId);
  }

  @Post('live-records')
  createLiveRecord(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateTelemetryLiveRecordDto,
  ) {
    return this.journalService.createLiveRecord(req.authUser!.id, body);
  }

  @Patch('live-records/:recordId')
  updateLiveRecord(
    @Req() req: AuthenticatedRequest,
    @Param('recordId') recordId: string,
    @Body() body: UpdateTelemetryLiveRecordDto,
  ) {
    return this.journalService.updateLiveRecord(req.authUser!.id, recordId, body);
  }

  @Get('live-records')
  listLiveRecords(@Req() req: AuthenticatedRequest, @Query() query: ListJournalQueryDto) {
    return this.journalService.listLiveRecords(
      req.authUser!.id,
      query.limit,
      query.mediaDeviceId,
    );
  }

  @Get('journal-items')
  async listJournalItems(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListJournalQueryDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const started = performance.now();
    const result = await this.journalService.listJournalItems(
      req.authUser!.id,
      query.limit,
      query.mediaDeviceId,
      query.cursor,
      query.filter,
      query.since,
    );
    const durationMs = performance.now() - started;
    const value = durationMs.toFixed(1);
    res.header('Server-Timing', `journal-db;dur=${value}`);
    res.header('X-Membrana-Journal-Db-Duration-Ms', value);
    return result;
  }

  @Delete('journal-items')
  deleteJournalItems(@Req() req: AuthenticatedRequest, @Query() query: ListJournalQueryDto) {
    return this.journalService.deleteJournalItems(
      req.authUser!.id,
      query.filter,
      query.mediaDeviceId,
    );
  }
}
