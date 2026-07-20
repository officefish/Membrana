import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { fetch as undiciFetch, ProxyAgent } from 'undici';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.OPENROUTER_API_KEY?.trim());
  }

  defaultModel(): string {
    return this.config.OPENROUTER_MODEL?.trim() || 'anthropic/claude-haiku-4.5';
  }

  private proxyUrl(): string {
    return (
      this.config.HTTPS_PROXY?.trim() ||
      this.config.HTTP_PROXY?.trim() ||
      ''
    );
  }

  /**
   * Optional night-hunt / dreams LLM call via OpenRouter.
   * Proxy-aware: голый fetch не видит HTTPS_PROXY (урок night-hunt).
   */
  async chat(prompt: string, maxTokens = 4_096, model?: string): Promise<string> {
    const apiKey = this.config.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    const body = {
      model: model?.trim() || this.defaultModel(),
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    };

    const headers = {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      'http-referer': 'https://membrana.space',
      'x-title': 'Membrana Night Hunt',
    };
    const payload = JSON.stringify(body);
    const signal = AbortSignal.timeout(120_000);
    const proxy = this.proxyUrl();

    let res: { ok: boolean; status: number; text: () => Promise<string> };
    if (proxy) {
      const dispatcher = new ProxyAgent(proxy);
      try {
        res = await undiciFetch(OPENROUTER_URL, {
          method: 'POST',
          headers,
          body: payload,
          dispatcher,
          signal,
        });
      } finally {
        try {
          await dispatcher.close();
        } catch {
          /* ignore */
        }
      }
    } else {
      res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers,
        body: payload,
        signal,
      });
    }

    const text = await res.text();
    if (!res.ok) {
      this.logger.warn({ status: res.status, model: body.model }, 'openrouter.chat failed');
      throw new Error(`OpenRouter HTTP ${res.status}: ${text.slice(0, 400)}`);
    }

    const json = JSON.parse(text) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('OpenRouter returned empty content');
    }
    return content;
  }
}
