import { fetch as undiciFetch, ProxyAgent } from 'undici';

import type { RagConfig } from '../config.js';
import type { Embedder } from './types.js';

/**
 * Voyage AI embeddings — второй провайдер слота `RagEmbeddingProvider` (Issue #425).
 * API структурно совместим с OpenAI embeddings (data[].embedding), но живёт на
 * своём URL и своих моделях. Размерность фиксируется моделью — смена модели или
 * провайдера требует пересборки индекса (`yarn rag:index --full`).
 */

const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';

/** Размерности known-моделей; для незнакомой модели берём 1024 (стандарт voyage-3-семейства). */
const MODEL_DIMENSIONS: Record<string, number> = {
  'voyage-3.5': 1024,
  'voyage-3.5-lite': 1024,
  'voyage-3-large': 1024,
  'voyage-code-3': 1024,
};

const DEFAULT_DIMENSIONS = 1024;

interface VoyageEmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
  detail?: string;
}

/** Ключ: канонический VOYAGE_API_KEY, допускаем VOYAGEAI_API_KEY (имя из .env владельца). */
export function resolveVoyageApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.VOYAGE_API_KEY?.trim() || env.VOYAGEAI_API_KEY?.trim() || null;
}

/**
 * Опциональный прокси (паттерн ClaudeService в background-office): прямой TLS-хендшейк
 * Node к api.voyageai.com режется DPI по отпечатку (живая проверка 2026-07-13: curl/PS
 * проходят, Node — 403 HTML), через прокси API отвечает нормально. Без прокси-переменных
 * остаётся global fetch — прямой путь (office и чистые сети).
 */
export function resolveProxyUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.HTTPS_PROXY?.trim() || env.HTTP_PROXY?.trim() || null;
}

const MAX_RETRIES_429 = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

/** Пауза перед повтором: Retry-After сервера, иначе экспонента 2/4/8/16с. */
export function retryDelayMs(attempt: number, retryAfterHeader: string | null): number {
  const retryAfter = Number(retryAfterHeader);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  return 2 ** (attempt + 1) * 1000;
}

export function createVoyageEmbedder(
  config: RagConfig,
  env: NodeJS.ProcessEnv = process.env,
): Embedder {
  const apiKey = resolveVoyageApiKey(env);
  if (!apiKey) {
    throw new Error('VOYAGE_API_KEY (или VOYAGEAI_API_KEY) is required for embedding (set in .env)');
  }

  const proxyUrl = resolveProxyUrl(env);
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

  return {
    dimensions: MODEL_DIMENSIONS[config.embeddingModel] ?? DEFAULT_DIMENSIONS,
    async embedTexts(texts: readonly string[]): Promise<number[][]> {
      if (texts.length === 0) {
        return [];
      }

      const init = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.embeddingModel,
          input: [...texts],
        }),
      };
      const doFetch = async () =>
        dispatcher ? undiciFetch(VOYAGE_URL, { ...init, dispatcher }) : fetch(VOYAGE_URL, init);

      // 429 (аккаунт без платёжного метода = 3 RPM/10K TPM) → повтор с паузой,
      // а не смерть всего индекса на середине.
      let response = await doFetch();
      for (let attempt = 0; response.status === 429 && attempt < MAX_RETRIES_429; attempt++) {
        await sleep(retryDelayMs(attempt, response.headers?.get?.('retry-after') ?? null));
        response = await doFetch();
      }

      const raw = await response.text();
      let payload: VoyageEmbeddingResponse;
      try {
        payload = JSON.parse(raw) as VoyageEmbeddingResponse;
      } catch {
        // WAF/гео-заслон отдаёт HTML — показываем статус и сниппет, а не SyntaxError.
        throw new Error(`Voyage embeddings HTTP ${response.status}: non-JSON response: ${raw.slice(0, 200)}`);
      }
      if (!response.ok) {
        throw new Error(payload.detail ?? `Voyage embeddings HTTP ${response.status}`);
      }

      const rows = payload.data ?? [];
      return rows.map((row, index) => {
        const embedding = row.embedding;
        if (!embedding || embedding.length === 0) {
          throw new Error(`Voyage embeddings: missing vector at index ${index}`);
        }
        return embedding;
      });
    },
  };
}
