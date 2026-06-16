import type {
  PatternTemplate,
  TemplateMatchBreakdown as TrendsBreakdown,
} from '@membrana/trends-detector-service';
import {
  mapTemplateMatchBreakdown,
  type TemplateMatchBreakdown,
  type TemplateMatchFieldRow,
  type TemplateMatchMetricSampleRow,
  type TemplateScoreRow,
} from '@membrana/detector-report';

/** Map trends-detector template-match breakdown into the detector-report DTO shape. */
export function mapTrendsTemplateMatchBreakdown(params: {
  readonly minConfidence: number;
  readonly trendsBreakdown: TrendsBreakdown;
  readonly winnerTemplate: PatternTemplate;
  readonly topScores: readonly { readonly key: string; readonly score: number }[];
  readonly templateNameByKey: ReadonlyMap<string, string>;
  readonly metricSamples: readonly {
    readonly timestamp: number;
    readonly centroid: number;
    readonly flux: number;
    readonly rms: number;
  }[];
}): TemplateMatchBreakdown {
  const fields: TemplateMatchFieldRow[] = params.trendsBreakdown.fields.map((field) => ({
    field: field.field,
    category: field.category,
    actual: field.actual,
    expected: field.expected,
    matchPercent: field.matchPercent,
    weight: field.weight,
  }));

  const topTemplates: TemplateScoreRow[] = [...params.topScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => ({
      templateKey: row.key,
      templateName: params.templateNameByKey.get(row.key) ?? null,
      score: row.score / 100,
    }));

  const metricSamples: TemplateMatchMetricSampleRow[] = params.metricSamples.map(
    (sample, index) => ({
      index,
      timestampMs: sample.timestamp,
      centroidHz: sample.centroid,
      flux: sample.flux,
      rms: sample.rms,
    }),
  );

  return mapTemplateMatchBreakdown({
    minConfidence: params.minConfidence,
    templateKey: params.trendsBreakdown.templateKey,
    templateName: params.winnerTemplate.name,
    overallScore: params.trendsBreakdown.overallScore,
    spectralScore: params.trendsBreakdown.spectralScore,
    temporalScore: params.trendsBreakdown.temporalScore,
    fields,
    topTemplates,
    metricSamples,
  });
}
