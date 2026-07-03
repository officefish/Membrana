/**
 * CT6 (канон §3.2): last-write-win для конкурирующих run — последний run
 * побеждает, проигравший сценарий останавливается (exec-abort; слышимый
 * выход гасится отдельно через playback registry).
 */

export interface PreemptableRuntime {
  getState(): { readonly isRunning: boolean };
  stop(reason: 'system'): void;
}

/**
 * Останавливает текущий run (если есть) и ждёт его settle.
 * Возвращает true, когда можно загружать и стартовать новый сценарий;
 * false — если конкурентный preempt успел перезапустить runtime раньше.
 */
export async function preemptRunningScenario(
  runtime: PreemptableRuntime,
  runPromise: Promise<void> | undefined,
): Promise<boolean> {
  if (!runtime.getState().isRunning) {
    return true;
  }
  runtime.stop('system');
  await runPromise?.catch(() => undefined);
  return !runtime.getState().isRunning;
}
