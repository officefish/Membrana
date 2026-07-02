import { describe, expect, it } from 'vitest';

import { resolveServerFirstBadgeDescriptors } from './server-first-badges.js';
import type { ServerFirstFlags } from './server-first-flags.js';

const baseFlags: ServerFirstFlags = {
  cabinetEditLease: false,
  authority: null,
  followerMode: null,
  capturedByCabinet: false,
  captureMode: null,
  captureConnectionLost: false,
  recentlyReleased: false,
  blockLocalRun: false,
  allowFieldPause: true,
  allowFieldStop: true,
  allowFieldSetMode: true,
  hideFieldRuntimeControls: false,
  blockStructureEdit: false,
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

  it('capture v2 hard: warning badge + «Соединение потеряно» при разрыве WS (CT5)', () => {
    const badges = resolveServerFirstBadgeDescriptors(
      {
        ...baseFlags,
        capturedByCabinet: true,
        captureMode: 'hard',
        captureConnectionLost: true,
        authority: 'cabinet',
      },
      'field',
    );
    const hard = badges.find((b) => b.key === 'capture-hard');
    expect(hard?.label).toBe('Захват: жёсткий');
    expect(hard?.className).toContain('badge-warning');
    const lost = badges.find((b) => b.key === 'capture-connection-lost');
    expect(lost?.label).toBe('Соединение потеряно');
  });

  it('capture v2 подавляет v1 authority badge; на кабинете видно «Захвачено»', () => {
    const fieldBadges = resolveServerFirstBadgeDescriptors(
      {
        ...baseFlags,
        capturedByCabinet: true,
        captureMode: 'soft',
        authority: 'cabinet',
        followerMode: 'soft',
      },
      'field',
    );
    expect(fieldBadges.some((b) => b.key === 'capture-soft')).toBe(false);
    expect(fieldBadges.some((b) => b.key === 'capture-soft-v2')).toBe(true);

    const cabinetBadges = resolveServerFirstBadgeDescriptors(
      { ...baseFlags, capturedByCabinet: true, captureMode: 'soft', authority: 'cabinet' },
      'cabinet',
    );
    expect(cabinetBadges[0]?.label).toBe('Захвачено: мягкий');
  });

  it('после release поле видит badge «Отпущено»', () => {
    const badges = resolveServerFirstBadgeDescriptors(
      { ...baseFlags, recentlyReleased: true },
      'field',
    );
    expect(badges.some((b) => b.key === 'capture-released')).toBe(true);
    expect(
      resolveServerFirstBadgeDescriptors({ ...baseFlags, recentlyReleased: true }, 'cabinet'),
    ).toHaveLength(0);
  });
});
