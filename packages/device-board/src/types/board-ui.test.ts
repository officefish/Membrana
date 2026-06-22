import { describe, expect, it } from 'vitest';
import type { ScenarioBlockKind } from '@membrana/core';

import { D0_SCENARIO_NODE_CATALOG } from '../graph/d0-node-catalog.js';
import { V04_PALETTE_NODE_KINDS } from '../graph/palette-node.js';
import {
  BRANCH_SIDEBAR_SECTIONS,
  BRANCH_SCENARIO_TITLE,
  BRANCH_TAB_LABEL,
  isLegacyPaletteEnabled,
  LEGACY_SCENARIO_NODE_PALETTE,
  SCENARIO_V04_PALETTE,
  SCENARIO_V04_PALETTE_SECTIONS,
  type ScenarioBranchTab,
} from './board-ui.js';

describe('board-ui sidebar sections (MP7b RT6)', () => {
  it('lists scenario branches in sidebar sections (without function editor tab)', () => {
    const tabs = BRANCH_SIDEBAR_SECTIONS.flatMap((section) => section.tabs);
    const expected: ScenarioBranchTab[] = [
      'initial',
      'onConnect',
      'main',
      'alarm',
      'onStop',
      'onDisconnect',
    ];
    expect([...tabs].sort()).toEqual([...expected].sort());
    expect(tabs.length).toBe(expected.length);
  });

  it('groups sections in the required order (v0.4 DBR3)', () => {
    expect(BRANCH_SIDEBAR_SECTIONS.map((s) => s.title)).toEqual([
      'Обработчики событий',
      'Лупы',
    ]);
  });

  it('labels initial branch as On start (presentational, schema key unchanged)', () => {
    expect(BRANCH_TAB_LABEL.initial).toBe('On start');
  });

  it('provides Russian scenario titles for header', () => {
    expect(BRANCH_SCENARIO_TITLE.onConnect).toBe('Сценарий соединения с устройством');
    expect(BRANCH_SCENARIO_TITLE.onDisconnect).toBe(
      'Сценарий при потере соединения с устройством',
    );
    expect(BRANCH_SCENARIO_TITLE.initial).toBe('Сценарий запуска устройства');
    expect(BRANCH_SCENARIO_TITLE.onStop).toBe('Сценарий остановки устройства');
  });
});

describe('scenario node palette (v0.4 DBR5)', () => {
  it('palette sections include Конструкторы with policy nodes', () => {
    const constructors = SCENARIO_V04_PALETTE_SECTIONS.find((s) => s.title === 'Конструкторы');
    expect(constructors).toBeDefined();
    expect(constructors?.items.map((item) => item.nodeKind)).toEqual(
      expect.arrayContaining(['make-recording-policy', 'make-fft-trends-policy', 'make-track']),
    );
  });

  it('palette sections cover every v0.4 node kind exactly once', () => {
    const fromSections = SCENARIO_V04_PALETTE_SECTIONS.flatMap((s) => s.items.map((i) => i.nodeKind));
    expect([...fromSections].sort()).toEqual([...V04_PALETTE_NODE_KINDS].sort());
    expect(fromSections.length).toBe(V04_PALETTE_NODE_KINDS.length);
  });

  it('default v0.4 palette includes streaming and fft nodes', () => {
    expect(SCENARIO_V04_PALETTE.map((item) => item.nodeKind)).toEqual([
      'device-global',
      'stop-runtime',
      'print',
      'is-valid',
      'get-microphone',
      'get-recorder',
      'get-spectral-analyser',
      'start-streaming',
      'stop-streaming',
      'get-audio-stream',
      'get-sample',
      'get-fft-frame',
      'collect-samples',
      'collect-fft-frames',
      'start-recording',
      'stop-recording',
      'is-recording-window-full',
      'flush-spectral-analyser',
      'make-recording-policy',
      'make-fft-trends-policy',
      'make-track',
      'make-fft-trends-analysis',
      'get-journal',
      'get-reporter',
      'make-report-from-track',
      'make-report-from-analysis',
      'publish-report',
    ]);
  });

  it('legacy palette is off by default in tests', () => {
    expect(isLegacyPaletteEnabled()).toBe(false);
  });

  it('legacy palette covers every D0 catalog block kind', () => {
    const paletteKinds = new Set(LEGACY_SCENARIO_NODE_PALETTE.flatMap((c) => c.blockKinds));
    const catalogKinds = Object.keys(D0_SCENARIO_NODE_CATALOG) as ScenarioBlockKind[];
    for (const kind of catalogKinds) {
      expect(paletteKinds.has(kind)).toBe(true);
    }
    expect(paletteKinds.size).toBe(catalogKinds.length);
  });
});
