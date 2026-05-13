/**
 * useMicrophone — сахар вокруг useLiveSampler.
 *
 * Автоматически запрашивает разрешение через navigator.mediaDevices при start().
 */

import { useCallback } from 'react';

import {
  useLiveSampler,
  type UseLiveSamplerOptions,
  type UseLiveSamplerReturn,
} from './use-live-sampler.js';

export interface UseMicrophoneOptions extends UseLiveSamplerOptions {
  /** Дополнительные ограничения для MediaTrackConstraints (echoCancellation и т.д.). */
  readonly constraints?: MediaTrackConstraints;
}

export interface UseMicrophoneReturn extends Omit<UseLiveSamplerReturn, 'start'> {
  readonly start: () => Promise<void>;
}

export function useMicrophone(
  options: UseMicrophoneOptions = {},
): UseMicrophoneReturn {
  const { constraints, ...rest } = options;
  const base = useLiveSampler(rest);

  const start = useCallback(async (): Promise<void> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: constraints ?? true,
    });
    await base.start(stream);
  }, [base, constraints]);

  return { ...base, start };
}
