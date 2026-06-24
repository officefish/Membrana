/** Сегмент transport-кластера Play · Pause · Stop. */
export type PlaybackClusterSegment = 'play' | 'pause' | 'stop';

/** Визуальное состояние сегмента. */
export type PlaybackSegmentVisual = 'lit' | 'dim' | 'depressed';

/** Действие Play: старт или продолжение после паузы. */
export type PlaybackPlayAction = 'start' | 'resume' | 'none';

export interface PlaybackClusterViewModel {
  readonly playAction: PlaybackPlayAction;
  readonly playVisual: PlaybackSegmentVisual;
  readonly pauseVisual: PlaybackSegmentVisual;
  readonly stopVisual: PlaybackSegmentVisual;
  readonly playDisabled: boolean;
  readonly pauseDisabled: boolean;
  readonly stopDisabled: boolean;
  readonly playTitle: string;
}

export interface PlaybackClusterStateInput {
  readonly isRunning: boolean;
  readonly isPaused: boolean;
  readonly canRun: boolean;
  readonly runDisabledReason?: string | null;
}

/**
 * Edit: Play lit, Pause/Stop dim. Running: Play depressed+dim, Pause/Stop lit.
 * Paused: Pause depressed+dim, Play lit. Stop → edit (Play lit, none depressed).
 */
export function derivePlaybackClusterViewModel(
  state: PlaybackClusterStateInput,
): PlaybackClusterViewModel {
  const runReason = state.runDisabledReason ?? 'Запуск недоступен';

  if (state.isPaused) {
    return {
      playAction: 'resume',
      playVisual: 'lit',
      pauseVisual: 'depressed',
      stopVisual: 'lit',
      playDisabled: false,
      pauseDisabled: true,
      stopDisabled: false,
      playTitle: 'Продолжить сценарий',
    };
  }

  if (state.isRunning) {
    return {
      playAction: 'none',
      playVisual: 'depressed',
      pauseVisual: 'lit',
      stopVisual: 'lit',
      playDisabled: true,
      pauseDisabled: false,
      stopDisabled: false,
      playTitle: 'Сценарий выполняется',
    };
  }

  return {
    playAction: 'start',
    playVisual: state.canRun ? 'lit' : 'dim',
    pauseVisual: 'dim',
    stopVisual: 'dim',
    playDisabled: !state.canRun,
    pauseDisabled: true,
    stopDisabled: true,
    playTitle: state.canRun ? 'Запуск сценария' : runReason,
  };
}

export function visualForSegment(
  segment: PlaybackClusterSegment,
  model: PlaybackClusterViewModel,
): PlaybackSegmentVisual {
  if (segment === 'play') {
    return model.playVisual;
  }
  if (segment === 'pause') {
    return model.pauseVisual;
  }
  return model.stopVisual;
}
