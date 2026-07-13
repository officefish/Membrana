import { Inject, Injectable, Logger } from '@nestjs/common';
import { fetch as undiciFetch, ProxyAgent } from 'undici';

import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';

/**
 * Тонкий клиент Telegram Bot API (outbound-модуль по образцу claude/linear).
 *
 * Fire-and-forget (канон REVIEW инсайта insight-telegram-work-reports): любая
 * ошибка — warn в лог и `false` наружу, никакой очереди/ретрая — office
 * stateless, source of truth остаётся в git-артефактах ритуала.
 *
 * Proxy-aware по образцу ClaudeService: голый fetch из контейнера office не
 * пробивается наружу (bridge NAT), при HTTPS_PROXY идём через undici
 * ProxyAgent — урок night-hunt «OpenRouterService на голом fetch прокси не видит».
 */
@Injectable()
export class TelegramClient {
  private readonly logger = new Logger(TelegramClient.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  get enabled(): boolean {
    return Boolean(this.config.TELEGRAM_BOT_TOKEN && this.config.TELEGRAM_ALLY_CHAT_ID);
  }

  private proxyUrl(): string {
    return this.config.HTTPS_PROXY?.trim() || this.config.HTTP_PROXY?.trim() || '';
  }

  async sendMessage(text: string): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn('telegram disabled: TELEGRAM_BOT_TOKEN / TELEGRAM_ALLY_CHAT_ID not set');
      return false;
    }
    const url = `https://api.telegram.org/bot${this.config.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const init = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.config.TELEGRAM_ALLY_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(15_000),
    };
    const proxy = this.proxyUrl();
    try {
      let status: number;
      let ok: boolean;
      let bodyText: string;
      if (proxy) {
        const dispatcher = new ProxyAgent(proxy);
        try {
          const res = await undiciFetch(url, { ...init, dispatcher });
          ok = res.ok;
          status = res.status;
          bodyText = ok ? '' : (await res.text()).slice(0, 300);
        } finally {
          try {
            await dispatcher.close();
          } catch {
            /* ignore */
          }
        }
      } else {
        const res = await fetch(url, init);
        ok = res.ok;
        status = res.status;
        bodyText = ok ? '' : (await res.text()).slice(0, 300);
      }
      if (!ok) {
        this.logger.warn({ status, body: bodyText }, 'telegram.sendMessage failed');
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn({ err }, 'telegram.sendMessage error');
      return false;
    }
  }
}
