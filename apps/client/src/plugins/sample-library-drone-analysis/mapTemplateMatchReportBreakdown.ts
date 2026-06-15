import type { PatternTemplate, TemplateMatchBreakdown as TrendsBreakdown } from '@membrana/trends-detector-service';
import {
  mapTemplateMatchBreakdown,
  type TemplateMatchBreakdown,
  type TemplateMatchFieldRow,
  type TemplateScoreRow,
} from '@membrana/detector-report';

export function mapTrendsTemplateMatchBreakdown(params: {
  readonly minConfidence: number;
  readonly trendsBreakdown: TrendsBreakdown;
  readonly winnerTemplate: PatternTemplate;
  readonly topScores: readonly { readonly key: string; readonly score: number }[];
  readonly templateNameByKey: ReadonlyMap<string, string>;
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

  return mapTemplateMatchBreakdown({
    minConfidence: params.minConfidence,
    templateKey: params.trendsBreakdown.templateKey,
    templateName: params.winnerTemplate.name,
    overallScore: params.trendsBreakdown.overallScore,
    spectralScore: params.trendsBreakdown.spectralScore,
    temporalScore: params.trendsBreakdown.temporalScore,
    fields,
    topTemplates,
  });
}
