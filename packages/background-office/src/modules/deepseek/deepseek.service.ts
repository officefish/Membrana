import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';

// Прямой URL без прокси-логики (ADR 0005): ценность канала — независимость
// от прокси-инфраструктуры, через которую ходит ClaudeService.
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.DEEPSEEK_API_KEY?.trim());
  }

  defaultModel(): string {
    return this.config.DEEPSEEK_MODEL?.trim() || 'deepseek-chat';
  }

  /**
   * Fallback-канал нарратива ночных агентов (ADR 0005). OpenAI-совместимый
   * chat-completions; вызывается потребителем только после отказа Claude.
   */
  async chat(prompt: string, maxTokens = 4_096): Promise<string> {
    const apiKey = this.config.DEEPSEEK_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    const body = {
      model: this.defaultModel(),
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    };

    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    const text = await res.text();
    if (!res.ok) {
      this.logger.warn({ status: res.status }, 'deepseek.chat failed');
      throw new Error(`DeepSeek HTTP ${res.status}: ${text.slice(0, 400)}`);
    }

    const json = JSON.parse(text) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('DeepSeek returned empty content');
    }
    return content;
  }
}
