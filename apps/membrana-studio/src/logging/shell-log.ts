import log from 'electron-log/main';
import path from 'node:path';

import { scrubLogMessage } from './shell-log-scrub';
import type { ShellLogLevel, ShellLogProcess } from './types';

const SHELL_LOG_MAX_BYTES = 5 * 1024 * 1024;
const SHELL_LOG_PREFIX = 'shell-';

let logsDirPath = '';

function shellLogFileName(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${SHELL_LOG_PREFIX}${date}.log`;
}

/**
 * Configure electron-log M1 transport under `{userData}/logs/shell-YYYY-MM-DD.log`.
 * Call once from main before other subsystems.
 */
export function initShellLog(userDataRoot: string, isDev: boolean): typeof log {
  logsDirPath = path.join(userDataRoot, 'logs');

  log.transports.file.resolvePathFn = () => path.join(logsDirPath, shellLogFileName());
  log.transports.file.maxSize = SHELL_LOG_MAX_BYTES;
  log.transports.file.level = 'info';
  log.transports.console.level = isDev ? 'debug' : 'info';

  log.info('[main] shell log ready', { userData: userDataRoot, logsDir: logsDirPath });
  return log;
}

export function getShellLogsDir(): string {
  return logsDirPath;
}

/** Write one M1 line from main or IPC handler. */
export function writeShellLog(
  level: ShellLogLevel,
  process: ShellLogProcess,
  message: string,
  meta?: Record<string, unknown>,
): void {
  const safe = scrubLogMessage(message);
  const payload = meta && Object.keys(meta).length > 0 ? { ...meta, process } : { process };
  log[level](`[${process}] ${safe}`, payload);
}
