import { describe, expect, it } from 'vitest';
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import { compactLiveJournalItems } from './boardTelemetryCompact';

function item(id: string, timestamp: number): LiveJournalItem {
  return { id, timestamp, kind: 'track' } as unknown as LiveJournalItem;
}

describe('compactLiveJournalItems (BTJ2)', () => {
  it('сортирует новые сверху и обрезает до limit', () => {
    const items = [item('a', 100), item('b', 300), item('c', 200)];
    expect(compactLiveJournalItems(items, 2).map((i) => i.id)).toEqual(['b', 'c']);
  });

  it('пустой список → пусто; limit 0 → пусто', () => {
    expect(compactLiveJournalItems([], 5)).toEqual([]);
    expect(compactLiveJournalItems([item('a', 1)], 0)).toEqual([]);
  });

  it('не мутирует исходный массив', () => {
    const items = [item('a', 1), item('b', 2)];
    const copy = [...items];
    compactLiveJournalItems(items, 5);
    expect(items).toEqual(copy);
  });
});
