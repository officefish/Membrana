import React, { useCallback, useState } from 'react';
import type { DroneDetectionReport } from '@membrana/detector-report';
import {
  downloadDroneDetectionReport,
  exportDroneDetectionReportJson,
} from '@membrana/detector-report';

import { DroneDetectorReportSection } from './DroneDetectorReportSection';
import { shortenReportId } from './detectorReportUi';

export interface DroneDetectionReportViewProps {
  readonly report: DroneDetectionReport;
}

export const DroneDetectionReportView: React.FC<DroneDetectionReportViewProps> = ({ report }) => {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const copyReportId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(report.meta.reportId);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1500);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 2000);
    }
  }, [report.meta.reportId]);

  const consensusDrone = report.verdicts.some((section) => section.isDrone);

  return (
    <article
      className={`rounded-lg border ${
        consensusDrone ? 'border-warning/30 bg-warning/5' : 'border-base-300 bg-base-200/20'
      }`}
      aria-label="Подробный отчёт детекторов дрона"
    >
      <header className="flex flex-wrap items-start gap-3 border-b border-base-300/60 p-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-base-content/50">ID отчёта</span>
            <code className="rounded bg-base-300/50 px-1.5 py-0.5 font-mono text-xs">
              {shortenReportId(report.meta.reportId)}
            </code>
            <button
              type="button"
              className="btn btn-ghost btn-xs min-h-8"
              onClick={() => void copyReportId()}
            >
              {copyState === 'copied' ? 'Скопировано' : copyState === 'error' ? 'Ошибка' : 'Копировать'}
            </button>
          </div>
          <p className="text-sm text-base-content/80">
            <span className="text-base-content/50">Создан (МСК): </span>
            {report.meta.createdAtMoscow}
          </p>
          {report.meta.sampleTitle ? (
            <p className="text-sm text-base-content/70">
              Сэмпл: <span className="font-medium">{report.meta.sampleTitle}</span>
              <span className="ml-2 tabular-nums text-base-content/50">
                {report.meta.sampleRate} Гц · {report.meta.sampleDurationSec.toFixed(2)} с
              </span>
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-8"
            onClick={() => downloadDroneDetectionReport(report, 'json')}
          >
            JSON
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-8"
            onClick={() => downloadDroneDetectionReport(report, 'txt')}
          >
            TXT
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-8"
            title="Скопировать JSON в буфер"
            onClick={() => void navigator.clipboard.writeText(exportDroneDetectionReportJson(report))}
          >
            Copy JSON
          </button>
        </div>
      </header>

      <div className="space-y-2 p-3">
        <p className="text-xs text-base-content/60">
          Схема {report.meta.schemaVersion} · {report.verdicts.length} детектор(а)
        </p>
        {report.verdicts.map((section, index) => (
          <DroneDetectorReportSection
            key={section.detectorName}
            section={section}
            defaultOpen={index === 0}
          />
        ))}
      </div>
    </article>
  );
};
