import React, { useState } from 'react';
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import { DroneDetectionReportView } from '@/components/detector-report';

import { droneDetectionBriefFromItem } from '../adapters/droneDetectionBriefFromItem';
import { droneDetectionReportFromItem } from '../adapters/droneDetectionReportFromItem';
import { fftThresholdReportFromItem } from '../adapters/fftThresholdReportFromItem';
import { trendsFftReportFromItem } from '../adapters/trendsFftReportFromItem';

export interface LiveJournalReportCardProps {
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

function BriefVerdictTable({
  item,
}: {
  readonly item: NonNullable<ReturnType<typeof droneDetectionBriefFromItem>>;
}): React.ReactElement {
  return (
    <table className="table table-xs w-full">
      <thead>
        <tr>
          <th>Детектор</th>
          <th>Дрон</th>
          <th className="text-right">Уверенность</th>
        </tr>
      </thead>
      <tbody>
        {item.verdicts.map((verdict) => (
          <tr key={verdict.detectorName}>
            <td>{verdict.detectorName}</td>
            <td>{verdict.isDrone ? 'да' : 'нет'}</td>
            <td className="text-right tabular-nums">{(verdict.confidence * 100).toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FftThresholdView({
  report,
}: {
  readonly report: NonNullable<ReturnType<typeof fftThresholdReportFromItem>>;
}): React.ReactElement {
  return (
    <div className="space-y-1 text-xs">
      <p className="text-base-content/70">
        Режим: {report.mode === 'manual' ? 'ручной' : 'авто'} · строгость: {report.strictness} ·
        интервал {report.intervalMs} мс
      </p>
      <p className="text-base-content/70 tabular-nums">
        Прошли порог: {report.passedCount}/{report.frameCount} ({Math.round(report.passRate * 100)}%)
      </p>
      {report.frames.length > 0 ? (
        <table className="table table-xs w-full">
          <thead>
            <tr>
              <th>#</th>
              <th className="text-right">Центроид, Гц</th>
              <th className="text-right">Поток</th>
              <th className="text-right">RMS</th>
              <th>Кадр</th>
            </tr>
          </thead>
          <tbody>
            {report.frames.map((frame) => (
              <tr key={frame.index}>
                <td>{frame.index + 1}</td>
                <td className="text-right tabular-nums">{Math.round(frame.centroidHz)}</td>
                <td className="text-right tabular-nums">{frame.fluxRaw.toFixed(3)}</td>
                <td className="text-right tabular-nums">{frame.rmsRaw.toFixed(3)}</td>
                <td>{frame.framePassed ? '✓' : '✗'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

function TrendsFftView({
  report,
}: {
  readonly report: NonNullable<ReturnType<typeof trendsFftReportFromItem>>;
}): React.ReactElement {
  return (
    <div className="space-y-1 text-xs">
      <p className="text-base-content/70">
        {report.detectedStateIcon} {report.detectedStateName} · уверенность{' '}
        {Math.round(report.confidence)}% ({report.confidenceLevel})
      </p>
      <p className="text-base-content/70">
        Режим: {report.mode === 'manual' ? 'ручной' : 'авто'} · замеров:{' '}
        {report.measurementsCount} · интервал {report.intervalMs} мс
      </p>
    </div>
  );
}

export const LiveJournalReportCard: React.FC<LiveJournalReportCardProps> = ({
  item,
  trackTitle,
}) => {
  const [expanded, setExpanded] = useState(false);
  const detailedReport = droneDetectionReportFromItem(item);
  const briefReport = droneDetectionBriefFromItem(item);
  const fftThresholdReport = fftThresholdReportFromItem(item);
  const trendsFftReport = trendsFftReportFromItem(item);
  const isDetected = item.report?.isDetected === true;
  const summary = item.report?.summaryText;
  const isBrief = briefReport !== null;

  let badgeLabel = 'Отчёт';
  if (isBrief) badgeLabel = 'Краткий отчёт';
  else if (fftThresholdReport) badgeLabel = 'FFT порог';
  else if (trendsFftReport) badgeLabel = 'Тенденции FFT';

  if (!detailedReport && !briefReport && !fftThresholdReport && !trendsFftReport) {
    return (
      <article className="rounded-lg border border-base-300 bg-base-300/20 p-2 text-xs text-base-content/60">
        Отчёт {item.report?.schema ?? 'unknown'} — нет совместимого рендера
      </article>
    );
  }

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
      </header>
      {expanded ? (
        <div className="border-t border-base-300/50 p-2 space-y-2">
          {briefReport ? <BriefVerdictTable item={briefReport} /> : null}
          {briefReport && briefReport.meta.detailedReportStatus === 'pending' ? (
            <p className="text-xs text-base-content/60">Подробный отчёт готовится на сервере…</p>
          ) : null}
          {detailedReport ? <DroneDetectionReportView report={detailedReport} /> : null}
          {briefReport && !detailedReport ? (
            <p className="text-xs text-base-content/50">
              Подробный DDR (template-match, таблицы кадров) — по запросу на сервер (LP1b).
            </p>
          ) : null}
          {fftThresholdReport ? <FftThresholdView report={fftThresholdReport} /> : null}
          {trendsFftReport ? <TrendsFftView report={trendsFftReport} /> : null}
        </div>
      ) : null}
    </article>
  );
};
