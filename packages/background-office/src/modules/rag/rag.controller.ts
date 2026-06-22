import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import type { RagGateway, RagQueryResultDto } from './rag-gateway.interface';
import { RagGatewayService } from './rag-gateway.service';

const ragOptionsSchema = z
  .object({
    useLongTerm: z.boolean().optional(),
    historical: z.boolean().optional(),
    topK: z.number().int().positive().max(20).optional(),
    operativeDays: z.number().int().positive().max(90).optional(),
    minOperativeCount: z.number().int().positive().max(20).optional(),
  })
  .optional();

const ragQuerySchema = z.object({
  query: z.string().trim().min(1).max(2000),
  options: ragOptionsSchema,
});

/** Response mirrors `@membrana/rag-service` {@link RAGQueryResult}. */
export type RagQueryResponse = RagQueryResultDto;

@ApiTags('RAG')
@Controller('api/rag')
@UseGuards(ApiTokenGuard)
@ApiBearerAuth('api-token')
export class RagController {
  constructor(@Inject(RagGatewayService) private readonly ragGateway: RagGateway) {}

  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dual-circuit RAG context retrieval',
    description:
      'Protected by X-Membrana-Token. Returns operative (BM25) and/or LanceDB archive fragments. See docs/RAG.md.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, maxLength: 2000 },
        options: {
          type: 'object',
          properties: {
            useLongTerm: { type: 'boolean' },
            historical: { type: 'boolean' },
            topK: { type: 'integer', minimum: 1, maximum: 20 },
            operativeDays: { type: 'integer', minimum: 1, maximum: 90 },
            minOperativeCount: { type: 'integer', minimum: 1, maximum: 20 },
          },
        },
      },
      required: ['query'],
    },
  })
  @ApiResponse({ status: 200, description: 'RAG fragments for prompt injection' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API token' })
  @ApiResponse({ status: 503, description: 'Archive circuit unavailable (missing index or OPENAI_API_KEY)' })
  async query(@Body() raw: unknown): Promise<RagQueryResponse> {
    const parsed = ragQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    return this.ragGateway.retrieveContext(parsed.data.query, parsed.data.options);
  }
}
