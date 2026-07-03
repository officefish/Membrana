/**
 * SC1 (studio-capture-adaptation, консилиум 2026-07-03): при захвате устройства
 * сервером (board.capture, tariff v2) Studio-shell поднимает окно в foreground —
 * оператор видит alert и имеет мгновенный доступ к emergency stop (канон §3.3).
 * В браузере — no-op.
 */
export function notifyStudioCaptureAcquired(): void {
  if (typeof window === 'undefined') return;
  window.electronAPI?.studioShell?.notifyCaptureAcquired();
}

let cachedStudioVersion: string | null = null;

/**
 * SC5: подтянуть версию сборки студии из shell (вызывается на boot клиента).
 * В браузере — no-op; версия остаётся null и handshake шлёт 'web'.
 */
export function prefetchStudioAppVersion(): void {
  if (typeof window === 'undefined') return;
  const port = window.electronAPI?.studioShell;
  if (!port?.getAppVersion) return;
  void port
    .getAppVersion()
    .then((version) => {
      cachedStudioVersion = version;
    })
    .catch(() => {
      // Старый preload без getAppVersion / IPC-сбой — остаёмся 'web'-маркером.
    });
}

/**
 * Маркер клиентской сборки для WS handshake (`clientVersion`): `studio-<semver>`
 * в Electron, `web` в браузере. Cabinet логирует отсутствие/устаревание
 * warning-ом; strict gate — DR6.
 */
export function getClientRuntimeVersion(): string {
  return cachedStudioVersion !== null ? `studio-${cachedStudioVersion}` : 'web';
}

/** @internal unit tests */
export function resetStudioShellPortForTests(): void {
  cachedStudioVersion = null;
}
