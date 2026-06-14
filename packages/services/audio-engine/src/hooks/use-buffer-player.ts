/**
 * useBufferPlayer — воспроизведение AudioBuffer через engine.
 *
 * Зеркало useLiveSampler, но источник — не MediaStream, а декодированный
 * AudioBuffer. Все Web Audio объекты (контекст, source, analyser) внутри
 * engine'а.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  BufferPlayer,
  type BufferPlayerPlayOptions,
  type BufferPlayerProgress,
  type BufferPlayerState,
} from '../core/buffer-player.js';
import type {
  AudioSampleFrame,
  LiveCaptureConfig,
  SampleFrameHandler,
} from '../types.js';

export interface UseBufferPlayerOptions {
  readonly config?: Partial<LiveCaptureConfig>;
  readonly onFrame?: SampleFrameHandler;
  readonly onError?: (error: Error) => void;
  readonly onEnded?: () => void;
  readonly onProgress?: (progress: BufferPlayerProgress) => void;
}

export interface UseBufferPlayerReturn {
  readonly state: BufferPlayerState;
  readonly isPlaying: boolean;
  readonly currentTimeSec: number;
  readonly durationSec: number;
  readonly play: (buffer: AudioBuffer, options?: BufferPlayerPlayOptions) => Promise<void>;
  readonly pause: () => Promise<void>;
  readonly resume: () => Promise<void>;
  readonly seek: (offsetSec: number) => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly player: BufferPlayer;
  readonly analyserNode: AnalyserNode | null;
  readonly audioContext: AudioContext | null;
}

export function useBufferPlayer(
  options: UseBufferPlayerOptions = {},
): UseBufferPlayerReturn {
  const { config, onFrame, onError, onEnded, onProgress } = options;

  const player = useMemo(
    () => new BufferPlayer(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config?.bufferSize],
  );

  const [state, setState] = useState<BufferPlayerState>(player.getState());
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(
    player.getAnalyserNode(),
  );
  const [audioContext, setAudioContext] = useState<AudioContext | null>(
    player.getAudioContext(),
  );

  const onFrameRef = useRef<SampleFrameHandler | undefined>(onFrame);
  onFrameRef.current = onFrame;
  const onErrorRef = useRef<typeof onError>(onError);
  onErrorRef.current = onError;
  const onEndedRef = useRef<typeof onEnded>(onEnded);
  onEndedRef.current = onEnded;
  const onProgressRef = useRef<typeof onProgress>(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    const handleFrame = (frame: AudioSampleFrame): void => {
      onFrameRef.current?.(frame);
    };
    const handleError = (err: Error): void => {
      setState('error');
      setAnalyserNode(null);
      setAudioContext(null);
      onErrorRef.current?.(err);
    };
    const handleStart = (): void => {
      setState(player.getState());
      setDurationSec(player.getDurationSec());
      setAnalyserNode(player.getAnalyserNode());
      setAudioContext(player.getAudioContext());
    };
    const handleStop = (): void => {
      setState(player.getState());
      setCurrentTimeSec(player.getCurrentTimeSec());
      setAnalyserNode(player.getAnalyserNode());
      setAudioContext(player.getAudioContext());
    };
    const handleEnded = (): void => {
      setState(player.getState());
      setCurrentTimeSec(player.getDurationSec());
      onEndedRef.current?.();
    };
    const handleProgress = (progress: BufferPlayerProgress): void => {
      setCurrentTimeSec(progress.currentSec);
      setDurationSec(progress.durationSec);
      onProgressRef.current?.(progress);
    };

    player.on('frame', handleFrame);
    player.on('error', handleError);
    player.on('start', handleStart);
    player.on('stop', handleStop);
    player.on('ended', handleEnded);
    player.on('progress', handleProgress);

    return () => {
      player.off('frame', handleFrame);
      player.off('error', handleError);
      player.off('start', handleStart);
      player.off('stop', handleStop);
      player.off('ended', handleEnded);
      player.off('progress', handleProgress);
      if (player.isPlaying()) {
        void player.stop();
      }
    };
  }, [player]);

  useEffect(() => {
    if (config) player.updateConfig(config);
  }, [player, config]);

  const play = useCallback(
    (buffer: AudioBuffer, options?: BufferPlayerPlayOptions) => player.play(buffer, options),
    [player],
  );
  const pause = useCallback(() => player.pause(), [player]);
  const resume = useCallback(() => player.resume(), [player]);
  const seek = useCallback((offsetSec: number) => player.seek(offsetSec), [player]);
  const stop = useCallback(() => player.stop(), [player]);

  return {
    state,
    isPlaying: state === 'playing',
    currentTimeSec,
    durationSec,
    play,
    pause,
    resume,
    seek,
    stop,
    player,
    analyserNode,
    audioContext,
  };
}
