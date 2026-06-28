import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';

import { getShellLogsDir, writeShellLog } from './shell-log';
import { writeScenarioTraceLatest } from './scenario-trace-fs';
import type { ShellLogLevel, ShellLogProcess } from './types';

const PREFIX = 'membrana:logging';

const LEVELS = new Set<ShellLogLevel>(['debug', 'info', 'warn', 'error']);
const PROCESSES = new Set<ShellLogProcess>(['main', 'renderer', 'preload']);

function parseLevel(value: unknown): ShellLogLevel {
  if (typeof value === 'string' && LEVELS.has(value as ShellLogLevel)) {
    return value as ShellLogLevel;
  }
  return 'info';
}

function parseProcess(value: unknown): ShellLogProcess {
  if (typeof value === 'string' && PROCESSES.has(value as ShellLogProcess)) {
    return value as ShellLogProcess;
  }
  return 'renderer';
}

export function registerLoggingIpc(): void {
  ipcMain.handle(`${PREFIX}:write`, (_event, level: unknown, process: unknown, message: unknown) => {
    if (typeof message !== 'string' || message.length === 0) {
      return;
    }
    writeShellLog(parseLevel(level), parseProcess(process), message);
  });

  ipcMain.handle(`${PREFIX}:getLogsDir`, () => getShellLogsDir());

  ipcMain.on(`${PREFIX}:flushScenarioTrace`, (_event, text: unknown, runId: unknown) => {
    if (typeof text !== 'string' || text.length === 0) {
      return;
    }
    const id = typeof runId === 'string' && runId.length > 0 ? runId : null;
    writeScenarioTraceLatest(getShellLogsDir(), text, id);
  });
}

export function attachWindowShellLogging(win: BrowserWindow): void {
  const wc = win.webContents;

  wc.on('render-process-gone', (_event, details) => {
    writeShellLog('error', 'main', 'render-process-gone', {
      reason: details.reason,
      exitCode: details.exitCode,
    });
  });

  wc.on('unresponsive', () => {
    writeShellLog('warn', 'main', 'renderer unresponsive');
  });

  wc.on('responsive', () => {
    writeShellLog('info', 'main', 'renderer responsive');
  });
}
