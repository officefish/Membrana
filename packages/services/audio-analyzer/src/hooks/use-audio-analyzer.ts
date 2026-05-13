/**
 * useAudioAnalyzer — основной React-хук.
 *
 * Тонкая обёртка над AudioAnalyzer:
 *   - инстанцирует анализатор (мемоизация по отпечатку конфигурации),
 *   - подписывается на события и пробрасывает их в state / callbacks,
 *   - возвращает стабильные коллбэки для start/stop/analyzeFile/updateConfig.
 *
 * НЕ содержит бизнес-логики — она вся в AudioAnalyzer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AudioAnalyzer } from '../core/audio-analyzer.js';
import type {
  AudioAnalyzerConfig,
  FileAnalysisResult,
  LiveFrameResult,
} from '../types.js';

export interface UseAudioAnalyzerOptions {
  readonly autoStart?: boolean;
  readonly config?: Partial<AudioAnalyzerConfig>;
  readonly onFrame?: (frame: LiveFrameResult) => void;
  readonly onError?: (error: Error) => void;
  readonly onStart?: () => void;
  readonly onStop?: () => void;
}

export interface UseAudioAnalyzerReturn {
  readonly isActive: boolean;
  readonly lastFrame: LiveFrameResult | null;
  readonly start: (stream?: MediaStream) => Promise<void>;
  readonly stop: () => void;
  readonly analyzeFile: (
    source: File | Blob | AudioBuffer,
    onProgress?: (p: number) => void,
  ) => Promise<FileAnalysisResult>;
  readonly updateConfig: (patch: Partial<AudioAnalyzerConfig>) => void;
  readonly analyzer: AudioAnalyzer;
}

export function useAudioAnalyzer(
  options: UseAudioAnalyzerOptions = {},
): UseAudioAnalyzerReturn {
  const { autoStart = false, config, onFrame, onError, onStart, onStop } = options;

  // Стабильный мемо-ключ по конфигу — пересоздавать AudioAnalyzer надо только при
  // существенных изменениях (особенно fftSize). Для остальных правок есть updateConfig.
  const fingerprint = useMemo(
    () => JSON.stringify(config?.fftSize ?? null),
    [config?.fftSize],
  );

  const analyzer = useMemo(
    () => new AudioAnalyzer(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fingerprint],
  );

  const [isActive, setIsActive] = useState(false);
  const [lastFrame, setLastFrame] = useState<LiveFrameResult | null>(null);

  // Свежие коллбэки в ref — чтобы подписки не пересоздавались на каждом рендере.
  const cbRef = useRef({ onFrame, onError, onStart, onStop });
  cbRef.current = { onFrame, onError, onStart, onStop };

  useEffect(() => {
    const handleFrame = (frame: LiveFrameResult): void => {
      setLastFrame(frame);
      cbRef.current.onFrame?.(frame);
    };
    const handleError = (err: Error): void => {
      cbRef.current.onError?.(err);
    };
    const handleStart = (): void => {
      setIsActive(true);
      cbRef.current.onStart?.();
    };
    const handleStop = (): void => {
      setIsActive(false);
      cbRef.current.onStop?.();
    };

    analyzer.on('frame', handleFrame);
    analyzer.on('error', handleError);
    analyzer.on('start', handleStart);
    analyzer.on('stop', handleStop);

    if (autoStart) {
      analyzer.startLive().catch(() => {
        /* error event уже эмитится внутри */
      });
    }

    return () => {
      analyzer.off('frame', handleFrame);
      analyzer.off('error', handleError);
      analyzer.off('start', handleStart);
      analyzer.off('stop', handleStop);
      if (analyzer.isRunning()) {
        analyzer.stopLive();
      }
    };
  }, [analyzer, autoStart]);

  // updateConfig применяется к существующему экземпляру без пересоздания
  // (если только не меняется fftSize — тогда useMemo пересоздаст всё сам).
  useEffect(() => {
    if (config) analyzer.updateConfig(config);
  }, [analyzer, config]);

  const start = useCallback(
    (stream?: MediaStream) => analyzer.startLive(stream),
    [analyzer],
  );
  const stop = useCallback(() => analyzer.stopLive(), [analyzer]);
  const analyzeFile = useCallback(
    (source: File | Blob | AudioBuffer, onProgress?: (p: number) => void) =>
      analyzer.analyzeFile(source, onProgress),
    [analyzer],
  );
  const updateConfig = useCallback(
    (patch: Partial<AudioAnalyzerConfig>) => analyzer.updateConfig(patch),
    [analyzer],
  );

  return {
    isActive,
    lastFrame,
    start,
    stop,
    analyzeFile,
    updateConfig,
    analyzer,
  };
}
