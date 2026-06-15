export {
  TemplateMatchDetector,
  createTemplateMatchDetector,
} from './core/template-match-detector.js';
export { analyzeTemplateMatch } from './analyze-template-match.js';
export { collectMetricSamples } from './collect-metric-samples.js';
export {
  buildTemplateFromMetricSamples,
  mergeCuratedDroneTemplate,
} from './build-curated-template.js';
export {
  resolveTemplateMatchCatalog,
  isDroneTemplateKey,
} from './resolve-catalog.js';
export {
  DEFAULT_CURATED_DRONE_TEMPLATES,
  createDefaultTemplateMatchCatalog,
} from './default-catalog.js';
export {
  DEFAULT_FFT_SIZE,
  DEFAULT_MEASUREMENTS_COUNT,
  DEFAULT_INTERVAL_MS,
  DEFAULT_MIN_CONFIDENCE,
  DRONE_TEMPLATE_KEY_PREFIX,
} from './constants.js';
export type { MetricCollectionOptions, TemplateMatchDetectorConfig } from './types.js';
