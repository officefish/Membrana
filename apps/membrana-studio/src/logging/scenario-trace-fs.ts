import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { writeShellLog } from './shell-log';

export const SCENARIO_TRACE_LATEST_FILE = 'device-board-trace-latest.txt';

/**
 * Persist T1 scenario trace to `{logsDir}/device-board-trace-latest.txt`.
 * Optionally archives `device-board-trace-{runId}.txt` when runId is set.
 */
export function writeScenarioTraceLatest(
  logsDir: string,
  text: string,
  runId?: string | null,
): string {
  mkdirSync(logsDir, { recursive: true });
  const normalized = text.endsWith('\n') ? text : `${text}\n`;
  const latestPath = path.join(logsDir, SCENARIO_TRACE_LATEST_FILE);
  writeFileSync(latestPath, normalized, 'utf8');

  if (runId !== null && runId !== undefined && runId.length > 0) {
    const archivePath = path.join(logsDir, `device-board-trace-${runId}.txt`);
    writeFileSync(archivePath, normalized, 'utf8');
  }

  const lineCount = normalized.split('\n').filter((line) => line.length > 0).length;
  writeShellLog('info', 'main', `scenario trace flushed (${lineCount} lines)`, { runId: runId ?? null });

  return latestPath;
}
