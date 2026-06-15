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
  getTemplateFromCatalog,
  isUserTemplateKey,
  resolveTemplates,
} from './data/resolve-templates.js';
