import React, { useEffect, useState } from 'react';

import { DroneDetectionReportView } from '../../components/detector-report';

import { useMicLiveDroneAnalysis } from './useMicLiveDroneAnalysis';

export interface MicLiveDroneAnalysisPanelProps {
  readonly moduleId: string;
}

function formatConfidence(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export const MicLiveDroneAnalysisPanel: React.FC<MicLiveDroneAnalysisPanelProps> = ({
  moduleId: _moduleId,
}) => {
  const snapshot = useMicLiveDroneAnalysis();
  const [detailExpanded, setDetailExpanded] = useState(false);

  const showResults =
    snapshot.status === 'ready' &&
    snapshot.verdicts.length > 0 &&
    snapshot.analyzedSampleId === snapshot.lastSampleId;
  const hasDetailReport = showResults && snapshot.detectionReport !== null;

  useEffect(() => {
    setDetailExpanded(false);
  }, [snapshot.lastSampleId, snapshot.analyzedSampleId]);

  return (
    <section
      className="card card-bordered bg-base-100 shadow-sm"
      role="region"
      aria-label="Live-анализ дрона по клипам буфера"
    >
      <div className="card-body gap-3 p-4">
        <h3 className="card-title text-base">Анализ дрона (live)</h3>
        <p className="text-sm text-base-content/60">
          Каждый новый клип из буфера анализируется автоматически; отчёт попадает в live-журнал.
        </p>

        {snapshot.lastSampleTitle ? (
          <p className="text-sm text-base-content/70">
            Последний клип:{' '}
            <span className="font-medium tabular-nums">{snapshot.lastSampleTitle}</span>
          </p>
        ) : (
          <p className="text-sm text-base-content/60">Ожидание записи в буфер…</p>
        )}

        {snapshot.status === 'loading' ? (
          <p className="text-sm text-base-content/60 flex items-center gap-2" aria-live="polite">
            <span className="loading loading-spinner loading-xs" aria-hidden />
            Анализ клипа…
          </p>
        ) : null}

        {snapshot.status === 'error' && snapshot.errorMessage ? (
          <div className="alert alert-error text-sm" role="alert">
            {snapshot.errorMessage}
          </div>
        ) : null}

        {showResults ? (
          <div className="overflow-x-auto rounded-lg border border-base-300">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Детектор</th>
                  <th>Семейство</th>
                  <th>Дрон</th>
                  <th className="text-right">Уверенность</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.verdicts.map((verdict) => (
                  <tr key={verdict.detectorName}>
                    <td>{verdict.detectorName}</td>
                    <td>
                      <span className="badge badge-ghost badge-sm">{verdict.detectorFamily}</span>
                    </td>
                    <td>
                      <span
                        className={`badge badge-sm ${
                          verdict.isDrone ? 'badge-warning' : 'badge-ghost'
                        }`}
                      >
                        {verdict.isDrone ? 'да' : 'нет'}
                      </span>
                    </td>
                    <td className="text-right tabular-nums">
                      {formatConfidence(verdict.confidence)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {hasDetailReport ? (
          <div className="space-y-2">
            <button
              type="button"
              className="btn btn-sm btn-outline w-full sm:w-auto"
              aria-expanded={detailExpanded}
              onClick={() => setDetailExpanded((open) => !open)}
            >
              {detailExpanded ? 'Скрыть подробный отчёт' : 'Подробный отчёт'}
            </button>
            {detailExpanded && snapshot.detectionReport ? (
              <DroneDetectionReportView report={snapshot.detectionReport} />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
};
