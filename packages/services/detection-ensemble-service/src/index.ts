/**
 * @membrana/detection-ensemble-service — combined-продюсер.
 *
 * Питает `combinedScore` из fusion-ядра `@membrana/core` (`fuseDetectorConfidences`),
 * прогоняя инъецированные детекторы (`DroneDetector` из `@membrana/detector-base`)
 * на окне. Слияние считает ядро; сервис — оркестрация во времени + сглаживание.
 *
 * Зависит ТОЛЬКО от `@membrana/core` + foundation `@membrana/detector-base`.
 * НЕ импортирует другие analyzer/detector сервисы. См. docs/SERVICES.md и
 * docs/prompts/DETECTION_ENSEMBLE_SERVICE_PROMPT.md.
 */

export {
  EnsembleProducer,
  fuseDetectorResults,
  detectorSnapshotToFusionInput,
} from './service.js';

export type {
  DetectorSnapshot,
  EnsembleProducerOptions,
  EnsembleResult,
} from './types.js';
