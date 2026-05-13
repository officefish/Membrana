/**
 * useFftMicrophoneAnalyzer — сахар над useFftAnalyzer для микрофона.
 *
 * Автоматически запрашивает разрешение в start() через engine-хук useMicrophone.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useMicrophone,
  type AudioSampleFrame,
  type LiveSamplerState,
} from '@membrana/audio-engine-service';

import { FftAnalyzer } from '../core/fft-analyzer.js';
import type {
  AudioAnalyzerConfig,
  LiveFrameResult,
} from '../types.js';

export interface UseFftMicrophoneAnalyzerOptions {
  readonly autoStart?: boolean;
  readonly config?: Partial<AudioAnalyzerConfig>;
  readonly onFrame?: (frame: LiveFrameResult) => void;
  readonly onError?: (error: Error) => void;
  readonly constraints?: MediaTrackConstraints;
}

export interface UseFftMicrophoneAnalyzerReturn {
  readonly state: LiveSamplerState;
  readonly isRunning: boolean;
  readonly lastFrame: LiveFrameResult | null;
  readonly start: () => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly analyzer: FftAnalyzer;
}

export function useFftMicrophoneAnalyzer(
  options: UseFftMicrophoneAnalyzerOptions = {},
): UseFftMicrophoneAnalyzerReturn {
  const { autoStart = false, config, onFrame, onError, constraints } = options;

  const analyzer = useMemo(
    () => new FftAnalyzer(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config?.fftSize],
  );
  const [lastFrame, setLastFrame] = useState<LiveFrameResult | null>(null);

  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const handleSampleFrame = useCallback(
    (sf: AudioSampleFrame) => {
      const result = analyzer.analyzeFrame(sf);
      setLastFrame(result);
      onFrameRef.current?.(result);
    },
    [analyzer],
  );

  const mic = useMicrophone({
    config: { bufferSize: analyzer.getConfig().fftSize },
    autoStart,
    constraints,
    onFrame: handleSampleFrame,
    onError,
  });

  useEffect(() => {
    if (config) analyzer.updateConfig(config);
  }, [analyzer, config]);

  return {
    state: mic.state,
    isRunning: mic.isRunning,
    lastFrame,
    start: mic.start,
    stop: mic.stop,
    analyzer,
  };
}
