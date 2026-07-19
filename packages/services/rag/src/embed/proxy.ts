/**
 * Общий резолвер HTTP(S)_PROXY для эмбеддеров RAG (#593 / #425).
 * Без прокси-переменных → null → прямой fetch (office и чистые сети).
 */
export function resolveProxyUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.HTTPS_PROXY?.trim() || env.HTTP_PROXY?.trim() || null;
}
