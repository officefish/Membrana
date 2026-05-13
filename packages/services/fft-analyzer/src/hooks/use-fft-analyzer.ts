/**
 * useFftAnalyzer — main React-хук FFT-анализатора.
 *
 * Объединяет:
 *   - useLiveSampler из @membrana/audio-engine-service (поставка кадров)
 *   - FftAnalyzer (математика и детекция)
 *
 * Live и file режимы доступны через один хук. Это аналог
 * useAudioAnalyzer из старого API, но теперь данные приходят из engine.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useLiveSampler,
  type AudioSampleFrame,
  type LiveSamplerState,
  type UseLiveSamplerReturn,
} from '@membrana/audio-engine-service';

import { FftAnalyzer } from '../core/fft-analyzer.js';
import type {
  AudioAnalyzerConfig,
  FileAnalysisResult,
  LiveFrameResult,
} from '../types.js';

export interface UseFftAnalyzerOptions {
  readonly autoStart?: boolean;
  readonly config?: Partial<AudioAnalyzerConfig>;
  readonly onFrame?: (frame: LiveFrameResult) => void;
  readonly onError?: (error: Error) => void;
}

export interface UseFftAnalyzerReturn {
  readonly state: LiveSamplerState;
  readonly isRunning: boolean;
  readonly lastFrame: LiveFrameResult | null;
  readonly start: UseLiveSamplerReturn['start'];
  readonly stop: UseLiveSamplerReturn['stop'];
  readonly analyzeAudioBuffer: (
    buffer: AudioBuffer,
    onProgress?: (p: number) => void,
  ) => Promise<FileAnalysisResult>;
  readonly updateConfig: (patch: Partial<AudioAnalyzerConfig>) => void;
  readonly analyzer: FftAnalyzer;
}

export function useFftAnalyzer(
  options: UseFftAnalyzerOptions = {},
): UseFftAnalyzerReturn {
  const { autoStart = false, config, onFrame, onError } = options;

  const analyzer = useMemo(
    () => new FftAnalyzer(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config?.fftSize],
  );
  const [lastFrame, setLastFrame] = useState<LiveFrameResult | null>(null);

  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  // Обработчик кадров для engine — анализируем и пробрасываем результат.
  const handleSampleFrame = useCallback(
    (sf: AudioSampleFrame) => {
      const result = analyzer.analyzeFrame(sf);
      setLastFrame(result);
      onFrameRef.current?.(result);
    },
    [analyzer],
  );

  const sampler = useLiveSampler({
    config: { bufferSize: analyzer.getConfig().fftSize },
    autoStart,
    onFrame: handleSampleFrame,
    onError,
  });

  // Прокидываем смены конфига в analyzer.
  useEffect(() => {
    if (config) analyzer.updateConfig(config);
  }, [analyzer, config]);

  const analyzeAudioBuffer = useCallback(
    (buffer: AudioBuffer, onProgress?: (p: number) => void) =>
      analyzer.analyzeAudioBuffer(buffer, onProgress),
    [analyzer],
  );
  const updateConfig = useCallback(
    (patch: Partial<AudioAnalyzerConfig>) => analyzer.updateConfig(patch),
    [analyzer],
  );

  return {
    state: sampler.state,
    isRunning: sampler.isRunning,
    lastFrame,
    start: sampler.start,
    stop: sampler.stop,
    analyzeAudioBuffer,
    updateConfig,
    analyzer,
  };
}
