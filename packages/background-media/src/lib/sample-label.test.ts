import { describe, expect, it } from 'vitest';

import { normalizeSampleLabel } from './sample-label';

describe('normalizeSampleLabel', () => {
  it('maps manifest kebab-case to prisma enum', () => {
    expect(normalizeSampleLabel('not-drone')).toBe('not_drone');
    expect(normalizeSampleLabel('drone')).toBe('drone');
    expect(normalizeSampleLabel('unknown')).toBe('unlabeled');
  });
});
