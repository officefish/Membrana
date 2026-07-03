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
