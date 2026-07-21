import { describe, expect, it } from 'vitest';
import { hasFullHeader, pullOk } from './pull-ok';
import {
  LINEAR_SNAPSHOT_EGRESS_REGION,
  LINEAR_SNAPSHOT_FORMAT,
  LINEAR_SNAPSHOT_MODE,
  LINEAR_SNAPSHOT_PRODUCED_BY,
  type LinearSnapshot,
} from './linear-snapshot.types';

function makeSnapshot(overrides?: {
  header?: Partial<LinearSnapshot['header']>;
  records?: LinearSnapshot['records'];
}): LinearSnapshot {
  const records = overrides?.records ?? [
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
  ];
  return {
    header: {
      format: LINEAR_SNAPSHOT_FORMAT,
      capturedAt: '2026-07-20T08:00:00.000Z',
      sourceRevision: 'cursor-2026-07-20T07:59:00.000Z',
      producedBy: LINEAR_SNAPSHOT_PRODUCED_BY,
      egressRegion: LINEAR_SNAPSHOT_EGRESS_REGION,
      mode: LINEAR_SNAPSHOT_MODE,
      trigger: 'office-trigger',
      recordCount: records.length,
      ...overrides?.header,
    },
    records,
  };
}

describe('pullOk (offline, no network)', () => {
  it('полный honest-шапка media-NL + сверка recordCount → true', () => {
    expect(pullOk(makeSnapshot())).toBe(true);
    expect(hasFullHeader(makeSnapshot())).toBe(true);
  });

  it('чужой producedBy → false', () => {
    expect(
      pullOk(makeSnapshot({ header: { producedBy: 'office-MSK' as never } })),
    ).toBe(false);
  });

  it('чужой egressRegion → false', () => {
    expect(pullOk(makeSnapshot({ header: { egressRegion: 'RU' as never } }))).toBe(
      false,
    );
  });

  it('пустой sourceRevision → false', () => {
    expect(pullOk(makeSnapshot({ header: { sourceRevision: '' } }))).toBe(false);
  });

  it('mode ≠ batch-full-pull → false', () => {
    expect(pullOk(makeSnapshot({ header: { mode: 'webhook-delta' as never } }))).toBe(
      false,
    );
  });

  it('recordCount ≠ |B| → false', () => {
    expect(pullOk(makeSnapshot({ header: { recordCount: 99 } }))).toBe(false);
  });

  it('legacy source: office-batch без producedBy → false', () => {
    const legacy = {
      header: {
        format: LINEAR_SNAPSHOT_FORMAT,
        capturedAt: '2026-07-19T18:00:00.000Z',
        sourceRevision: 'cursor',
        source: 'office-batch',
        trigger: 'manual',
        recordCount: 0,
      },
      records: [],
    };
    expect(pullOk(legacy)).toBe(false);
  });

  it('детерминизм: тот же вход → тот же выход (нет Date.now в теле)', () => {
    const s = makeSnapshot();
    expect(pullOk(s)).toBe(pullOk(JSON.parse(JSON.stringify(s))));
  });
});
