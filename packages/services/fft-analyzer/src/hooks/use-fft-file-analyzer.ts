/**
 * useFftFileAnalyzer — batch-анализ файла через FFT.
 *
 * Использует useAudioFile из engine для декодирования и FftAnalyzer
 * для математики. Возвращает прогресс и результат.
 */

import { useCallback, useMemo, useState } from 'react';

import { useAudioFile } from '@membrana/audio-engine-service';

import { FftAnalyzer } from '../core/fft-analyzer.js';
import type {
  AudioAnalyzerConfig,
  FileAnalysisResult,
} from '../types.js';

export interface UseFftFileAnalyzerOptions {
  readonly config?: Partial<AudioAnalyzerConfig>;
  readonly onProgress?: (progress: number) => void;
  readonly onComplete?: (result: FileAnalysisResult) => void;
  readonly onError?: (error: Error) => void;
}

export interface UseFftFileAnalyzerReturn {
  readonly isAnalyzing: boolean;
  readonly progress: number;
  readonly result: FileAnalysisResult | null;
  readonly error: Error | null;
  readonly analyze: (
    source: File | Blob | AudioBuffer,
  ) => Promise<FileAnalysisResult>;
  readonly reset: () => void;
}

export function useFftFileAnalyzer(
  options: UseFftFileAnalyzerOptions = {},
): UseFftFileAnalyzerReturn {
  const { config, onProgress, onComplete, onError } = options;

  const analyzer = useMemo(
    () => new FftAnalyzer(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config?.fftSize],
  );

  const fileLoader = useAudioFile();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<FileAnalysisResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const analyze = useCallback(
    async (source: File | Blob | AudioBuffer) => {
      setIsAnalyzing(true);
      setProgress(0);
      setError(null);

      try {
        const buffer =
          source instanceof AudioBuffer ? source : await fileLoader.load(source);
        const r = await analyzer.analyzeAudioBuffer(buffer, (p) => {
          setProgress(p);
          onProgress?.(p);
        });
        setResult(r);
        setProgress(1);
        onComplete?.(r);
        return r;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        onError?.(err);
        throw err;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [analyzer, fileLoader, onProgress, onComplete, onError],
  );

  const reset = useCallback(() => {
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  return { isAnalyzing, progress, result, error, analyze, reset };
}
