import { describe, expect, it } from 'vitest';
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import { findLastJournalTrack } from './findLastJournalTrack';

function trackItem(id: string, timestamp: number): LiveJournalItem {
  return {
    id,
    kind: 'track',
    timestamp,
    clientEntryId: id,
    moduleId: 'mic',
    moduleName: 'Microphone',
    tags: ['live', 'track'],
    track: {
      schema: 1,
      trackId: `track-${id}`,
      sampleId: `sample-${id}`,
      title: `Track ${id}`,
      durationSec: 3,
      sampleRate: 48_000,
      captureMode: 'auto',
      createdAtIso: new Date(timestamp).toISOString(),
    },
  };
}

describe('findLastJournalTrack', () => {
  it('returns null when no tracks', () => {
    expect(findLastJournalTrack([])).toBeNull();
    expect(
      findLastJournalTrack([
        {
          id: 'r1',
          kind: 'report',
          timestamp: 100,
          clientEntryId: 'r1',
          moduleId: 'mic',
          moduleName: 'Microphone',
          tags: [],
          report: {
            schema: 'drone-v1',
            reportId: 'rep-1',
            trackId: 't1',
            isDetected: false,
            payload: {},
          },
        },
      ]),
    ).toBeNull();
  });

  it('picks the newest track by timestamp', () => {
    const items = [trackItem('a', 100), trackItem('b', 300), trackItem('c', 200)];
    expect(findLastJournalTrack(items)?.id).toBe('b');
  });
});
