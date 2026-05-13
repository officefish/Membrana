/**
 * useMicrophoneAnalyzer — упрощённый хук для микрофона.
 *
 * Сахар над useAudioAnalyzer: автоматически запрашивает разрешение
 * через navigator.mediaDevices.getUserMedia при start().
 *
 * Если нужен произвольный MediaStream — используйте useAudioAnalyzer напрямую.
 */

import { useCallback } from 'react';

import type {
  AudioAnalyzerConfig,
  LiveFrameResult,
} from '../types.js';

import {
  useAudioAnalyzer,
  type UseAudioAnalyzerReturn,
} from './use-audio-analyzer.js';

export interface UseMicrophoneAnalyzerOptions {
  readonly autoStart?: boolean;
  readonly config?: Partial<AudioAnalyzerConfig>;
  readonly onFrame?: (frame: LiveFrameResult) => void;
  readonly onError?: (error: Error) => void;
  readonly constraints?: MediaTrackConstraints;
}

export interface UseMicrophoneAnalyzerReturn
  extends Omit<UseAudioAnalyzerReturn, 'start'> {
  /** Запросить доступ к микрофону и начать анализ. */
  readonly start: () => Promise<void>;
}

export function useMicrophoneAnalyzer(
  options: UseMicrophoneAnalyzerOptions = {},
): UseMicrophoneAnalyzerReturn {
  const { constraints, ...rest } = options;
  const base = useAudioAnalyzer(rest);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: constraints ?? true,
    });
    await base.start(stream);
  }, [base, constraints]);

  return { ...base, start };
}
