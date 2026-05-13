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
}

export interface UseBufferPlayerReturn {
  readonly state: BufferPlayerState;
  readonly isPlaying: boolean;
  readonly play: (buffer: AudioBuffer) => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly player: BufferPlayer;
  readonly analyserNode: AnalyserNode | null;
  readonly audioContext: AudioContext | null;
}

export function useBufferPlayer(
  options: UseBufferPlayerOptions = {},
): UseBufferPlayerReturn {
  const { config, onFrame, onError, onEnded } = options;

  const player = useMemo(
    () => new BufferPlayer(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config?.bufferSize],
  );

  const [state, setState] = useState<BufferPlayerState>(player.getState());
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
      setState('playing');
      setAnalyserNode(player.getAnalyserNode());
      setAudioContext(player.getAudioContext());
    };
    const handleStop = (): void => {
      setState('stopped');
      setAnalyserNode(null);
      setAudioContext(null);
    };
    const handleEnded = (): void => {
      onEndedRef.current?.();
    };

    player.on('frame', handleFrame);
    player.on('error', handleError);
    player.on('start', handleStart);
    player.on('stop', handleStop);
    player.on('ended', handleEnded);

    return () => {
      player.off('frame', handleFrame);
      player.off('error', handleError);
      player.off('start', handleStart);
      player.off('stop', handleStop);
      player.off('ended', handleEnded);
      if (player.isPlaying()) {
        void player.stop();
      }
    };
  }, [player]);

  useEffect(() => {
    if (config) player.updateConfig(config);
  }, [player, config]);

  const play = useCallback(
    (buffer: AudioBuffer) => player.play(buffer),
    [player],
  );
  const stop = useCallback(() => player.stop(), [player]);

  return {
    state,
    isPlaying: state === 'playing',
    play,
    stop,
    player,
    analyserNode,
    audioContext,
  };
}
