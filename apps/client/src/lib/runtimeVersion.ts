/**
 * DR6 (deploy-pipeline-refactor): сверка версии рантайм-протокола клиента и сервера.
 *
 * Клиент собран с `RUNTIME_PROTOCOL_VERSION` из @membrana/core; сервер сообщает свою
 * версию в `/health`. Бизнес-логика индикатора версии держится здесь (вне презентации),
 * чтобы её можно было покрыть юнит-тестами без рендера.
 */
import {
  RUNTIME_PROTOCOL_VERSION,
  evaluateRuntimeCompatibility,
  type RuntimeCompatibility,
} from '@membrana/core';

/** Версия протокола, с которой собран этот клиент. */
export const CLIENT_RUNTIME_PROTOCOL_VERSION = RUNTIME_PROTOCOL_VERSION;

/** Сведения о сервере из `/health`. */
export interface ServerRuntimeInfo {
  version: string;
  protocolVersion: number;
}

export type VersionIndicatorState = 'unknown' | 'ok' | 'update-available' | 'server-outdated';
export type VersionIndicatorTone = 'neutral' | 'success' | 'warning' | 'error';

export interface VersionIndicator {
  state: VersionIndicatorState;
  tone: VersionIndicatorTone;
  /** Короткая подпись для бейджа. */
  label: string;
  /** Развёрнутая подсказка (title/aria). */
  title: string;
  appVersion: string;
  serverVersion: string | null;
  compatibility: RuntimeCompatibility;
}

/** Безопасно разобрать ответ `/health` сервера. Возвращает null при неверной форме. */
export function parseServerHealth(raw: unknown): ServerRuntimeInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const version = typeof obj.version === 'string' ? obj.version : null;
  const protocolVersion =
    typeof obj.protocolVersion === 'number' ? obj.protocolVersion : null;
  if (version === null || protocolVersion === null) return null;
  return { version, protocolVersion };
}

/** Запросить `/health` сервера кабинета. fetchImpl инжектируется для тестов. */
export async function fetchServerRuntime(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ServerRuntimeInfo | null> {
  const url = `${baseUrl.replace(/\/+$/, '')}/health`;
  try {
    const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return parseServerHealth(await res.json());
  } catch {
    return null;
  }
}

/**
 * Чистая функция состояния индикатора версии. Без сети/DOM — основной объект тестов.
 */
export function computeVersionIndicator(
  appVersion: string,
  server: ServerRuntimeInfo | null,
  clientProtocol: number = CLIENT_RUNTIME_PROTOCOL_VERSION,
): VersionIndicator {
  const compatibility = evaluateRuntimeCompatibility(
    server ? server.protocolVersion : Number.NaN,
    clientProtocol,
  );
  const serverVersion = server ? server.version : null;
  const base = { appVersion, serverVersion, compatibility };

  if (!compatibility.known) {
    return {
      ...base,
      state: 'unknown',
      tone: 'neutral',
      label: `v${appVersion}`,
      title: `Версия приложения v${appVersion}. Версия сервера неизвестна.`,
    };
  }
  if (compatibility.updateAvailable) {
    return {
      ...base,
      state: 'update-available',
      tone: 'warning',
      label: 'Доступно обновление',
      title: `Сервер использует протокол v${compatibility.serverVersion}, приложение — v${compatibility.clientVersion}. Обновите приложение.`,
    };
  }
  if (compatibility.serverOutdated) {
    return {
      ...base,
      state: 'server-outdated',
      tone: 'error',
      label: 'Сервер устарел',
      title: `Приложение использует протокол v${compatibility.clientVersion}, сервер — v${compatibility.serverVersion}.`,
    };
  }
  return {
    ...base,
    state: 'ok',
    tone: 'success',
    label: `v${appVersion}`,
    title: `Версия приложения v${appVersion}. Протокол v${compatibility.clientVersion} совместим с сервером.`,
  };
}
