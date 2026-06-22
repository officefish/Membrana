import { describe, expect, it } from 'vitest';

import { derivePlaybackClusterViewModel } from './playback-cluster-control.logic.js';

describe('derivePlaybackClusterViewModel', () => {
  it('edit: Play lit, Pause/Stop dim, none depressed', () => {
    const model = derivePlaybackClusterViewModel({
      isRunning: false,
      isPaused: false,
      canRun: true,
    });
    expect(model.playVisual).toBe('lit');
    expect(model.pauseVisual).toBe('dim');
    expect(model.stopVisual).toBe('dim');
    expect(model.playAction).toBe('start');
    expect(model.playDisabled).toBe(false);
    expect(model.pauseDisabled).toBe(true);
    expect(model.stopDisabled).toBe(true);
  });

  it('running: Play depressed, Pause and Stop lit', () => {
    const model = derivePlaybackClusterViewModel({
      isRunning: true,
      isPaused: false,
      canRun: false,
    });
    expect(model.playVisual).toBe('depressed');
    expect(model.pauseVisual).toBe('lit');
    expect(model.stopVisual).toBe('lit');
    expect(model.playAction).toBe('none');
    expect(model.playDisabled).toBe(true);
    expect(model.pauseDisabled).toBe(false);
    expect(model.stopDisabled).toBe(false);
  });

  it('paused: Pause depressed, Play lit, Stop lit', () => {
    const model = derivePlaybackClusterViewModel({
      isRunning: true,
      isPaused: true,
      canRun: false,
    });
    expect(model.playVisual).toBe('lit');
    expect(model.pauseVisual).toBe('depressed');
    expect(model.stopVisual).toBe('lit');
    expect(model.playAction).toBe('resume');
    expect(model.playDisabled).toBe(false);
    expect(model.pauseDisabled).toBe(true);
    expect(model.stopDisabled).toBe(false);
    expect(model.playTitle).toBe('Продолжить сценарий');
  });

  it('edit without canRun: Play dim', () => {
    const model = derivePlaybackClusterViewModel({
      isRunning: false,
      isPaused: false,
      canRun: false,
      runDisabledReason: 'Нет микрофона',
    });
    expect(model.playVisual).toBe('dim');
    expect(model.playDisabled).toBe(true);
    expect(model.playTitle).toBe('Нет микрофона');
  });
});
