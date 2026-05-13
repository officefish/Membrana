/**
 * @deprecated Этот файл оставлен только для обратной совместимости.
 * Реальные хуки — `./hooks/use-fft-analyzer.ts`, `./hooks/use-fft-file-analyzer.ts`,
 * `./hooks/use-fft-microphone-analyzer.ts`. Импортируйте через `@membrana/fft-analyzer-service`.
 */

export { useFftAnalyzer as useAudioAnalyzer } from './hooks/use-fft-analyzer.js';
export { useFftFileAnalyzer as useFileAnalyzer } from './hooks/use-fft-file-analyzer.js';
export { useFftMicrophoneAnalyzer as useMicrophoneAnalyzer } from './hooks/use-fft-microphone-analyzer.js';
