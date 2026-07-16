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

  /**
   * Proxy-aware POST в Bot API: через undici ProxyAgent при HTTPS_PROXY, иначе
   * голым fetch. Возвращает { ok, status, bodyText } (bodyText только при !ok).
   */
  private async dispatch(
    url: string,
    init: Record<string, unknown>,
  ): Promise<{ ok: boolean; status: number; bodyText: string }> {
    const proxy = this.proxyUrl();
    if (proxy) {
      const dispatcher = new ProxyAgent(proxy);
      try {
        const res = await undiciFetch(url, { ...init, dispatcher } as never);
        return { ok: res.ok, status: res.status, bodyText: res.ok ? '' : (await res.text()).slice(0, 300) };
      } finally {
        try {
          await dispatcher.close();
        } catch {
          /* ignore */
        }
      }
    }
    const res = await fetch(url, init as never);
    return { ok: res.ok, status: res.status, bodyText: res.ok ? '' : (await res.text()).slice(0, 300) };
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
    try {
      const { ok, status, bodyText } = await this.dispatch(url, init);
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

  /**
   * Отправить вложение-документ (ALLY_DIGEST_FORMAT.md): полный md-артефакт дня
   * (MAIN_DAY_ISSUE / code-review) отдельным сообщением после тезисного текста.
   * multipart/form-data; caption опционален (HTML). Fire-and-forget, как sendMessage.
   */
  async sendDocument(filename: string, content: string, caption?: string): Promise<boolean> {
    if (!this.enabled) {
      this.logger.warn('telegram disabled: TELEGRAM_BOT_TOKEN / TELEGRAM_ALLY_CHAT_ID not set');
      return false;
    }
    const url = `https://api.telegram.org/bot${this.config.TELEGRAM_BOT_TOKEN}/sendDocument`;
    const form = new FormData();
    form.append('chat_id', String(this.config.TELEGRAM_ALLY_CHAT_ID));
    form.append('document', new Blob([content], { type: 'text/markdown' }), filename);
    if (caption) {
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
    }
    const init = { method: 'POST', body: form, signal: AbortSignal.timeout(20_000) };
    try {
      const { ok, status, bodyText } = await this.dispatch(url, init);
      if (!ok) {
        this.logger.warn({ status, body: bodyText }, 'telegram.sendDocument failed');
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn({ err }, 'telegram.sendDocument error');
      return false;
    }
  }
}
