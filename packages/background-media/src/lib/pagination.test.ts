import { describe, expect, it } from 'vitest';

import { buildPageMeta, parseSamplesPageQuery } from './pagination';

describe('parseSamplesPageQuery', () => {
  it('defaults to page 1 and limit 40', () => {
    expect(parseSamplesPageQuery()).toEqual({ page: 1, limit: 40, skip: 0 });
  });

  it('clamps limit to max 100', () => {
    expect(parseSamplesPageQuery('2', '500')).toEqual({ page: 2, limit: 100, skip: 100 });
  });
});

describe('buildPageMeta', () => {
  it('computes totalPages', () => {
    expect(buildPageMeta(120, 1, 40)).toEqual({
      page: 1,
      limit: 40,
      total: 120,
      totalPages: 3,
    });
  });
});
