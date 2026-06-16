import React, { useMemo } from 'react';
import {
  buildTemplateMatchBreakdown,
  type MatchFieldBreakdown,
  type PatternTemplate,
  type TemplateMatchBreakdown,
  type TrendsDetectionResult,
} from '@membrana/trends-detector-service';

const FIELD_LABELS: Record<string, string> = {
  centroid: 'Спектральный центр (среднее)',
  flux: 'Спектральный поток (среднее)',
  rms: 'Громкость RMS (среднее)',
  frameHitRatio: 'Доля тактов в диапазоне',
  centroidStd: 'Разброс центра (σ)',
  fluxStd: 'Разброс потока (σ)',
  rmsStd: 'Разброс громкости (σ)',
  activityRatio: 'Доля активных тактов',
  avgSilenceDuration: 'Средняя пауза',
  avgBurstDuration: 'Средний всплеск',
  frequencyJumps: 'Скачки частоты',
  volumeTrend: 'Тренд громкости',
  frequencyTrend: 'Тренд частоты',
  longTermStability: 'Долгосрочная стабильность',
  periodicity: 'Периодичность',
  envelopeShape: 'Форма огибающей',
  peakToAverageRatio: 'Пик / среднее',
};

const TREND_LABELS: Record<string, string> = {
  stable: 'стабильный',
  increasing: 'растёт',
  decreasing: 'падает',
  oscillating: 'колеблется',
  modulated: 'модулирован',
  constant: 'постоянный',
  steady: 'ровный',
  high: 'высокая',
  veryHigh: 'очень высокая',
  low: 'низкая',
  veryLow: 'очень низкая',
  none: 'нет',
  irregular: 'нерегулярная',
  semiRegular: 'полурегулярная',
  regular: 'регулярная',
  sustained: 'продолжительный',
  impulsive: 'импульсный',
};

function localizeValue(value: string): string {
  return TREND_LABELS[value] ?? value;
}

function matchTone(percent: number): string {
  if (percent >= 70) return 'text-success';
  if (percent >= 40) return 'text-warning';
  return 'text-error';
}

function matchBarTone(percent: number): string {
  if (percent >= 70) return 'bg-success';
  if (percent >= 40) return 'bg-warning';
  return 'bg-error';
}

function isTrendLikeField(field: string): boolean {
  return (
    field.includes('Trend') ||
    field === 'longTermStability' ||
    field === 'periodicity' ||
    field === 'envelopeShape'
  );
}

export type TrendsMatchDetailSection = 'all' | 'spectral' | 'temporal';

export interface TrendsMatchDetailTableProps {
  readonly result: TrendsDetectionResult;
  readonly templateKey: string;
  readonly getTemplate?: (key: string) => PatternTemplate | undefined;
  readonly compact?: boolean;
  readonly section?: TrendsMatchDetailSection;
  readonly hideTemplateHeader?: boolean;
}

export function buildBreakdownForResult(
  result: TrendsDetectionResult,
  templateKey: string,
  getTemplate?: (key: string) => PatternTemplate | undefined,
): TemplateMatchBreakdown | null {
  if (!result.temporalFeatures) return null;
  const template = getTemplate?.(templateKey);
  if (!template) return null;
  return buildTemplateMatchBreakdown(result.temporalFeatures, template, result.samples);
}

export const TrendsMatchDetailTable: React.FC<TrendsMatchDetailTableProps> = ({
  result,
  templateKey,
  getTemplate,
  compact = false,
  section = 'all',
  hideTemplateHeader = false,
}) => {
  const breakdown = useMemo(
    () => buildBreakdownForResult(result, templateKey, getTemplate),
    [result, templateKey, getTemplate],
  );
  const template = getTemplate?.(templateKey);

  if (!breakdown || !template) {
    return (
      <p className="text-sm text-base-content/60">
        Нет данных для разбора совпадения с этим шаблоном.
      </p>
    );
  }

  const spectralRows = breakdown.fields.filter((row) => row.category === 'spectral');
  const temporalRows = breakdown.fields.filter((row) => row.category === 'temporal');

  const renderTable = (rows: readonly MatchFieldBreakdown[]) => (
    <div className="rounded-lg border border-base-300 overflow-x-auto">
      <table className={`table table-zebra w-full ${compact ? 'table-xs' : 'table-sm'}`}>
        <thead>
          <tr className="text-base-content/60">
            <th>Метрика</th>
            <th>Факт</th>
            <th>Ожидание шаблона</th>
            <th className="text-right">Совпадение</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.field}>
              <td className="font-medium whitespace-nowrap">
                {FIELD_LABELS[row.field] ?? row.field}
              </td>
              <td className="font-mono text-xs tabular-nums">
                {isTrendLikeField(row.field) ? localizeValue(row.actual) : row.actual}
              </td>
              <td className="text-xs text-base-content/70">
                {isTrendLikeField(row.field)
                  ? row.expected
                      .split(' | ')
                      .map((part) => localizeValue(part))
                      .join(' | ')
                  : row.expected}
              </td>
              <td className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-base-300 overflow-hidden">
                    <div
                      className={`h-full ${matchBarTone(row.matchPercent)}`}
                      style={{ width: `${row.matchPercent}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs font-semibold tabular-nums w-8 ${matchTone(row.matchPercent)}`}
                  >
                    {row.matchPercent}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSection = (
    title: string,
    rows: readonly MatchFieldBreakdown[],
    sectionScore: number,
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-base-content/70">{title}</h4>
        <span className="text-xs tabular-nums text-base-content/60">итого {sectionScore}%</span>
      </div>
      {renderTable(rows)}
    </div>
  );

  const showSpectral = section === 'all' || section === 'spectral';
  const showTemporal = section === 'all' || section === 'temporal';

  return (
    <div className="flex flex-col gap-3 min-h-0">
      {!hideTemplateHeader ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-2xl" aria-hidden>
            {template.icon}
          </span>
          <div>
            <div className="font-semibold" style={{ color: template.color }}>
              {template.name}
            </div>
            <div className="text-xs text-base-content/60">
              Общее совпадение {breakdown.overallScore}% · спектр {breakdown.spectralScore}% · время{' '}
              {breakdown.temporalScore}%
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {showSpectral
          ? section === 'all'
            ? renderSection('Спектральные метрики (30% веса)', spectralRows, breakdown.spectralScore)
            : renderTable(spectralRows)
          : null}
        {showTemporal
          ? section === 'all'
            ? renderSection('Временные паттерны (70% веса)', temporalRows, breakdown.temporalScore)
            : renderTable(temporalRows)
          : null}
      </div>
    </div>
  );
};
