/**
 * Тесты office-потребителя снимка — порт media за фикстурой (сети нет).
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../config/env.schema';
import { LinearSnapshotService } from './linear-snapshot.service';
import { LinearSnapshotTriggerService } from './linear-snapshot.trigger';
import { MediaSnapshotClient } from './media-snapshot.client';
import {
  LINEAR_SNAPSHOT_EGRESS_REGION,
  LINEAR_SNAPSHOT_FORMAT,
  LINEAR_SNAPSHOT_MODE,
  LINEAR_SNAPSHOT_PRODUCED_BY,
  type LinearSnapshot,
  type LinearSnapshotCapturePort,
  type LinearSnapshotTrigger,
} from './linear-snapshot.types';

function fixtureSnapshot(trigger: LinearSnapshotTrigger = 'manual'): LinearSnapshot {
  return {
    header: {
      format: LINEAR_SNAPSHOT_FORMAT,
      capturedAt: '2026-07-20T08:00:00.000Z',
      sourceRevision: 'cursor-fixture',
      producedBy: LINEAR_SNAPSHOT_PRODUCED_BY,
      egressRegion: LINEAR_SNAPSHOT_EGRESS_REGION,
      mode: LINEAR_SNAPSHOT_MODE,
      trigger,
      recordCount: 1,
    },
    records: [
      {
        linearId: 'DRU-93',
        state: 'Done',
        stateType: 'completed',
        assignee: 'druid',
        delegatedAgent: null,
        parentId: null,
        blockedBy: [],
        blocking: [],
        githubIssueRefs: [178],
        createdAt: '2026-06-29T10:00:00.000Z',
        updatedAt: '2026-06-29T17:31:52.000Z',
        completedAt: '2026-06-29T17:31:52.000Z',
      },
    ],
  };
}

function fixturePort(overrides?: Partial<LinearSnapshotCapturePort>): LinearSnapshotCapturePort & {
  calls: number;
} {
  const port = {
    calls: 0,
    async capture(trigger: LinearSnapshotTrigger) {
      port.calls += 1;
      return fixtureSnapshot(trigger);
    },
    ...overrides,
  };
  return port;
}

describe('LinearSnapshotService (media port, сети нет)', () => {
  it('captureSnapshot: честная шапка media-NL, без source:office-batch', async () => {
    const service = new LinearSnapshotService(fixturePort());
    const snapshot = await service.captureSnapshot('office-trigger');
    expect(snapshot.header.producedBy).toBe('media-NL');
    expect(snapshot.header.egressRegion).toBe('NL');
    expect(snapshot.header.mode).toBe('batch-full-pull');
    expect(snapshot.header.trigger).toBe('office-trigger');
    expect('source' in snapshot.header).toBe(false);
  });

  it('writeSnapshot: файл валидный JSON', async () => {
    const service = new LinearSnapshotService(fixturePort());
    const snapshot = await service.captureSnapshot('evening-signal');
    const dir = mkdtempSync(join(tmpdir(), 'office-linear-snapshot-'));
    const filePath = service.writeSnapshot(snapshot, dir);
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as LinearSnapshot;
    expect(parsed).toEqual(snapshot);
  });
});

describe('LinearSnapshotTriggerService', () => {
  it('коалесценция сигналов', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const port = fixturePort();
    const slow: LinearSnapshotCapturePort & { calls: number } = {
      get calls() {
        return port.calls;
      },
      async capture(trigger) {
        await gate;
        return port.capture(trigger);
      },
    };
    const trigger = new LinearSnapshotTriggerService(new LinearSnapshotService(slow));
    const first = trigger.signal('webhook');
    const second = trigger.signal('webhook');
    expect(second).toBe(trigger.signal('manual'));
    release();
    await Promise.all([first, second]);
    expect(port.calls).toBe(2);
  });
});

describe('MediaSnapshotClient (fetch stub, сети нет)', () => {
  const CONFIG = {
    MEDIA_API_URL: 'http://media.test:3010',
    API_INTERNAL_TOKEN: 'internal-tok',
  } as AppConfig;

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          snapshot: fixtureSnapshot('office-trigger'),
          pullOk: true,
          filePath: '/data/linear-snapshots/x.json',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('шлёт X-Membrana-Token, не передаёт LINEAR_API_KEY', async () => {
    const client = new MediaSnapshotClient(CONFIG);
    const snapshot = await client.capture('office-trigger');
    expect(snapshot.header.producedBy).toBe('media-NL');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://media.test:3010/v1/linear-snapshots/capture');
    expect(init.headers).toMatchObject({
      'X-Membrana-Token': 'internal-tok',
      'Content-Type': 'application/json',
    });
    expect(String(init.body)).not.toMatch(/LINEAR|api[_-]?key/i);
    expect(String(init.body)).toContain('office-trigger');
  });
});
