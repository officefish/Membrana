export type {
  Bounds,
  ClassifyTrendsOptions,
  ConfidenceLevel,
  FrequencyJumpsFeatures,
  FrequencyJumpsSpec,
  MatchFieldBreakdown,
  MatchFieldCategory,
  MetricSample,
  PatternTemplate,
  SpectralThresholds,
  TemporalFeatures,
  TemporalPatternSpec,
  TemplateMatchBreakdown,
  TemplateScore,
  TrendsDetectionResult,
} from './types.js';

export { DEFAULT_FRAME_HIT_RATIO } from './types.js';

export { classifyTrends } from './classifyTrends.js';
export { soundClassFromTemplateKey } from './sound-class.js';
export { templateCountsAsDetection } from './templateCountsAsDetection.js';
export { computeTemporalFeatures } from './math/temporalFeatures.js';
export { buildTemplateMatchBreakdown } from './math/matchBreakdown.js';
export {
  computeFrameHitRatio,
  isSampleInSpectralBounds,
  scoreTemplate,
} from './math/scoring.js';
export {
  SYSTEM_TEMPLATES,
  SYSTEM_TEMPLATE_KEYS,
  getSystemTemplate,
  resolveEnabledTemplates,
} from './data/system-templates.js';
export {
  FREE_V1_CATALOG_VERSION,
  FREE_V1_NON_DRONE_TEMPLATES,
} from './data/free-v1-templates.js';
export {
  FREE_V1_CLASS_MIN_CONFIDENCE,
  FREE_V1_DRONE_FIRST_MIN_GAP,
} from './data/free-v1-calibration.js';
export {
  getTemplateFromCatalog,
  isUserTemplateKey,
  resolveTemplates,
} from './data/resolve-templates.js';
