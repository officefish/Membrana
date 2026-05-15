import { describe, expect, it } from 'vitest';
import type { TelemetryEntry } from '@membrana/telemetry-service';

import { matchesTagFilter } from './matchesTagFilter';

function entry(tags: string[]): TelemetryEntry {
  return {
    schemaVersion: 1,
    id: '1',
    timestamp: 0,
    type: 'analysis',
    moduleId: 'm',
    moduleName: 'n',
    data: {},
    tags,
  };
}

describe('matchesTagFilter', () => {
  it('all пропускает любую запись', () => {
    expect(matchesTagFilter(entry([]), 'all')).toBe(true);
  });

  it('detection требует тег detection', () => {
    expect(matchesTagFilter(entry(['analysis', 'detection']), 'detection')).toBe(true);
    expect(matchesTagFilter(entry(['analysis', 'clear']), 'detection')).toBe(false);
  });

  it('clear требует тег clear', () => {
    expect(matchesTagFilter(entry(['analysis', 'clear']), 'clear')).toBe(true);
    expect(matchesTagFilter(entry(['detection']), 'clear')).toBe(false);
  });

  it('analysis требует тег analysis', () => {
    expect(matchesTagFilter(entry(['analysis']), 'analysis')).toBe(true);
    expect(matchesTagFilter(entry(['event']), 'analysis')).toBe(false);
  });
});
