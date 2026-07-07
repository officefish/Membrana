import React, { useCallback, useState } from 'react';

import {
  derivePlaybackClusterViewModel,
  visualForSegment,
  type PlaybackClusterSegment,
  type PlaybackSegmentVisual,
} from './playback-cluster-control.logic.js';
import './playback-cluster-control.css';

export interface PlaybackClusterControlProps {
  readonly isRunning: boolean;
  readonly isPaused: boolean;
  readonly canRun: boolean;
  readonly runDisabledReason?: string | null;
  /** CSR2: под захватом пауза заблокирована — кнопка disabled с подсказкой. */
  readonly capturePauseBlocked?: boolean;
  readonly onStart: () => void | Promise<void>;
  readonly onResume: () => void;
  readonly onPause: () => void;
  readonly onStop: () => void;
}

const PLAY_PATH = 'M4.5 3.2c-.5-.3-1.1.1-1.1.7v8.2c0 .6.6 1 1.1.7l7.8-4.1c.5-.3.5-1.1 0-1.4L4.5 3.2z';
const PAUSE_PATH =
  'M4.5 3.5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1H6a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1H4.5zm5 0a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1H11a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1.5z';
const STOP_PATH = 'M4.5 4.5h7a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z';

const IconAperture: React.FC<{
  readonly path: string;
  readonly lit: boolean;
  readonly maskId: string;
}> = ({ path, lit, maskId }) => (
  <span className={['icon-aperture', lit ? 'icon-aperture--lit' : ''].filter(Boolean).join(' ')}>
    <svg viewBox="0 0 16 16" className="icon-aperture__svg" aria-hidden>
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="16" height="16">
          <rect width="16" height="16" fill="black" />
          <path d={path} fill="white" />
        </mask>
        <radialGradient id={`${maskId}-glow`} cx="50%" cy="58%" r="65%">
          <stop offset="0%" stopColor="var(--pb-accent-hot, #c4b5fd)" />
          <stop offset="55%" stopColor="var(--pb-accent, #7c3aed)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <g className="icon-aperture__beam" mask={`url(#${maskId})`}>
        <rect x="-2" y="-2" width="20" height="20" fill={`url(#${maskId}-glow)`} />
      </g>
      <path d={path} className="icon-aperture__glyph" />
    </svg>
  </span>
);

/**
 * Transport-кластер Play · Pause · Stop.
 * Lit / dim / depressed — без мерцания; edit → play lit; runtime → pause+stop lit.
 */
export const PlaybackClusterControl: React.FC<PlaybackClusterControlProps> = ({
  isRunning,
  isPaused,
  canRun,
  runDisabledReason,
  capturePauseBlocked,
  onStart,
  onResume,
  onPause,
  onStop,
}) => {
  const [pressedSegment, setPressedSegment] = useState<PlaybackClusterSegment | null>(null);
  const model = derivePlaybackClusterViewModel({
    isRunning,
    isPaused,
    canRun,
    runDisabledReason,
    capturePauseBlocked,
  });

  const handlePlay = useCallback(() => {
    if (model.playAction === 'resume') {
      onResume();
      return;
    }
    if (model.playAction === 'start') {
      void onStart();
    }
  }, [model.playAction, onResume, onStart]);

  const isSqueezing = pressedSegment !== null;

  const segmentClass = (segment: PlaybackClusterSegment, visual: PlaybackSegmentVisual): string =>
    [
      'btn btn-sm join-item playback-cluster__segment',
      `playback-cluster__segment--${visual}`,
      pressedSegment === segment ? 'playback-cluster__segment--pressed' : '',
      pressedSegment !== null && pressedSegment !== segment ? 'playback-cluster__segment--crowded' : '',
    ]
      .filter(Boolean)
      .join(' ');

  const bindPress = (segment: PlaybackClusterSegment) => ({
    onPointerDown: () => setPressedSegment(segment),
    onPointerUp: () => setPressedSegment(null),
    onPointerLeave: () => setPressedSegment(null),
    onPointerCancel: () => setPressedSegment(null),
  });

  const playVisual = visualForSegment('play', model);
  const pauseVisual = visualForSegment('pause', model);
  const stopVisual = visualForSegment('stop', model);

  return (
    <div
      className={['playback-cluster-chassis', isSqueezing ? 'playback-cluster-chassis--squeeze' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={['join join-horizontal playback-cluster', isSqueezing ? 'playback-cluster--squeeze' : '']
          .filter(Boolean)
          .join(' ')}
        role="group"
        aria-label="Управление сценарием"
      >
        <button
          type="button"
          className={segmentClass('play', playVisual)}
          disabled={model.playDisabled}
          title={model.playTitle}
          aria-label={model.playTitle}
          onClick={handlePlay}
          {...bindPress('play')}
        >
          <IconAperture path={PLAY_PATH} lit={playVisual === 'lit'} maskId="pb-aperture-play" />
          <span className="playback-cluster__label">Play</span>
        </button>
        <button
          type="button"
          className={segmentClass('pause', pauseVisual)}
          disabled={model.pauseDisabled}
          title={model.pauseTitle}
          aria-label={model.pauseTitle}
          onClick={onPause}
          {...bindPress('pause')}
        >
          <IconAperture path={PAUSE_PATH} lit={pauseVisual === 'lit'} maskId="pb-aperture-pause" />
          <span className="playback-cluster__label">Pause</span>
        </button>
        <button
          type="button"
          className={segmentClass('stop', stopVisual)}
          disabled={model.stopDisabled}
          title="Остановить сценарий"
          aria-label="Остановить сценарий"
          onClick={onStop}
          {...bindPress('stop')}
        >
          <IconAperture path={STOP_PATH} lit={stopVisual === 'lit'} maskId="pb-aperture-stop" />
          <span className="playback-cluster__label">Stop</span>
        </button>
      </div>
    </div>
  );
};
