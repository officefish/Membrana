import React from 'react';
import type { DroneDetectorVerdictSection } from '@membrana/detector-report';

import {
  DRONE_DETECTOR_LABELS,
  formatConfidencePercent,
  formatSectionDetailHint,
  formatTimestampSec,
} from './detectorReportUi';
import { TemplateMatchFieldsTable } from './TemplateMatchFieldsTable';

function tickBadge(isDrone: boolean): React.ReactNode {
  return (
    <span className={`badge badge-sm ${isDrone ? 'badge-warning' : 'badge-ghost'}`}>
      {isDrone ? 'да' : 'нет'}
    </span>
  );
}

export interface DroneDetectorReportSectionProps {
  readonly section: DroneDetectorVerdictSection;
  readonly defaultOpen?: boolean;
}

export const DroneDetectorReportSection: React.FC<DroneDetectorReportSectionProps> = ({
  section,
  defaultOpen = true,
}) => {
  const { breakdown } = section;

  return (
    <details
      className="rounded-lg border border-base-300 bg-base-200/30"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base-content/50" aria-hidden>
            ▸
          </span>
          <span>{DRONE_DETECTOR_LABELS[section.detectorName]}</span>
          {tickBadge(section.isDrone)}
          <span className="text-xs tabular-nums text-base-content/60">
            {formatConfidencePercent(section.confidence)}
          </span>
          <span className="text-xs text-base-content/50">
            · {formatSectionDetailHint(section)}
          </span>
        </div>
      </summary>
      <div className="space-y-3 border-t border-base-300/60 px-4 pb-4 pt-3 text-sm">
        {section.reasoning ? (
          <p className="text-base-content/70">{section.reasoning}</p>
        ) : null}
        {section.aggregation ? (
          <p className="text-xs text-base-content/60">Агрегация: {section.aggregation}</p>
        ) : null}
        {section.sampleConfidenceThreshold !== undefined ? (
          <p className="text-xs text-base-content/60">
            Порог уверенности: {formatConfidencePercent(section.sampleConfidenceThreshold)}
          </p>
        ) : null}

        {breakdown.kind === 'harmonic' ||
        breakdown.kind === 'cepstral' ||
        breakdown.kind === 'spectral-flux' ? (
          <p className="text-xs text-base-content/60">
            Покадровые метрики — в общей таблице FFT-кадров выше.
          </p>
        ) : null}

        {breakdown.kind === 'template-match' ? (
          <div className="space-y-3">
            <div className="text-xs text-base-content/70">
              <div>
                Победитель:{' '}
                <span className="font-medium text-base-content">
                  {breakdown.winner.templateName ?? breakdown.winner.templateKey}
                </span>
              </div>
              <div className="tabular-nums">
                Оценка {formatConfidencePercent(breakdown.winner.overallScore)} · спектр{' '}
                {formatConfidencePercent(breakdown.winner.spectralScore)} · время{' '}
                {formatConfidencePercent(breakdown.winner.temporalScore)}
              </div>
              <div>Порог: {formatConfidencePercent(breakdown.minConfidence)}</div>
            </div>
            <TemplateMatchFieldsTable fields={breakdown.fields} />
            {breakdown.metricSamples.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-base-300">
                <table className="table table-xs w-full">
                  <thead>
                    <tr className="text-base-content/60">
                      <th>№</th>
                      <th>t (с)</th>
                      <th>centroid (Гц)</th>
                      <th>flux</th>
                      <th>rms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.metricSamples.map((row) => (
                      <tr key={row.index}>
                        <td className="tabular-nums">{row.index + 1}</td>
                        <td className="tabular-nums">{formatTimestampSec(row.timestampMs)}</td>
                        <td className="tabular-nums">{row.centroidHz.toFixed(0)}</td>
                        <td className="tabular-nums">{row.flux.toFixed(3)}</td>
                        <td className="tabular-nums">{row.rms.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {breakdown.topTemplates.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-base-300">
                <table className="table table-xs w-full">
                  <thead>
                    <tr className="text-base-content/60">
                      <th>Шаблон</th>
                      <th className="text-right">Оценка</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.topTemplates.map((row) => (
                      <tr key={row.templateKey}>
                        <td>{row.templateName ?? row.templateKey}</td>
                        <td className="text-right tabular-nums">
                          {formatConfidencePercent(row.score)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </details>
  );
};
