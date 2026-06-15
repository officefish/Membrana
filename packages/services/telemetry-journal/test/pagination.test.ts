import { describe, expect, it } from 'vitest';

import {
  LIVE_JOURNAL_PAGE_SIZE,
  countLiveJournalPages,
  decodeLiveJournalCursor,
  encodeLiveJournalCursor,
  paginateLiveJournalItems,
  sliceLiveJournalPage,
} from '../src/pagination.js';
import type { LiveJournalItem } from '../src/types.js';

function item(
  id: string,
  kind: LiveJournalItem['kind'],
  timestamp: number,
  clientEntryId: string,
): LiveJournalItem {
  return {
    id,
    kind,
    timestamp,
    clientEntryId,
    moduleId: 'microphone',
    moduleName: 'microphone',
    tags: kind === 'track' ? ['live', 'track'] : ['live', 'report'],
    ...(kind === 'track'
      ? {
          track: {
            schema: 'telemetry-track/v1',
            trackId: id,
            sampleId: `sample-${id}`,
            title: `track-${id}`,
            durationSec: 5,
            sampleRate: 48_000,
            captureMode: 'auto' as const,
            createdAtIso: new Date(timestamp).toISOString(),
          },
        }
      : {
          report: {
            schema: 'drone-detection-report/v1',
            reportId: id,
            trackId: 't1',
            isDetected: false,
            payload: {},
          },
        }),
  };
}

describe('live journal pagination', () => {
  it('returns at most LIVE_JOURNAL_PAGE_SIZE items', () => {
    const rows = Array.from({ length: 80 }, (_, index) =>
      item(`row-${index}`, index % 2 === 0 ? 'track' : 'report', 1_000_000 - index, `ce-${index}`),
    );

    const page = paginateLiveJournalItems(rows);
    expect(page.items).toHaveLength(LIVE_JOURNAL_PAGE_SIZE);
    expect(page.nextCursor).not.toBeNull();
  });

  it('filters tracks before pagination', () => {
    const rows = [
      item('t1', 'track', 300, 'ce-t1'),
      item('r1', 'report', 200, 'ce-r1'),
      item('t2', 'track', 100, 'ce-t2'),
    ];

    const page = paginateLiveJournalItems(rows, { filter: 'tracks', limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.kind).toBe('track');
    expect(page.items[0]?.id).toBe('t1');
  });

  it('uses cursor for next page', () => {
    const rows = [
      item('a', 'track', 300, 'ce-a'),
      item('b', 'report', 200, 'ce-b'),
      item('c', 'track', 100, 'ce-c'),
    ];
    const first = paginateLiveJournalItems(rows, { limit: 1 });
    const second = paginateLiveJournalItems(rows, { limit: 1, cursor: first.nextCursor });
    expect(first.items[0]?.id).toBe('a');
    expect(second.items[0]?.id).toBe('b');
  });

  it('encodes and decodes cursor', () => {
    const encoded = encodeLiveJournalCursor({ timestamp: 123, clientEntryId: 'live-track/abc' });
    expect(decodeLiveJournalCursor(encoded)).toEqual({
      timestamp: 123,
      clientEntryId: 'live-track/abc',
    });
  });

  it('slices pages for client-side pager', () => {
    const rows = Array.from({ length: 55 }, (_, index) =>
      item(`row-${index}`, 'track', index, `ce-${index}`),
    );
    expect(sliceLiveJournalPage(rows, 0)).toHaveLength(LIVE_JOURNAL_PAGE_SIZE);
    expect(sliceLiveJournalPage(rows, 1)).toHaveLength(5);
    expect(countLiveJournalPages(rows.length)).toBe(2);
  });
});
