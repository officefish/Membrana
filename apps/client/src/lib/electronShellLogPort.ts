import { getRuntimeStorageMode } from './runtimeStorageMode';

type ShellLogLevel = 'debug' | 'info' | 'warn' | 'error';

function getShellLogPort():
  | {
      write: (level: ShellLogLevel, process: string, message: string) => Promise<void>;
      getLogsDir: () => Promise<string>;
    }
  | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.electronAPI?.shellLog;
}

/** Forward one line to M1 shell log (no-op in browser). */
export function writeElectronShellLog(
  level: ShellLogLevel,
  message: string,
  process = 'renderer',
): void {
  const port = getShellLogPort();
  if (!port) return;
  void port.write(level, process, message);
}

/** Boot marker — called once when renderer starts in Studio shell. */
export function initElectronShellLogBoot(): void {
  if (getRuntimeStorageMode() !== 'electron-system-files') return;
  writeElectronShellLog('info', 'renderer boot');
}
