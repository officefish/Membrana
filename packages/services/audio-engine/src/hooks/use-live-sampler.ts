/**
 * useLiveSampler — подписывается на поток AudioSampleFrame от LiveSampler.
 *
 * Ключевое: возвращает фасад с start/stop + onFrame через ref-callback,
 * чтобы потребитель (любой анализатор) мог установить свой собственный обработчик
 * без перезаписи setState на каждом кадре (это убило бы производительность).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LiveSampler } from '../core/live-sampler.js';
import type {
  AudioSampleFrame,
  LiveCaptureConfig,
  LiveSamplerState,
  SampleFrameHandler,
} from '../types.js';

export interface UseLiveSamplerOptions {
  readonly config?: Partial<LiveCaptureConfig>;
  readonly autoStart?: boolean;
  /**
   * Обработчик кадров. Вызывается на КАЖДЫЙ кадр (RAF), поэтому НЕ создавать
   * новую функцию на каждом рендере. Используй useCallback или вынеси наружу.
   */
  readonly onFrame?: SampleFrameHandler;
  readonly onError?: (error: Error) => void;
}

export interface UseLiveSamplerReturn {
  readonly state: LiveSamplerState;
  readonly isRunning: boolean;
  readonly start: (stream?: MediaStream) => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly sampler: LiveSampler;
  /**
   * AnalyserNode engine'а — `null`, пока sampler не запущен.
   * Нужен визуализациям, которые рендерятся напрямую с Web Audio
   * (виджеты `@membrana/audio-data-viz`).
   */
  readonly analyserNode: AnalyserNode | null;
  /** AudioContext engine'а — `null`, пока sampler не запущен. */
  readonly audioContext: AudioContext | null;
}

export function useLiveSampler(
  options: UseLiveSamplerOptions = {},
): UseLiveSamplerReturn {
  const { config, autoStart = false, onFrame, onError } = options;

  // Пересоздаём sampler только при смене bufferSize — самое тяжёлое из конфига.
  const sampler = useMemo(
    () => new LiveSampler(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config?.bufferSize],
  );

  const [state, setState] = useState<LiveSamplerState>(sampler.getState());

  // Свежий onFrame в ref — чтобы не пересоздавать подписку каждый рендер.
  const onFrameRef = useRef<SampleFrameHandler | undefined>(onFrame);
  onFrameRef.current = onFrame;
  const onErrorRef = useRef<typeof onError>(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const handleFrame = (frame: AudioSampleFrame): void => {
      onFrameRef.current?.(frame);
    };
    const handleError = (err: Error): void => {
      setState('error');
      onErrorRef.current?.(err);
    };
    const handleStart = (): void => setState('running');
    const handleStop = (): void => setState('stopped');

    sampler.on('frame', handleFrame);
    sampler.on('error', handleError);
    sampler.on('start', handleStart);
    sampler.on('stop', handleStop);

    if (autoStart) {
      sampler.start().catch(() => undefined);
    }

    return () => {
      sampler.off('frame', handleFrame);
      sampler.off('error', handleError);
      sampler.off('start', handleStart);
      sampler.off('stop', handleStop);
      if (sampler.isRunning()) {
        void sampler.stop();
      }
    };
  }, [sampler, autoStart]);

  // Прочие правки конфига (smoothing) — без пересоздания.
  useEffect(() => {
    if (config) sampler.updateConfig(config);
  }, [sampler, config]);

  const start = useCallback(
    (stream?: MediaStream) => sampler.start(stream),
    [sampler],
  );
  const stop = useCallback(() => sampler.stop(), [sampler]);

  return {
    state,
    isRunning: state === 'running',
    start,
    stop,
    sampler,
  };
}
