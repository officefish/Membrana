import { describe, expect, it } from 'vitest';

import { resolveServerFirstBadgeDescriptors } from './server-first-badges.js';
import type { ServerFirstFlags } from './server-first-flags.js';

const baseFlags: ServerFirstFlags = {
  cabinetEditLease: false,
  authority: null,
  followerMode: null,
  blockLocalRun: false,
  allowFieldPause: true,
  allowFieldStop: true,
  allowFieldSetMode: true,
  hideFieldRuntimeControls: false,
};

describe('resolveServerFirstBadgeDescriptors', () => {
  it('field: cabinet edit lease label', () => {
    const badges = resolveServerFirstBadgeDescriptors(
      { ...baseFlags, cabinetEditLease: true },
      'field',
    );
    expect(badges).toHaveLength(1);
    expect(badges[0]?.label).toBe('Редактирует кабинет');
  });

  it('cabinet: edit lease shows Вы редактируете', () => {
    const badges = resolveServerFirstBadgeDescriptors(
      { ...baseFlags, cabinetEditLease: true },
      'cabinet',
    );
    expect(badges[0]?.label).toBe('Вы редактируете');
  });

  it('field: soft capture badge', () => {
    const badges = resolveServerFirstBadgeDescriptors(
      {
        ...baseFlags,
        authority: 'cabinet',
        followerMode: 'soft',
        blockLocalRun: true,
      },
      'field',
    );
    expect(badges.some((b) => b.label === 'Захват: мягкий')).toBe(true);
  });

  it('field: strict capture badge uses warning style', () => {
    const badges = resolveServerFirstBadgeDescriptors(
      {
        ...baseFlags,
        authority: 'cabinet',
        followerMode: 'strict',
        blockLocalRun: true,
        hideFieldRuntimeControls: true,
      },
      'field',
    );
    const strict = badges.find((b) => b.key === 'capture-strict');
    expect(strict?.label).toBe('Захват: строгий');
    expect(strict?.className).toContain('badge-warning');
  });

  it('cabinet perspective omits capture follower badges', () => {
    const badges = resolveServerFirstBadgeDescriptors(
      {
        ...baseFlags,
        authority: 'cabinet',
        followerMode: 'soft',
        blockLocalRun: true,
      },
      'cabinet',
    );
    expect(badges).toHaveLength(0);
  });
});
