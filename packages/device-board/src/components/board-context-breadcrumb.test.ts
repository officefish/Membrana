import { describe, expect, it } from 'vitest';

import { buildBoardCanvasBreadcrumb } from './board-context-breadcrumb.js';

describe('buildBoardCanvasBreadcrumb', () => {
  it('returns signal layer breadcrumb', () => {
    expect(
      buildBoardCanvasBreadcrumb({
        layer: 'signal',
        scenarioBranch: 'main',
      }),
    ).toEqual([{ label: 'Сигнал' }]);
  });

  it('returns scenario branch breadcrumb', () => {
    expect(
      buildBoardCanvasBreadcrumb({
        layer: 'scenario',
        scenarioBranch: 'main',
      }),
    ).toEqual([{ label: 'Сценарий' }, { label: 'onMainTick' }]);
  });

  it('returns function breadcrumb with name', () => {
    expect(
      buildBoardCanvasBreadcrumb({
        layer: 'scenario',
        scenarioBranch: 'function',
        functionName: 'Capture+Detect',
      }),
    ).toEqual([{ label: 'Функция' }, { label: 'Capture+Detect' }]);
  });

  it('falls back when function name is empty', () => {
    expect(
      buildBoardCanvasBreadcrumb({
        layer: 'scenario',
        scenarioBranch: 'function',
        functionName: '   ',
      }),
    ).toEqual([{ label: 'Функция' }, { label: 'Без имени' }]);
  });
});
