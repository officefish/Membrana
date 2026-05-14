import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { fetch as undiciFetch, ProxyAgent } from 'undici';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import type {
  ClaudeAskBody,
  ClaudeAskResponse,
  ClaudeChatMessage,
} from '../../types/claude.types';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  defaultModel(): string {
    return this.config.ANTHROPIC_MODEL?.trim() || 'claude-haiku-4-5-20251001';
  }

  private proxyUrl(): string {
    return (
      this.config.HTTPS_PROXY?.trim() ||
      this.config.HTTP_PROXY?.trim() ||
      ''
    );
  }

  private async postAnthropic(bodyJson: Record<string, unknown>): Promise<{
    ok: boolean;
    status: number;
    text: string;
  }> {
    const headers = {
      'content-type': 'application/json',
      'x-api-key': this.config.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    };
    const body = JSON.stringify(bodyJson);
    const signal = AbortSignal.timeout(60_000);
    const proxy = this.proxyUrl();

    if (proxy) {
      const dispatcher = new ProxyAgent(proxy);
      try {
        const res = await undiciFetch(ANTHROPIC_URL, {
          method: 'POST',
          headers,
          body,
          dispatcher,
          signal,
        });
        const text = await res.text();
        return { ok: res.ok, status: res.status, text };
      } finally {
        try {
          await dispatcher.close();
        } catch {
          /* ignore */
        }
      }
    }

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers,
      body,
      signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  }

  private mapAnthropicError(status: number, text: string): never {
    let requestId: string | undefined;
    try {
      requestId = (JSON.parse(text) as { request_id?: string }).request_id;
    } catch {
      /* ignore */
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      body = { message: text.slice(0, 2000) };
    }
    const payload: Record<string, unknown> = {
      message: typeof body.message === 'string' ? body.message : 'Anthropic API error',
      ...(requestId ? { request_id: requestId } : {}),
    };
    throw new HttpException(payload, status);
  }

  async ask(body: ClaudeAskBody): Promise<ClaudeAskResponse> {
    const model = body.model?.trim() || this.defaultModel();
    const messages = body.messages.map((m: ClaudeChatMessage) => ({
      role: m.role,
      content: [{ type: 'text', text: m.content }],
    }));
    const bodyJson: Record<string, unknown> = {
      model,
      max_tokens: body.max_tokens ?? 4096,
      messages,
    };
    if (body.system?.trim()) {
      bodyJson.system = body.system.trim();
    }

    const { ok, status, text } = await this.postAnthropic(bodyJson);
    if (!ok) {
      this.mapAnthropicError(status, text);
    }
    return this.parseMessagesResponse(text, model);
  }

  async askWithUserText(userText: string): Promise<ClaudeAskResponse> {
    const model = this.defaultModel();
    const bodyJson = {
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: [{ type: 'text', text: userText }] }],
    };
    const { ok, status, text } = await this.postAnthropic(bodyJson);
    if (!ok) {
      this.mapAnthropicError(status, text);
    }
    return this.parseMessagesResponse(text, model);
  }

  private parseMessagesResponse(text: string, model: string): ClaudeAskResponse {
    let json: {
      content?: { type?: string; text?: string }[];
      stop_reason?: string;
      usage?: { input_tokens: number; output_tokens: number };
    };
    try {
      json = JSON.parse(text) as typeof json;
    } catch {
      this.logger.error('Anthropic returned non-JSON success body');
      throw new InternalServerErrorException('Invalid Anthropic response');
    }
    const parts = json.content ?? [];
    let out = parts
      .filter((b) => b?.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n');
    if (!out) out = JSON.stringify(parts, null, 2);
    return {
      text: out,
      model,
      stop_reason: json.stop_reason ?? 'unknown',
      usage: json.usage,
    };
  }
}
