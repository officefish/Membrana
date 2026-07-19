/**
 * Тесты производителя снимка — НА ФИКСТУРАХ Linear-ответов (стабы S1/S4/S5 из
 * team-snapshot-cold-migration/stubs). Сеть в тестах запрещена — это и есть
 * вердикт M2: global.fetch замещается фикстурным диспетчером.
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
  LINEAR_SNAPSHOT_FORMAT,
  LinearSnapshot,
  LinearSnapshotRecord,
  LinearSnapshotSourcePort,
} from './linear-snapshot.types';

const STUBS_DIR = fileURLToPath(
  new URL(
    '../../../../docs/cowork-sprint/cowork-execution-registry/team-snapshot-cold-migration/stubs/',
    import.meta.url,
  ),
);

function loadStub(name: string): { data: unknown } {
  return JSON.parse(readFileSync(join(STUBS_DIR, name), 'utf8'));
}

const CONFIG = { LINEAR_API_KEY: 'test-linear-key' } as AppConfig;

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

  it('полный pull: пагинация идёт до hasNextPage=false, все записи собраны', async () => {
    const source = new LinearSnapshotGraphqlSource(CONFIG);
    const records = await source.pullAllIssues();
    expect(records.map((r) => r.linearId)).toEqual(['DRU-93', 'DRU-120', 'DRU-121']);
    const pullCalls = fetchMock.mock.calls.filter(([, init]) =>
      String((init as RequestInit)?.body ?? '').includes('SnapshotIssues'),
    );
    expect(pullCalls).toHaveLength(2);
  });

  it('маппинг: паспорт из github-attachment, blockedBy/blocking из relations (A2)', async () => {
    const source = new LinearSnapshotGraphqlSource(CONFIG);
    const records = await source.pullAllIssues();
    const byId = new Map(records.map((r) => [r.linearId, r]));

    expect(byId.get('DRU-93')?.githubIssueRefs).toEqual([178]);
    expect(byId.get('DRU-93')?.stateType).toBe('completed');

    const dru120 = byId.get('DRU-120');
    expect(dru120?.blocking).toEqual(['DRU-121']);
    expect(dru120?.blockedBy).toEqual(['DRU-93']);
    expect(dru120?.assignee).toBe('vesnin');
    // A3: делегат по живому API не проверен — производитель честно отдаёт null
    expect(dru120?.delegatedAgent).toBeNull();

    // не-github attachment паспортом не является
    expect(byId.get('DRU-121')?.githubIssueRefs).toEqual([]);
  });

  it('курсор источника — один дешёвый запрос (A6: organization.updatedAt)', async () => {
    const source = new LinearSnapshotGraphqlSource(CONFIG);
    const value = await source.fetchSourceCursor();
    expect(value).toBe('2026-07-19T17:59:00.000Z');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('детерминизм: те же фикстуры → тот же результат бит-в-бит', async () => {
    const source = new LinearSnapshotGraphqlSource(CONFIG);
    const first = await source.pullAllIssues();
    const second = await source.pullAllIssues();
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
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
  it('captureSnapshot: провенанс полон, recordCount сходится, источник = office-batch', async () => {
    const service = new LinearSnapshotService(fixturePort());
    const snapshot = await service.captureSnapshot('manual');
    expect(snapshot.header.format).toBe(LINEAR_SNAPSHOT_FORMAT);
    expect(snapshot.header.source).toBe('office-batch');
    expect(snapshot.header.trigger).toBe('manual');
    expect(snapshot.header.sourceRevision).toBe('cursor-fixture');
    expect(Date.parse(snapshot.header.capturedAt)).not.toBeNaN();
    expect(snapshot.header.recordCount).toBe(snapshot.records.length);
  });

  it('writeSnapshot: снимок адресуем (имя несёт capturedAt), файл — валидный JSON', async () => {
    const service = new LinearSnapshotService(fixturePort());
    const snapshot = await service.captureSnapshot('evening-signal');
    const dir = mkdtempSync(join(tmpdir(), 'linear-snapshot-'));
    const filePath = service.writeSnapshot(snapshot, dir);
    expect(filePath).toContain('linear-snapshot-');
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as LinearSnapshot;
    expect(parsed).toEqual(snapshot);
  });

  it('checkFreshness: оба исхода — свеж и протух (мягкий)', async () => {
    let cursor = 'cursor-fixture';
    const service = new LinearSnapshotService(
      fixturePort({ fetchSourceCursor: async () => cursor }),
    );
    const snapshot = await service.captureSnapshot('manual');
    expect((await service.checkFreshness(snapshot)).fresh).toBe(true);
    cursor = 'cursor-moved-forward';
    const stale = await service.checkFreshness(snapshot);
    expect(stale.fresh).toBe(false);
    expect(stale.snapshotRevision).toBe('cursor-fixture');
    expect(stale.sourceCursor).toBe('cursor-moved-forward');
  });
});

describe('LinearSnapshotTriggerService (триггер отделён от тела)', () => {
  it('сигнатура signal(kind): payload вебхука в тело не попадает по конструкции', () => {
    const service = new LinearSnapshotService(fixturePort());
    const trigger = new LinearSnapshotTriggerService(service);
    // компилируемый контракт: единственный аргумент — род триггера
    expect(trigger.signal.length).toBe(1);
  });

  it('сигналы во время съёмки коалесцируются в одну досъёмку (полный pull покрывает все)', async () => {
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
    const trigger = new LinearSnapshotTriggerService(new LinearSnapshotService(slowPort));

    const first = trigger.signal('webhook');
    const second = trigger.signal('webhook');
    const third = trigger.signal('evening-signal');
    expect(second).toBe(third); // коалесценция: одна очередь, не три съёмки
    release();
    const [a, b] = await Promise.all([first, second]);
    expect(port.pulls).toBe(2); // 1 идущая + 1 досъёмка, не 3
    expect(a.header.recordCount).toBe(1);
    expect(b.header.trigger).toBe('webhook');
  });
});

describe('mapIssueNode: пустые поля источника не валят маппинг', () => {
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
    expect(record.githubIssueRefs).toEqual([]);
  });
});
