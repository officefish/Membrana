import { describe, expect, it } from 'vitest';
import { NIGHT_HUNT_JOBS, getNightHuntJob, nightHuntOutputPath } from './night-hunt-jobs';

describe('night-hunt-jobs', () => {
  it('has three pilot jobs', () => {
    expect(NIGHT_HUNT_JOBS).toHaveLength(3);
  });

  it('resolves job by id', () => {
    expect(getNightHuntJob('design-token-drift')?.outputSlug).toBe('design-drift');
  });

  it('builds output path under night-hunt', () => {
    expect(nightHuntOutputPath('design-drift', '2026-26')).toBe(
      'docs/seanses/night-hunt/design-drift-2026-26.md',
    );
  });
});
