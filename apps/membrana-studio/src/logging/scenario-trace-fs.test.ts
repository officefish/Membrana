import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SCENARIO_TRACE_LATEST_FILE, writeScenarioTraceLatest } from './scenario-trace-fs';

vi.mock('./shell-log', () => ({
  writeShellLog: vi.fn(),
}));

describe('writeScenarioTraceLatest', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'membrana-trace-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes latest trace file', async () => {
    const latestPath = writeScenarioTraceLatest(tmpDir, "[INFO] line {runId: 'abc'}");
    expect(latestPath).toBe(path.join(tmpDir, SCENARIO_TRACE_LATEST_FILE));
    const body = await readFile(latestPath, 'utf8');
    expect(body).toContain('line');
  });

  it('archives by runId when provided', async () => {
    writeScenarioTraceLatest(tmpDir, '[INFO] smoke', '092a986c');
    const archive = path.join(tmpDir, 'device-board-trace-092a986c.txt');
    await expect(readFile(archive, 'utf8')).resolves.toContain('smoke');
  });
});
