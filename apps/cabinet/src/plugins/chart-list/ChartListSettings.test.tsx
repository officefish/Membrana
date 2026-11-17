import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  setCriterion,
  type ChartListPickView,
  type ChartListSelectionView,
  type ChartListState,
} from './chartList';
import { ChartListSettings } from './ChartListSettings';

afterEach(cleanup);

const pick = (rank: number): ChartListPickView => ({
  rank,
  entryId: `entry-${rank}`,
  sampleId: `sample-${rank}`,
  deltaDb: 10,
  peakDb: -8,
  structure: 'tonal',
  flatness: 0.1,
  displaced: 0,
});

const selection: ChartListSelectionView = {
  id: 'selection-1',
  criterion: 'drone-likeness',
  volume: 60,
  asked: 60,
  measured: 1838,
  shortfall: 0,
  createdAt: '2026-10-04T15:43:53.000Z',
  picks: Array.from({ length: 60 }, (_, i) => pick(i + 1)),
};

const state: ChartListState = {
  volume: 60,
  criterion: 'drone-likeness',
  busy: false,
  selection,
  breakdown: null,
  refusal: null,
  error: null,
  page: 0,
};

describe('ChartListSettings (#2590)', () => {
  it('смена критерия без прогона не меняет подпись показанной выборки и показывает маркер', () => {
    const onCriterion = vi.fn();
    const view = render(
      <ChartListSettings state={state} onVolume={() => undefined} onCriterion={onCriterion} />,
    );

    expect(screen.getByText(/60 из 1838 измеренных · похожесть на дрон · объём 60/u)).toBeTruthy();
    expect(screen.queryByText('Настройки изменены, выборка не пересчитана.')).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: 'Разнообразие звука' }));
    expect(onCriterion).toHaveBeenCalledWith('spectral-variety');

    view.rerender(
      <ChartListSettings
        state={setCriterion(state, 'spectral-variety')}
        onVolume={() => undefined}
        onCriterion={onCriterion}
      />,
    );

    expect(screen.getByText(/60 из 1838 измеренных · похожесть на дрон · объём 60/u)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Настройки изменены, выборка не пересчитана.');
  });
});
