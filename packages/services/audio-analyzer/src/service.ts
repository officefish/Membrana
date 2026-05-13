/**
 * @deprecated Этот файл оставлен только для обратной совместимости с временем,
 * когда сервис назывался fft-analyzer и состоял из одного service.ts.
 *
 * Реальный класс — `AudioAnalyzer` в `./core/audio-analyzer.ts`.
 * Все импорты потребителей должны идти через `@membrana/audio-analyzer-service`
 * (то есть через `./index.ts`), а не напрямую сюда.
 */

export { AudioAnalyzer as AudioAnalyzerService } from './core/audio-analyzer.js';
