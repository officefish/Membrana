import { describe, expect, it } from 'vitest';

import {
  classifyOperativePath,
  pathPriorityBoost,
  parseDateFromArchivePath,
} from './path-filters.js';

describe('path-filters', () => {
  it('classifies P0 daily artifacts', () => {
    expect(classifyOperativePath('docs/DAILY_CODE_REVIEW.md')).toBe('P0');
    expect(classifyOperativePath('docs/MAIN_DAY_ISSUE.md')).toBe('P0');
  });

  it('classifies P1 archive paths', () => {
    expect(classifyOperativePath('docs/archive/daily-day/2026-06-21/notes.md')).toBe('P1');
  });

  it('parses archive date segments', () => {
    const date = parseDateFromArchivePath('docs/archive/daily-day/2026-06-21/foo.md');
    expect(date?.toISOString()).toContain('2026-06-21');
  });

  it('orders P0 boost above P3', () => {
    expect(pathPriorityBoost('P0')).toBeGreaterThan(pathPriorityBoost('P3'));
  });
});
