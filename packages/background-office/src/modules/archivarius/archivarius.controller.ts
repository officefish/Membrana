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

/**
 * Валидация параметров запроса (долг попугая archivarius-nan-params-silent-200,
 * ревью 28.07): `?limit=abc` давал NaN → пустой список с HTTP 200, кривые from/to
 * и `?by=` молча отключали фильтры — мусорный параметр выглядел как «ничего не
 * найдено». Теперь каждый называет себя в 400, а не притворяется пустотой.
 */
const DECOMPOSE_AXES = ['sessions', 'days', 'actors'] as const;

const decomposeQuerySchema = z.object({
  by: z.enum(DECOMPOSE_AXES).optional(),
});

const isoDateish = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'не разбирается как дата/время ISO (пример: 2026-07-28 или 2026-07-28T10:00:00Z)' });

const searchQuerySchema = z.object({
  text: z.string().trim().min(1).optional(),
  actor: z.string().trim().min(1).optional(),
  replyType: z.string().trim().min(1).optional(),
  from: isoDateish.optional(),
  to: isoDateish.optional(),
  limit: z
    .string()
    .trim()
    .refine((v) => /^\d+$/u.test(v), { message: 'целое число ≥ 1 (пример: 50)' })
    .transform((v) => Number(v))
    .refine((n) => n >= 1 && n <= 500, { message: 'вне диапазона 1..500' })
    .optional(),
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
  @ApiResponse({ status: 400, description: 'Неизвестная ось: ?by вне {sessions|days|actors}' })
  async decompose(@Query('by') by?: string) {
    const parsed = decomposeQuerySchema.safeParse({ by });
    if (!parsed.success) {
      throw new BadRequestException({
        message: `параметр by=«${by}» неизвестен — ось из {${DECOMPOSE_AXES.join('|')}}; молчаливый откат к sessions отменён (долг 28.07)`,
        details: parsed.error.flatten(),
      });
    }
    return this.archivarius.decompose(parsed.data.by ?? 'sessions');
  }

  @Get('inspect/:sessionId')
  @ApiOperation({ summary: 'Session passport (inspectElement)' })
  async inspectElement(@Param('sessionId') sessionId: string) {
    return this.archivarius.inspectElement(sessionId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search full text and filters by actor/time/reply type' })
  @ApiResponse({ status: 400, description: 'Кривой параметр назван по имени (limit не число, from/to не дата)' })
  async search(
    @Query('text') text?: string,
    @Query('actor') actor?: string,
    @Query('replyType') replyType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limitRaw?: string,
  ) {
    const parsed = searchQuerySchema.safeParse({ text, actor, replyType, from, to, limit: limitRaw });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const named = Object.entries(fieldErrors)
        .map(([field, errs]) => `${field}=«${String({ text, actor, replyType, from, to, limit: limitRaw }[field as keyof typeof fieldErrors] ?? '')}»: ${(errs ?? []).join('; ')}`)
        .join(' · ');
      throw new BadRequestException({
        message: `кривые параметры — ${named}. Пустой ответ 200 на мусорный параметр отменён (долг 28.07: «ничего не найдено» ≠ «спросили неправильно»)`,
        details: fieldErrors,
      });
    }
    return this.archivarius.search(parsed.data);
  }
}
