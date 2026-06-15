import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
  listJournalItems(@Req() req: AuthenticatedRequest, @Query() query: ListJournalQueryDto) {
    return this.journalService.listJournalItems(
      req.authUser!.id,
      query.limit,
      query.mediaDeviceId,
      query.cursor,
      query.filter,
    );
  }
}
