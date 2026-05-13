/**
 * useFileAnalyzer — специализированный хук для batch-анализа файлов.
 *
 * Не запускает live-цикл, не трогает микрофон. Вход: File / Blob / AudioBuffer.
 */

import { useCallback, useMemo, useState } from 'react';

import { AudioAnalyzer } from '../core/audio-analyzer.js';
import type {
  AudioAnalyzerConfig,
  FileAnalysisResult,
} from '../types.js';

export interface UseFileAnalyzerOptions {
  readonly config?: Partial<AudioAnalyzerConfig>;
  readonly onProgress?: (progress: number) => void;
  readonly onComplete?: (result: FileAnalysisResult) => void;
  readonly onError?: (error: Error) => void;
}

export interface UseFileAnalyzerReturn {
  readonly isAnalyzing: boolean;
  readonly progress: number;
  readonly result: FileAnalysisResult | null;
  readonly error: Error | null;
  readonly analyze: (
    source: File | Blob | AudioBuffer,
  ) => Promise<FileAnalysisResult>;
  readonly reset: () => void;
}

export function useFileAnalyzer(
  options: UseFileAnalyzerOptions = {},
): UseFileAnalyzerReturn {
  const { config, onProgress, onComplete, onError } = options;

  const analyzer = useMemo(() => new AudioAnalyzer(config), [config?.fftSize]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const r = await analyzer.analyzeFile(source, (p) => {
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
    [analyzer, onProgress, onComplete, onError],
  );

  const reset = useCallback(() => {
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  return { isAnalyzing, progress, result, error, analyze, reset };
}
