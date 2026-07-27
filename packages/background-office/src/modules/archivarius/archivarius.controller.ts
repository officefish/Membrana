import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { ArchivariusService } from './archivarius.service';

const spanSchema = z.object({
  sessionId: z.string().trim().min(1),
  uuid: z.string().trim().min(1),
  ts: z.string().trim().min(1),
  actor: z.string().trim().min(1).default('unknown'),
  replyType: z.string().trim().min(1).default('unknown'),
  bytes: z.string(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/u),
  masked: z.boolean().default(false),
  maskedCuts: z.array(z.object({
    name: z.string(),
    line: z.number().optional(),
    path: z.string().optional(),
    length: z.number(),
  })).optional(),
  sourcePath: z.string().nullable().optional(),
  lineNo: z.number().nullable().optional(),
});

const ingestSchema = z.object({
  spans: z.array(spanSchema).max(10000),
});

@ApiTags('archivarius')
@Controller('v1/archivarius')
@UseGuards(ApiTokenGuard)
@ApiBearerAuth('X-Membrana-Token')
export class ArchivariusController {
  constructor(private readonly archivarius: ArchivariusService) {}

  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Batch ingest redacted local transcript spans into Archivarius' })
  async ingest(@Body() raw: unknown) {
    const parsed = ingestSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.archivarius.ingest(parsed.data.spans);
  }

  @Get('span/:sessionId/:uuid')
  @ApiOperation({ summary: 'GET span -> { bytes, sha256 } for an addressable session span' })
  @ApiResponse({ status: 200, description: 'Span extraction act: bytes + sha256' })
  async span(@Param('sessionId') sessionId: string, @Param('uuid') uuid: string) {
    return this.archivarius.getSpan(sessionId, uuid);
  }

  @Get('audit')
  @ApiOperation({ summary: 'Audit Archivarius index completeness and corruption' })
  async audit() {
    return this.archivarius.audit();
  }

  @Get('decompose')
  @ApiOperation({ summary: 'Decompose spans by sessions, days, or actors' })
  async decompose(@Query('by') by?: 'sessions' | 'days' | 'actors') {
    return this.archivarius.decompose(by ?? 'sessions');
  }

  @Get('inspect/:sessionId')
  @ApiOperation({ summary: 'Session passport (inspectElement)' })
  async inspectElement(@Param('sessionId') sessionId: string) {
    return this.archivarius.inspectElement(sessionId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search full text and filters by actor/time/reply type' })
  async search(
    @Query('text') text?: string,
    @Query('actor') actor?: string,
    @Query('replyType') replyType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? Number(limitRaw) : undefined;
    return this.archivarius.search({ text, actor, replyType, from, to, limit });
  }
}
