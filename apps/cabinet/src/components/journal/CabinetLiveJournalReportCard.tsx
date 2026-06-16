import { useState } from 'react';
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';
import { downloadDroneDetectionReport } from '@membrana/detector-report';
import {
  FftThresholdReportView,
  TrendsFftReportView,
  fftThresholdReportFromItem,
  trendsFftReportFromItem,
} from '@membrana/journal-report-views';

import { DroneDetectionReportView } from '@/components/detector-report';
import { droneDetectionReportFromItem } from '@/lib/droneDetectionReportFromItem';

export interface CabinetLiveJournalReportCardProps {
  readonly item: LiveJournalItem;
  readonly trackTitle?: string | null;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function CabinetLiveJournalReportCard({ item, trackTitle }: CabinetLiveJournalReportCardProps) {
  const [expanded, setExpanded] = useState(false);
  const detailedReport = droneDetectionReportFromItem(item);
  const fftThresholdReport = fftThresholdReportFromItem(item);
  const trendsFftReport = trendsFftReportFromItem(item);
  const isDetected = item.report?.isDetected === true;
  const summary = item.report?.summaryText;

  if (!detailedReport && !fftThresholdReport && !trendsFftReport) {
    return (
      <article className="rounded-lg border border-base-300 bg-base-300/20 p-2 text-xs text-base-content/60">
        Отчёт {item.report?.schema ?? 'unknown'} — нет совместимого рендера
      </article>
    );
  }

  let badgeLabel = 'Отчёт';
  if (fftThresholdReport) badgeLabel = 'FFT пороговый тест';
  else if (trendsFftReport) badgeLabel = 'Анализатор тенденций FFT';

  return (
    <article
      className={`rounded-lg border ${
        isDetected ? 'border-warning/30 bg-warning/5' : 'border-base-300 bg-base-200/20'
      }`}
    >
      <header className="flex flex-wrap items-center gap-2 p-2 min-h-10">
        <button
          type="button"
          className="flex flex-1 min-w-0 items-center gap-2 text-left min-h-10"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          <span className="text-[10px] text-base-content/50 shrink-0" aria-hidden>
            {expanded ? '▼' : '▶'}
          </span>
          <span className="badge badge-secondary badge-sm">{badgeLabel}</span>
          <span className="text-xs text-base-content/70 tabular-nums">{formatTimestamp(item.timestamp)}</span>
          <span
            className={`text-xs font-semibold shrink-0 ${
              isDetected ? 'text-warning' : 'text-base-content'
            }`}
          >
            {isDetected ? 'Обнаружение' : 'Чисто'}
          </span>
          {summary ? (
            <span className="text-xs text-base-content/70 truncate">{summary}</span>
          ) : null}
          {trackTitle ? (
            <span className="text-[10px] text-base-content/50 truncate">· {trackTitle}</span>
          ) : null}
        </button>
        {detailedReport ? (
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              className="btn btn-ghost btn-xs min-h-10"
              aria-label="Экспорт отчёта JSON"
              onClick={(event) => {
                event.stopPropagation();
                downloadDroneDetectionReport(detailedReport, 'json');
              }}
            >
              JSON
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-xs min-h-10"
              aria-label="Экспорт отчёта TXT"
              onClick={(event) => {
                event.stopPropagation();
                downloadDroneDetectionReport(detailedReport, 'txt');
              }}
            >
              TXT
            </button>
          </div>
        ) : null}
      </header>
      {expanded ? (
        <div className="border-t border-base-300/50 p-2 space-y-2">
          {detailedReport ? <DroneDetectionReportView report={detailedReport} /> : null}
          {fftThresholdReport ? <FftThresholdReportView report={fftThresholdReport} /> : null}
          {trendsFftReport ? <TrendsFftReportView report={trendsFftReport} /> : null}
        </div>
      ) : null}
    </article>
  );
}
