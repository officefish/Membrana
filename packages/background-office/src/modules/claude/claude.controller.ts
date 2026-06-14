import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { z } from 'zod';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { ClaudeService } from './claude.service';
import { PersonaAskService } from './persona-ask.service';
import type { ClaudeAskBody } from '../../types/claude.types';

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const askSchema = z.object({
  model: z.string().optional(),
  system: z.string().optional(),
  messages: z.array(messageSchema).min(1),
  max_tokens: z.number().int().positive().optional(),
});

const contextRefSchema = z.discriminatedUnion('source', [
  z.object({
    source: z.literal('github-issue'),
    issueNumber: z.number().int().positive(),
  }),
  z.object({ source: z.literal('linear'), ticketId: z.string().min(1) }),
  z.object({ source: z.literal('raw'), text: z.string().min(1) }),
]);

const personaAskSchema = z.object({
  question: z.string().min(1),
  context: contextRefSchema.optional(),
  includeStrategicDocs: z.boolean().optional(),
});

@ApiTags('Claude')
@Controller('v1/claude')
@UseGuards(ApiTokenGuard)
@ApiBearerAuth('api-token')
export class ClaudeController {
  constructor(
    @Inject(ClaudeService) private readonly claude: ClaudeService,
    @Inject(PersonaAskService) private readonly personaAsk: PersonaAskService,
  ) {}

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Universal Claude Messages API call' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        model: { type: 'string', description: 'Claude model to use (optional)', example: 'claude-3-5-sonnet-20241022' },
        system: { type: 'string', description: 'System prompt (optional)' },
        messages: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['user', 'assistant'] },
              content: { type: 'string' },
            },
            required: ['role', 'content'],
          },
        },
        max_tokens: { type: 'number', description: 'Maximum tokens in response (optional)' },
      },
      required: ['messages'],
    },
  })
  @ApiResponse({ status: 200, description: 'Claude API response' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API token' })
  async ask(@Body() raw: unknown) {
    const parsed = askSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const body = parsed.data as ClaudeAskBody;
    return this.claude.ask(body);
  }

  @Post('persona/:name/ask')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask a persona with context and strategic documents' })
  @ApiParam({ name: 'name', description: 'Persona name (e.g., vesnin, dynin)', example: 'vesnin' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Question for the persona', minLength: 1 },
        context: {
          type: 'object',
          description: 'Context source: {source: "github-issue", issueNumber: number} | {source: "linear", ticketId: string} | {source: "raw", text: string} (optional)',
        },
        includeStrategicDocs: { type: 'boolean', description: 'Include strategic documents (optional)' },
      },
      required: ['question'],
    },
  })
  @ApiResponse({ status: 200, description: 'Persona response' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API token' })
  async askPersona(@Param('name') name: string, @Body() raw: unknown) {
    const parsed = personaAskSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.personaAsk.askPersona(name, parsed.data);
  }
}
