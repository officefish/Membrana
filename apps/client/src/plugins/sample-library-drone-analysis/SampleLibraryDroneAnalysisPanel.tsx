import React, { useEffect, useState } from 'react';

import { sampleLabelBadgeClass, sampleLabelTitle, useMediaLibrary } from '@membrana/media-library-service';

import { DroneDetectionReportView } from '../../components/detector-report';
import { requestSampleLibraryDroneAnalysis } from './sampleLibraryDronePluginState';
import { useSampleLibraryDroneAnalysis } from './useSampleLibraryDroneAnalysis';

export interface SampleLibraryDroneAnalysisPanelProps {
  readonly moduleId: string;
}

function formatConfidence(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export const SampleLibraryDroneAnalysisPanel: React.FC<SampleLibraryDroneAnalysisPanelProps> = ({
  moduleId: _moduleId,
}) => {
  const snapshot = useSampleLibraryDroneAnalysis();
  const { snapshot: librarySnapshot } = useMediaLibrary();
  const [detailExpanded, setDetailExpanded] = useState(false);
  const hasSample = Boolean(snapshot.selectedSampleId);
  const showResults =
    snapshot.status === 'ready' &&
    snapshot.verdicts.length > 0 &&
    snapshot.analyzedSampleId === snapshot.selectedSampleId;
  const hasDetailReport = showResults && snapshot.detectionReport !== null;

  useEffect(() => {
    setDetailExpanded(false);
  }, [snapshot.selectedSampleId, snapshot.analyzedSampleId]);

  const groundTruthSample =
    snapshot.selectedSampleId != null
      ? Object.values(librarySnapshot.samplesByCollection)
          .flat()
          .find((s) => s.id === snapshot.selectedSampleId) ?? null
      : null;

  return (
    <section
      className="card card-bordered bg-base-100 shadow-sm"
      role="region"
      aria-label="Анализ дрона по сэмплу библиотеки"
    >
      <div className="card-body gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="card-title text-base">Детекторы дрона</h3>
          <button
            type="button"
            className="btn btn-sm btn-primary ml-auto"
            disabled={!hasSample || snapshot.status === 'loading'}
            onClick={() => requestSampleLibraryDroneAnalysis()}
          >
            {snapshot.status === 'loading' ? (
              <span className="loading loading-spinner loading-xs" aria-hidden />
            ) : null}
            Анализировать
          </button>
        </div>

        {snapshot.selectedSampleTitle ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-base-content/70">
            <p>
              Сэмпл: <span className="font-medium">{snapshot.selectedSampleTitle}</span>
            </p>
            {groundTruthSample ? (
              <p className="flex items-center gap-1">
                <span className="text-base-content/50">ground truth:</span>
                <span className={sampleLabelBadgeClass(groundTruthSample.label)}>
                  {sampleLabelTitle(groundTruthSample.label)}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}

        {!hasSample ? (
          <p className="text-sm text-base-content/60">Выберите и воспроизведите сэмпл.</p>
        ) : null}

        {snapshot.status === 'error' && snapshot.errorMessage ? (
          <div className="alert alert-error text-sm" role="alert">
            {snapshot.errorMessage}
          </div>
        ) : null}

        {hasSample && snapshot.status === 'loading' ? (
          <p className="text-sm text-base-content/60" aria-live="polite">
            Анализ сэмпла…
          </p>
        ) : null}

        {hasSample && !showResults && snapshot.status !== 'loading' && snapshot.status !== 'error' ? (
          <p className="text-sm text-base-content/60">
            Дождитесь конца воспроизведения или нажмите «Анализировать».
          </p>
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
