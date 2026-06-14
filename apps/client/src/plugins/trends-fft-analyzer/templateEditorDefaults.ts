import {
  DEFAULT_FRAME_HIT_RATIO,
  type PatternTemplate,
  type TemporalPatternSpec,
} from '@membrana/trends-detector-service';

export const USER_TEMPLATE_KEY_PREFIX = 'user:';

export const TREND_OPTIONS = [
  'stable',
  'increasing',
  'decreasing',
  'oscillating',
] as const;

export const STABILITY_OPTIONS = [
  'veryLow',
  'low',
  'medium',
  'high',
  'veryHigh',
] as const;

export const PERIODICITY_OPTIONS = [
  'none',
  'irregular',
  'semiRegular',
  'regular',
] as const;

export const ENVELOPE_OPTIONS = [
  'impulsive',
  'attackDecay',
  'sustained',
  'pluck',
  'complex',
] as const;

export const FRAME_HIT_RATIO_PERCENT_MIN = 50;
export const FRAME_HIT_RATIO_PERCENT_MAX = 80;

export function isUserTemplateKey(key: string): boolean {
  return key.startsWith(USER_TEMPLATE_KEY_PREFIX);
}

export function slugifyTemplateName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || 'template';
}

export function makeUserTemplateKey(name: string, existingKeys: readonly string[]): string {
  const base = `${USER_TEMPLATE_KEY_PREFIX}${slugifyTemplateName(name)}`;
  if (!existingKeys.includes(base)) return base;
  let index = 2;
  while (existingKeys.includes(`${base}-${index}`)) index++;
  return `${base}-${index}`;
}

export function createEmptyUserTemplate(existingKeys: readonly string[]): PatternTemplate {
  const name = 'Новый шаблон';
  return {
    key: makeUserTemplateKey(name, existingKeys),
    name,
    icon: '🎵',
    color: '#7c9cff',
    description: '',
    thresholds: {
      centroid: { min: 200, max: 2000 },
      flux: { min: 0.1, max: 1.0 },
      rms: { min: 0.02, max: 0.25 },
      frameHitRatio: { ...DEFAULT_FRAME_HIT_RATIO },
    },
    temporalPatterns: {
      volumeTrend: ['stable'],
      frequencyTrend: ['stable'],
      longTermStability: ['medium'],
      periodicity: ['none'],
      envelopeShape: ['sustained'],
    },
  };
}

export function cloneTemplateForUser(
  source: PatternTemplate,
  existingKeys: readonly string[],
): PatternTemplate {
  const name = `${source.name} (копия)`;
  return {
    ...structuredClone(source),
    key: makeUserTemplateKey(name, existingKeys),
    name,
  };
}

export function normalizeFrameHitRatioPercent(minPercent: number, maxPercent: number): {
  min: number;
  max: number;
} {
  const min = Math.min(
    FRAME_HIT_RATIO_PERCENT_MAX,
    Math.max(FRAME_HIT_RATIO_PERCENT_MIN, Math.round(minPercent)),
  );
  const max = Math.min(
    FRAME_HIT_RATIO_PERCENT_MAX,
    Math.max(min, Math.round(maxPercent)),
  );
  return { min: min / 100, max: max / 100 };
}

export function emptyTemporalPatterns(): TemporalPatternSpec {
  return {};
}
