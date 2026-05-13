/**
 * @deprecated AudioAnalyzer был перенесён в FftAnalyzer (./fft-analyzer.ts),
 * Web Audio управление переехало в @membrana/audio-engine-service.
 *
 * Старое имя оставлено re-export'ом для совместимости со старыми импортами;
 * новые потребители должны импортировать FftAnalyzer.
 */
export { FftAnalyzer as AudioAnalyzer } from './fft-analyzer.js';
