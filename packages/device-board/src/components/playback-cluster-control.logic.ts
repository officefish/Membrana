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
  readonly pauseTitle: string;
}

export interface PlaybackClusterStateInput {
  readonly isRunning: boolean;
  readonly isPaused: boolean;
  readonly canRun: boolean;
  readonly runDisabledReason?: string | null;
  /** CSR2: под захватом пауза заблокирована (тариф v3) — кнопка disabled с подсказкой. */
  readonly capturePauseBlocked?: boolean;
}

const PAUSE_TITLE_DEFAULT = 'Пауза сценария';
const PAUSE_TITLE_CAPTURED = 'Пауза недоступна под захватом кабинетом';

/**
 * Edit: Play lit, Pause/Stop dim. Running: Play depressed+dim, Pause/Stop lit.
 * Paused: Pause depressed+dim, Play lit. Stop → edit (Play lit, none depressed).
 */
export function derivePlaybackClusterViewModel(
  state: PlaybackClusterStateInput,
): PlaybackClusterViewModel {
  const runReason = state.runDisabledReason ?? 'Запуск недоступен';
  const pauseBlocked = state.capturePauseBlocked === true;
  const pauseTitle = pauseBlocked ? PAUSE_TITLE_CAPTURED : PAUSE_TITLE_DEFAULT;

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
      pauseTitle,
    };
  }

  if (state.isRunning) {
    // CSR2: под захватом «работает → только Stop» — пауза заблокирована.
    return {
      playAction: 'none',
      playVisual: 'depressed',
      pauseVisual: pauseBlocked ? 'dim' : 'lit',
      stopVisual: 'lit',
      playDisabled: true,
      pauseDisabled: pauseBlocked,
      stopDisabled: false,
      playTitle: 'Сценарий выполняется',
      pauseTitle,
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
    pauseTitle,
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
