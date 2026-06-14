import React from 'react';

import type { FftThresholdTestReport } from '../../../plugins/fft-threshold-test/buildFftThresholdTestReport';
import {
  downloadReportJson,
  downloadReportText,
} from '../../../plugins/fft-threshold-test/exportFftThresholdReport';
import { FrameTickStrip } from '../../../components/fft-reports/FrameTickStrip';

import { TelemetryJsonView } from './TelemetryJsonView';

export interface TelemetryReportCardProps {
  readonly report: FftThresholdTestReport;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly jsonPayload: Record<string, unknown>;
  readonly meta: React.ReactNode;
  readonly matrix: React.ReactNode;
}

export const TelemetryReportCard: React.FC<TelemetryReportCardProps> = ({
  report,
  expanded,
  onToggle,
  jsonPayload,
  meta,
  matrix,
}) => {
  const finishedLabel = new Date(report.finishedAt).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <article
      className={`rounded-lg border ${
        report.isDetected ? 'border-success/30 bg-success/5' : 'border-base-300 bg-base-300/20'
      }`}
    >
      <header className="flex flex-wrap items-center gap-2 p-2 min-h-10">
        <button
          type="button"
          className="flex flex-1 min-w-0 items-center gap-2 text-left min-h-10"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          <span className="text-[10px] text-base-content/50 shrink-0" aria-hidden>
            {expanded ? '▼' : '▶'}
          </span>
          <span className="text-xs text-base-content/70 tabular-nums truncate">{finishedLabel}</span>
          <FrameTickStrip frames={report.frames} />
          <span
            className={`text-xs font-semibold shrink-0 ${
              report.isDetected ? 'text-success' : 'text-base-content'
            }`}
          >
            {report.isDetected ? 'Обнаружено' : 'Не обнаружено'}
          </span>
          <span className="text-[10px] text-base-content/50 tabular-nums shrink-0">
            {report.passedCount}/{report.frameCount}
          </span>
        </button>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-10"
            onClick={(e) => {
              e.stopPropagation();
              downloadReportJson(report);
            }}
          >
            JSON
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-10"
            onClick={(e) => {
              e.stopPropagation();
              downloadReportText(report);
            }}
          >
            Текст
          </button>
        </div>
      </header>

      {expanded && (
        <div className="px-2 pb-2 space-y-2 border-t border-base-300/50 pt-2">
          {meta}
          {matrix}
          <div>
            <p className="text-[10px] text-base-content/60 mb-1">Данные (JSON)</p>
            <TelemetryJsonView value={jsonPayload} />
          </div>
        </div>
      )}
    </article>
  );
};
