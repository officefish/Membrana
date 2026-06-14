import { audioWindowFromFrame } from '@membrana/detector-base';
import type { AudioSampleFrame } from '@membrana/audio-engine-service';
import { useMicrophone, type LiveSamplerState } from '@membrana/audio-engine-service';
import {
  createHarmonicDetector,
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_FFT_SIZE,
} from '@membrana/harmonic-detector-service';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DetectionSmoother } from './detection-smooth.js';
import { shouldThrottle } from './throttle.js';

const UI_THROTTLE_MS = 80;

export interface LiveHarmonicDetection {
  /** Стабильный UI-статус (с гистерезисом и debounce по кадрам). */
  readonly isDrone: boolean;
  /** Сглаженный confidence для индикатора. */
  readonly confidence: number;
  readonly reasoning?: string;
  readonly fundamentals?: readonly number[];
  readonly latencyMs?: number;
  /** Сырой confidence с классификатора (для отладки). */
  readonly rawConfidence?: number;
}

export interface UseLiveHarmonicDetectionReturn {
  readonly micState: LiveSamplerState;
  readonly isRunning: boolean;
  readonly detection: LiveHarmonicDetection | null;
  readonly error: string | null;
  readonly confidenceThreshold: number;
  readonly setConfidenceThreshold: (value: number) => void;
  readonly start: () => Promise<void>;
  readonly stop: () => Promise<void>;
}

export function useLiveHarmonicDetection(): UseLiveHarmonicDetectionReturn {
  const [confidenceThreshold, setConfidenceThreshold] = useState(DEFAULT_CONFIDENCE_THRESHOLD);
  const [detection, setDetection] = useState<LiveHarmonicDetection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const streamOriginRef = useRef(0);
  const lastUiUpdateRef = useRef(0);
  const inFlightRef = useRef(false);
  const smootherRef = useRef(new DetectionSmoother());

  const detector = useMemo(
    () => createHarmonicDetector({ confidenceThreshold, fftSize: DEFAULT_FFT_SIZE }),
    [confidenceThreshold],
  );

  const onFrame = useCallback(
    (frame: AudioSampleFrame) => {
      if (shouldThrottle(lastUiUpdateRef.current, UI_THROTTLE_MS)) {
        return;
      }
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      lastUiUpdateRef.current = performance.now();

      const window = audioWindowFromFrame(frame, streamOriginRef.current);
      void detector
        .detect(window)
        .then((result) => {
          const smoothed = smootherRef.current.update(
            {
              confidence: result.confidence,
              isDrone: result.isDrone,
              reasoning: result.reasoning,
            },
            confidenceThreshold,
          );
          setDetection({
            isDrone: smoothed.stableIsDrone,
            confidence: smoothed.displayConfidence,
            reasoning: smoothed.displayReasoning,
            fundamentals: result.fundamentalsHz,
            latencyMs: result.latencyMs,
            rawConfidence: smoothed.rawConfidence,
          });
          setError(null);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    },
    [detector, confidenceThreshold],
  );

  const mic = useMicrophone({
    config: { bufferSize: DEFAULT_FFT_SIZE },
    onFrame,
    onError: (err) => setError(err.message),
  });

  useEffect(() => {
    if (mic.state !== 'running') {
      setDetection(null);
      smootherRef.current.reset();
    }
  }, [mic.state]);

  const start = useCallback(async () => {
    setError(null);
    smootherRef.current.reset();
    streamOriginRef.current = Date.now();
    await mic.start();
  }, [mic]);

  const stop = useCallback(async () => {
    await mic.stop();
    smootherRef.current.reset();
    setDetection(null);
  }, [mic]);

  return {
    micState: mic.state,
    isRunning: mic.isRunning,
    detection,
    error,
    confidenceThreshold,
    setConfidenceThreshold,
    start,
    stop,
  };
}
