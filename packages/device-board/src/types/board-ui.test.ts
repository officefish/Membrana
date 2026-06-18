import { describe, expect, it } from 'vitest';
import type { ScenarioBlockKind } from '@membrana/core';

import { D0_SCENARIO_NODE_CATALOG } from '../graph/d0-node-catalog.js';
import {
  BRANCH_SIDEBAR_SECTIONS,
  BRANCH_TAB_LABEL,
  SCENARIO_NODE_PALETTE,
  type ScenarioBranchTab,
} from './board-ui.js';

describe('board-ui sidebar sections (MP7b RT6)', () => {
  it('covers every branch exactly once across sections', () => {
    const tabs = BRANCH_SIDEBAR_SECTIONS.flatMap((section) => section.tabs);
    const expected: ScenarioBranchTab[] = [
      'initial',
      'onConnect',
      'main',
      'alarm',
      'onStop',
      'onDisconnect',
      'function',
    ];
    expect([...tabs].sort()).toEqual([...expected].sort());
    expect(tabs.length).toBe(expected.length);
  });

  it('groups sections in the required order (v0.4 DBR3)', () => {
    expect(BRANCH_SIDEBAR_SECTIONS.map((s) => s.title)).toEqual([
      'Обработчики событий',
      'Лупы',
      'Конструктор функций',
    ]);
  });

  it('labels initial branch as On start (presentational, schema key unchanged)', () => {
    expect(BRANCH_TAB_LABEL.initial).toBe('On start');
  });
});

describe('scenario node palette (MP7b RT6)', () => {
  it('exposes every catalog block kind across categories', () => {
    const paletteKinds = new Set(SCENARIO_NODE_PALETTE.flatMap((c) => c.blockKinds));
    const catalogKinds = Object.keys(D0_SCENARIO_NODE_CATALOG) as ScenarioBlockKind[];
    for (const kind of catalogKinds) {
      expect(paletteKinds.has(kind)).toBe(true);
    }
    expect(paletteKinds.size).toBe(catalogKinds.length);
  });
});
