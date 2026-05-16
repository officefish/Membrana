/** Пропустить вызов, если с прошлого прошло меньше intervalMs. */
export function shouldThrottle(lastAtMs: number, intervalMs: number, nowMs = performance.now()): boolean {
  return nowMs - lastAtMs < intervalMs;
}
