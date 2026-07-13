import { Inject, Injectable, Logger } from '@nestjs/common';

import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';

/**
 * Тонкий клиент Telegram Bot API (outbound-модуль по образцу claude/linear).
 *
 * Fire-and-forget (канон REVIEW инсайта insight-telegram-work-reports): любая
 * ошибка — warn в лог и `false` наружу, никакой очереди/ретрая — office
 * stateless, source of truth остаётся в git-артефактах ритуала.
 */
@Injectable()
export class TelegramClient {
  private readonly logger = new Logger(TelegramClient.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  get enabled(): boolean {
    return Boolean(this.config.TELEGRAM_BOT_TOKEN && this.config.TELEGRAM_ALLY_CHAT_ID);
  }

  async sendMessage(text: string): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn('telegram disabled: TELEGRAM_BOT_TOKEN / TELEGRAM_ALLY_CHAT_ID not set');
      return false;
    }
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${this.config.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.config.TELEGRAM_ALLY_CHAT_ID,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );
      if (!res.ok) {
        const body = (await res.text()).slice(0, 300);
        this.logger.warn({ status: res.status, body }, 'telegram.sendMessage failed');
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn({ err }, 'telegram.sendMessage error');
      return false;
    }
  }
}
