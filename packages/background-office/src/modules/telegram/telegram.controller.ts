import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { allyMessageSchema } from './ally-message.dto';
import { ritualDigestSchema } from './ritual-digest.dto';
import { formatAllyMessage, formatRitualDigest } from './telegram-format';
import { TelegramClient } from './telegram.client';

/**
 * Приём дайджеста ритуала (#428): локальный скрипт `telegram-ritual-digest.mjs`
 * PUSH'ит payload сюда, office форматирует и шлёт в приватную группу союзников.
 * Fire-and-forget: неудача отправки не роняет запрос (`sent: false`).
 */
@ApiTags('telegram')
@Controller('v1/telegram')
export class TelegramController {
  constructor(private readonly telegram: TelegramClient) {}

  @Post('ritual-digest')
  @UseGuards(ApiTokenGuard)
  @ApiBearerAuth('X-Membrana-Token')
  @ApiOperation({ summary: 'Ingest a ritual digest (day/evening) and post it to the ally group' })
  @ApiResponse({ status: 200, description: 'Digest accepted (sent=false if telegram unavailable)' })
  @ApiResponse({ status: 400, description: 'Invalid digest shape' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API token' })
  async ingest(@Body() raw: unknown): Promise<{ ok: true; sent: boolean }> {
    const parsed = ritualDigestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const digest = parsed.data;
    const sent = await this.telegram.sendMessage(formatRitualDigest(digest));
    // Вложение — отдельным сообщением после тезисного текста (ALLY_DIGEST_FORMAT.md).
    // Fire-and-forget: неудача вложения не влияет на `sent` основного дайджеста.
    if (digest.documentMd && digest.documentName) {
      await this.telegram.sendDocument(digest.documentName, digest.documentMd);
    }
    return { ok: true, sent };
  }

  @Post('ally-message')
  @UseGuards(ApiTokenGuard)
  @ApiBearerAuth('X-Membrana-Token')
  @ApiOperation({ summary: 'Send a one-off owner-triggered message («ласточка») to the ally group' })
  @ApiResponse({ status: 200, description: 'Message accepted (sent=false if telegram unavailable)' })
  @ApiResponse({ status: 400, description: 'Invalid message shape' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API token' })
  async allyMessage(@Body() raw: unknown): Promise<{ ok: true; sent: boolean }> {
    const parsed = allyMessageSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const sent = await this.telegram.sendMessage(formatAllyMessage(parsed.data));
    return { ok: true, sent };
  }
}
