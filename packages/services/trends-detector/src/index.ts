export type {
  Bounds,
  ClassifyTrendsOptions,
  ConfidenceLevel,
  FrequencyJumpsFeatures,
  FrequencyJumpsSpec,
  MetricSample,
  PatternTemplate,
  TemporalFeatures,
  TemporalPatternSpec,
  TemplateScore,
  TrendsDetectionResult,
} from './types.js';

export { classifyTrends } from './classifyTrends.js';
export { computeTemporalFeatures } from './math/temporalFeatures.js';
export { scoreTemplate } from './math/scoring.js';
export {
  SYSTEM_TEMPLATES,
  SYSTEM_TEMPLATE_KEYS,
  getSystemTemplate,
  resolveEnabledTemplates,
} from './data/system-templates.js';
