/**
 * Маршруты провайдеров снов (M5 / night NB2).
 * deepseek — прямой канал; остальные — OpenRouter model id (через media/HTTPS proxy на office).
 * Не трогает API dreams-select — только имена из DREAM_PROVIDERS.
 */

/** @type {Readonly<Record<string, { channel: 'deepseek'|'openrouter', model?: string }>>} */
export const DREAM_PROVIDER_ROUTES = Object.freeze({
  deepseek: { channel: 'deepseek' },
  perplexity: { channel: 'openrouter', model: 'perplexity/sonar' },
  grok: { channel: 'openrouter', model: 'x-ai/grok-4-fast' },
  gemini: { channel: 'openrouter', model: 'google/gemini-2.0-flash-001' },
});

/**
 * @param {string} provider
 * @returns {{ channel: 'deepseek'|'openrouter', model?: string } | null}
 */
export function routeDreamProvider(provider) {
  return DREAM_PROVIDER_ROUTES[provider] ?? null;
}

/**
 * Исход «канал не сконфигурирован» — класс, на котором tick делает failover.
 * @param {string} provider
 * @param {string} detail
 */
export function providerUnavailableResult(provider, detail) {
  return {
    ok: false,
    status: 503,
    bodyText: `provider ${provider} unavailable: ${detail}`,
    error: detail,
  };
}
