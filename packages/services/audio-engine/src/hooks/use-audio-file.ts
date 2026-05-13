/**
 * useAudioFile — асинхронно декодирует File/Blob в AudioBuffer.
 *
 * Это просто состояние вокруг loadAudioBuffer: пригодно любому потребителю,
 * который хочет получить AudioBuffer для дальнейшей обработки (FFT, нейросеть,
 * LLM — все они работают на одном уровне).
 */

import { useCallback, useState } from 'react';

import { loadAudioBuffer } from '../core/load-audio-buffer.js';

export interface UseAudioFileReturn {
  readonly buffer: AudioBuffer | null;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly load: (file: File | Blob) => Promise<AudioBuffer>;
  readonly reset: () => void;
}

export function useAudioFile(): UseAudioFileReturn {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (file: File | Blob): Promise<AudioBuffer> => {
    setIsLoading(true);
    setError(null);
    try {
      const buf = await loadAudioBuffer(file);
      setBuffer(buf);
      return buf;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setBuffer(null);
    setError(null);
  }, []);

  return { buffer, isLoading, error, load, reset };
}
