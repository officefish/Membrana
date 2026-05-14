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

@Controller('v1/claude')
@UseGuards(ApiTokenGuard)
export class ClaudeController {
  constructor(
    @Inject(ClaudeService) private readonly claude: ClaudeService,
    @Inject(PersonaAskService) private readonly personaAsk: PersonaAskService,
  ) {}

  @Post('ask')
  @HttpCode(HttpStatus.OK)
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
  async askPersona(@Param('name') name: string, @Body() raw: unknown) {
    const parsed = personaAskSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.personaAsk.askPersona(name, parsed.data);
  }
}
