import { getScenarioTraceContext } from '@/modules/device-board/scenarioTraceContext';
import { getScenarioTraceText } from '@/modules/device-board/scenarioTraceBuffer';

import { getRuntimeStorageMode } from './runtimeStorageMode';

/** Flush in-memory T1 buffer to `%APPDATA%/Membrana/logs/` (Studio shell only). */
export function persistScenarioTraceToDisk(runId?: string | null): void {
  if (getRuntimeStorageMode() !== 'electron-system-files') {
    return;
  }
  const text = getScenarioTraceText();
  if (text.length === 0) {
    return;
  }
  const port = window.electronAPI?.shellLog;
  if (!port?.flushScenarioTrace) {
    return;
  }
  const id = runId ?? getScenarioTraceContext().runId;
  port.flushScenarioTrace(text, id);
}

/** Best-effort flush before window unload (crash / quit). */
export function initElectronScenarioTracePersist(): void {
  if (getRuntimeStorageMode() !== 'electron-system-files') {
    return;
  }
  window.addEventListener('beforeunload', () => {
    persistScenarioTraceToDisk();
  });
}
