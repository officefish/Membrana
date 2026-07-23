/**
 * Тесты производителя снимка media-NL — НА ФИКСТУРАХ (сеть запрещена).
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../config/env.schema';
import {
  LinearSnapshotGraphqlSource,
  LinearSnapshotService,
  mapIssueNode,
} from './linear-snapshot.service';
import { LinearSnapshotTriggerService } from './linear-snapshot.trigger';
import {
  LINEAR_SNAPSHOT_EGRESS_REGION,
  LINEAR_SNAPSHOT_FORMAT,
  LINEAR_SNAPSHOT_MODE,
  LINEAR_SNAPSHOT_PRODUCED_BY,
  type LinearSnapshot,
  type LinearSnapshotRecord,
  type LinearSnapshotSourcePort,
} from './linear-snapshot.types';
import { pullOk } from './pull-ok';

const STUBS_DIR = fileURLToPath(
  new URL(
    '../../../../docs/cowork-sprint/cowork-execution-registry/team-snapshot-cold-migration/stubs/',
    import.meta.url,
  ),
);

function loadStub(name: string): { data: unknown } {
  return JSON.parse(readFileSync(join(STUBS_DIR, name), 'utf8'));
}

const CONFIG = {
  LINEAR_API_KEY: 'test-linear-key',
  LINEAR_SNAPSHOT_DIR: './data/linear-snapshots',
} as AppConfig;

function gqlResponse(body: { data: unknown }): Response {
  return new Response(JSON.stringify({ data: body.data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('LinearSnapshotGraphqlSource (фикстуры, сети нет)', () => {
  const page1 = loadStub('linear-issues-page-1.fixture.json');
  const page2 = loadStub('linear-issues-page-2.fixture.json');
  const cursor = loadStub('linear-cursor.fixture.json');

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}'));
      const query: string = body.query ?? '';
      if (query.includes('SnapshotCursor')) {
        return gqlResponse(cursor);
      }
      if (query.includes('SnapshotIssues')) {
        return gqlResponse(body.variables?.after ? page2 : page1);
      }
      throw new Error(`неожиданный GraphQL-запрос: ${query.slice(0, 80)}`);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('полный pull: пагинация до hasNextPage=false', async () => {
    const source = new LinearSnapshotGraphqlSource(CONFIG);
    const records = await source.pullAllIssues();
    expect(records.map((r) => r.linearId)).toEqual(['DRU-93', 'DRU-120', 'DRU-121']);
    const pullCalls = fetchMock.mock.calls.filter(([, init]) =>
      String((init as RequestInit)?.body ?? '').includes('SnapshotIssues'),
    );
    expect(pullCalls).toHaveLength(2);
  });

  it('Authorization берёт ключ из env media (не из request body)', async () => {
    const source = new LinearSnapshotGraphqlSource(CONFIG);
    await source.fetchSourceCursor();
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: 'test-linear-key' });
    expect(String(init.body)).not.toContain('test-linear-key');
  });

  it('маппинг: passport / relations / startedAt', async () => {
    const source = new LinearSnapshotGraphqlSource(CONFIG);
    const records = await source.pullAllIssues();
    const byId = new Map(records.map((r) => [r.linearId, r]));
    expect(byId.get('DRU-93')?.githubIssueRefs).toEqual([178]);
    expect(byId.get('DRU-93')?.startedAt).toBeNull();
    expect(byId.get('DRU-120')?.blocking).toEqual(['DRU-121']);
    expect(byId.get('DRU-120')?.assignee).toBe('vesnin');
    expect(byId.get('DRU-120')?.startedAt).toBe('2026-07-19T10:00:00.000Z');
    expect(byId.get('DRU-121')?.startedAt).toBeNull();
  });

  it('GraphQL SnapshotIssues запрашивает startedAt', async () => {
    const source = new LinearSnapshotGraphqlSource(CONFIG);
    await source.pullAllIssues();
    const body = String(
      fetchMock.mock.calls.find(([, init]) =>
        String((init as RequestInit)?.body ?? '').includes('SnapshotIssues'),
      )?.[1]?.body ?? '',
    );
    expect(body).toContain('startedAt');
  });

  it('курсор источника — один дешёвый запрос', async () => {
    const source = new LinearSnapshotGraphqlSource(CONFIG);
    const value = await source.fetchSourceCursor();
    expect(value).toBe('2026-07-19T17:59:00.000Z');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function fixtureRecord(linearId: string): LinearSnapshotRecord {
  return {
    linearId,
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
    startedAt: null,
    completedAt: '2026-06-29T17:31:52.000Z',
  };
}

function fixturePort(overrides?: Partial<LinearSnapshotSourcePort>): LinearSnapshotSourcePort & {
  pulls: number;
} {
  const port = {
    pulls: 0,
    async pullAllIssues() {
      port.pulls += 1;
      return [fixtureRecord('DRU-93')];
    },
    async fetchSourceCursor() {
      return 'cursor-fixture';
    },
    ...overrides,
  };
  return port as LinearSnapshotSourcePort & { pulls: number };
}

describe('LinearSnapshotService (порт за фикстурой)', () => {
  it('captureSnapshot: honest-шапка media-NL + pullOk', async () => {
    const service = new LinearSnapshotService(fixturePort(), CONFIG);
    const snapshot = await service.captureSnapshot('manual');
    expect(snapshot.header.format).toBe(LINEAR_SNAPSHOT_FORMAT);
    expect(snapshot.header.producedBy).toBe(LINEAR_SNAPSHOT_PRODUCED_BY);
    expect(snapshot.header.egressRegion).toBe(LINEAR_SNAPSHOT_EGRESS_REGION);
    expect(snapshot.header.mode).toBe(LINEAR_SNAPSHOT_MODE);
    expect(snapshot.header.trigger).toBe('manual');
    expect(snapshot.header.sourceRevision).toBe('cursor-fixture');
    expect(snapshot.header.recordCount).toBe(snapshot.records.length);
    expect(pullOk(snapshot)).toBe(true);
    expect('source' in snapshot.header).toBe(false);
  });

  it('writeSnapshot: файл — валидный JSON с honest-шапкой', async () => {
    const service = new LinearSnapshotService(fixturePort(), CONFIG);
    const snapshot = await service.captureSnapshot('evening-signal');
    const dir = mkdtempSync(join(tmpdir(), 'linear-snapshot-'));
    const filePath = service.writeSnapshot(snapshot, dir);
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as LinearSnapshot;
    expect(parsed).toEqual(snapshot);
    expect(pullOk(parsed)).toBe(true);
  });

  it('checkFreshness вне pullOk: свеж и протух', async () => {
    let cursor = 'cursor-fixture';
    const service = new LinearSnapshotService(
      fixturePort({ fetchSourceCursor: async () => cursor }),
      CONFIG,
    );
    const snapshot = await service.captureSnapshot('manual');
    expect((await service.checkFreshness(snapshot)).fresh).toBe(true);
    cursor = 'cursor-moved-forward';
    expect((await service.checkFreshness(snapshot)).fresh).toBe(false);
  });
});

describe('LinearSnapshotTriggerService', () => {
  it('сигналы во время съёмки коалесцируются', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const port = fixturePort();
    const slowPort: LinearSnapshotSourcePort & { pulls: number } = {
      get pulls() {
        return port.pulls;
      },
      async pullAllIssues() {
        await gate;
        return port.pullAllIssues();
      },
      fetchSourceCursor: () => port.fetchSourceCursor(),
    } as LinearSnapshotSourcePort & { pulls: number };
    const trigger = new LinearSnapshotTriggerService(
      new LinearSnapshotService(slowPort, CONFIG),
    );

    const first = trigger.signal('webhook');
    const second = trigger.signal('webhook');
    const third = trigger.signal('office-trigger');
    expect(second).toBe(third);
    release();
    const [a, b] = await Promise.all([first, second]);
    expect(port.pulls).toBe(2);
    expect(a.header.recordCount).toBe(1);
    expect(b.header.trigger).toBe('webhook');
  });
});

describe('mapIssueNode', () => {
  it('минимальный узел маппится в честные null/пустые', () => {
    const record = mapIssueNode({
      id: 'uuid-min',
      identifier: 'DRU-1',
      state: null,
      assignee: null,
      parent: null,
      relations: null,
      inverseRelations: null,
      attachments: null,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
      completedAt: null,
    });
    expect(record.state).toBe('unknown');
    expect(record.assignee).toBeNull();
    expect(record.blockedBy).toEqual([]);
  });
});
