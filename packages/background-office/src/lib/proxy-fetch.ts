import { fetch as undiciFetch, ProxyAgent } from 'undici';

/**
 * Исходящий вызов, который читает HTTPS_PROXY (#1449).
 *
 * Грабля, стоившая двух суток 29.07: голый `fetch` в Node не видит `HTTPS_PROXY`,
 * уходит напрямую и получает гео-403, неотличимый на глаз от обрыва связи.
 * Прямой путь к OpenRouter и Anthropic из МСК закрыт по географии — см.
 * `docs/network/HOWTO_REPORT_STATE.md`.
 *
 * Без прокси в окружении поведение совпадает с голым `fetch` — звенья, открытые
 * напрямую (GitHub, DeepSeek), ничего не замечают.
 *
 * НЕ для каналов, чья ценность — независимость от прокси-инфраструктуры:
 * `DeepSeekService` ходит прямым URL сознательно (ADR-0007).
 */

type FetchInit = Parameters<typeof undiciFetch>[1];
type FetchInput = Parameters<typeof undiciFetch>[0];
type FetchResponse = Awaited<ReturnType<typeof undiciFetch>>;

/** Один диспетчер на прокси-URL за процесс: пере-создание на вызов рвёт тело ответа при close(). */
const dispatchers = new Map<string, ProxyAgent>();

/** HTTPS_PROXY приоритетнее HTTP_PROXY; пусто — прокси в окружении не объявлен. */
export function proxyUrlFrom(config: {
  HTTPS_PROXY?: string;
  HTTP_PROXY?: string;
}): string {
  return config.HTTPS_PROXY?.trim() || config.HTTP_PROXY?.trim() || '';
}

export function dispatcherFor(proxyUrl: string): ProxyAgent | undefined {
  if (!proxyUrl) return undefined;
  let dispatcher = dispatchers.get(proxyUrl);
  if (!dispatcher) {
    dispatcher = new ProxyAgent(proxyUrl);
    dispatchers.set(proxyUrl, dispatcher);
  }
  return dispatcher;
}

export async function proxyAwareFetch(
  url: FetchInput,
  init: FetchInit,
  proxyUrl: string,
): Promise<FetchResponse> {
  const dispatcher = dispatcherFor(proxyUrl);
  return dispatcher ? undiciFetch(url, { ...init, dispatcher }) : undiciFetch(url, init);
}

/** Тестовый шов: диспетчеры живут за процесс, между кейсами их надо отпускать. */
export async function resetProxyDispatchers(): Promise<void> {
  const live = [...dispatchers.values()];
  dispatchers.clear();
  await Promise.all(
    live.map((d) =>
      d.close().catch(() => {
        /* закрытие best-effort */
      }),
    ),
  );
}
