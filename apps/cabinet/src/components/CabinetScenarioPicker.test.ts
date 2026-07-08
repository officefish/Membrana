import { describe, expect, it } from 'vitest';

import type { BoardScenarioListItem } from '@membrana/core';

import { canSelect } from './CabinetScenarioPicker';

describe('CabinetScenarioPicker.canSelect (csp-5)', () => {
  const item = (over: Partial<BoardScenarioListItem>): BoardScenarioListItem => ({
    id: 'x',
    title: 'X',
    ...over,
  });

  it('пользовательский сценарий всегда выбираем', () => {
    expect(canSelect(item({ kind: 'user' }))).toBe(true);
    expect(canSelect(item({}))).toBe(true); // отсутствие kind = user
  });

  it('системный bundled/entitled/community — выбираем', () => {
    expect(canSelect(item({ kind: 'system', entitlement: 'bundled' }))).toBe(true);
    expect(canSelect(item({ kind: 'system', entitlement: 'entitled' }))).toBe(true);
    expect(canSelect(item({ kind: 'system', entitlement: 'community' }))).toBe(true);
  });

  it('системный locked — НЕ выбираем (апселл)', () => {
    expect(canSelect(item({ kind: 'system', entitlement: 'locked' }))).toBe(false);
  });
});
