import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMembranaStore } from '@membrana/agenda';

import { DroneDetectionReportView } from '../../components/detector-report';

import { micLiveDronePluginState, requestStartManualStreamWindow } from './micLiveDronePluginState';
import { requestDetailedDroneReport } from './requestDetailedDroneReport';
import {
  MIC_LIVE_DRONE_ANALYSIS_MODE_LABELS,
  MIC_LIVE_DRONE_ANALYSIS_PLUGIN_ID,
  resolveMicLiveDroneAnalysisConfig,
  type MicLiveDroneAnalysisMode,
  type MicLiveDroneAnalysisPluginConfig,
} from './types';
import { useMicLiveDroneAnalysis } from './useMicLiveDroneAnalysis';

export interface MicLiveDroneAnalysisPanelProps {
  readonly moduleId: string;
}

function formatConfidence(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function streamPhaseLabel(
  phase: ReturnType<typeof useMicLiveDroneAnalysis>['streamPhase'],
): string {
  switch (phase) {
    case 'collecting':
      return 'Сбор потока…';
    case 'finalizing':
      return 'Формирование отчёта…';
    case 'pause':
      return 'Пауза до следующего цикла…';
    default:
      return 'Ожидание потока…';
  }
}

export const MicLiveDroneAnalysisPanel: React.FC<MicLiveDroneAnalysisPanelProps> = ({
  moduleId,
}) => {
  const snapshot = useMicLiveDroneAnalysis();
  const rawConfig = useMembranaStore((s) =>
    s.getPlugin(moduleId, MIC_LIVE_DRONE_ANALYSIS_PLUGIN_ID)?.config,
  );
  const updatePluginConfig = useMembranaStore((s) => s.updatePluginConfig);
  const config = useMemo(
    () => resolveMicLiveDroneAnalysisConfig(rawConfig),
    [rawConfig],
  );
  const [detailExpanded, setDetailExpanded] = useState(false);
  const [detailRequestMessage, setDetailRequestMessage] = useState<string | null>(null);

  useEffect(() => {
    micLiveDronePluginState.syncConfig({
      analysisMode: config.analysisMode,
      streamWindowSec: config.streamWindowSec,
      streamPauseSec: config.streamPauseSec,
    });
  }, [config]);

  useEffect(() => {
    setDetailExpanded(false);
  }, [snapshot.lastSampleId, snapshot.analyzedSampleId, snapshot.lastStreamReportId]);

  const patchConfig = useCallback(
    (updates: Partial<MicLiveDroneAnalysisPluginConfig>) => {
      updatePluginConfig<MicLiveDroneAnalysisPluginConfig>(
        moduleId,
        MIC_LIVE_DRONE_ANALYSIS_PLUGIN_ID,
        updates,
      );
    },
    [moduleId, updatePluginConfig],
  );

  const isStreamMode =
    config.analysisMode === 'stream-manual' || config.analysisMode === 'stream-auto';
  const isTrackImport = config.analysisMode === 'track-import';

  const showTrackResults =
    isTrackImport &&
    snapshot.status === 'ready' &&
    snapshot.verdicts.length > 0 &&
    snapshot.analyzedSampleId === snapshot.lastSampleId;

  const showStreamResults =
    isStreamMode &&
    snapshot.status === 'ready' &&
    snapshot.verdicts.length > 0 &&
    snapshot.briefReport !== null;

  const showResults = showTrackResults || showStreamResults;
  const hasDetailedReport = snapshot.detailedReport !== null;
  const briefReport = snapshot.briefReport;
  const canRequestDetailed =
    isTrackImport &&
    briefReport !== null &&
    snapshot.lastSampleId !== null &&
    snapshot.lastJournalTrackId !== null &&
    briefReport.meta.detailedReportStatus !== 'pending';

  const handleRequestDetailed = useCallback(async () => {
    if (!briefReport || !snapshot.lastSampleId) return;
    setDetailRequestMessage(null);
    micLiveDronePluginState.setDetailedReportPending(briefReport.meta.reportId);
    const result = await requestDetailedDroneReport({
      moduleId,
      briefReport,
      sampleId: snapshot.lastSampleId,
      journalTrackId: snapshot.lastJournalTrackId,
    });
    if (result.message) {
      setDetailRequestMessage(result.message);
    }
  }, [briefReport, moduleId, snapshot.lastJournalTrackId, snapshot.lastSampleId]);

  const windowProgressPct = Math.min(
    100,
    (snapshot.streamElapsedMs / (snapshot.streamWindowSec * 1000)) * 100,
  );

  const canStartManual =
    config.analysisMode === 'stream-manual' &&
    snapshot.streamLive &&
    snapshot.streamPhase !== 'collecting' &&
    snapshot.streamPhase !== 'finalizing';

  return (
    <section
      className="card card-bordered bg-base-100 shadow-sm"
      role="region"
      aria-label="Live-анализ дрона"
    >
      <div className="card-body gap-3 p-4">
        <h3 className="card-title text-base">Анализ дрона (live)</h3>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Режим анализа">
          {(['stream-manual', 'stream-auto', 'track-import'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`btn btn-sm ${
                config.analysisMode === mode ? 'btn-primary' : 'btn-outline'
              }`}
              aria-pressed={config.analysisMode === mode}
              onClick={() => patchConfig({ analysisMode: mode as MicLiveDroneAnalysisMode })}
            >
              {MIC_LIVE_DRONE_ANALYSIS_MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        {isStreamMode ? (
          <p className="text-sm text-base-content/60">
            Краткий отчёт с микрофона: окно {config.streamWindowSec} с, пауза{' '}
            {config.streamPauseSec} с. Подробный DDR — только для клипов буфера (сервер).
          </p>
        ) : (
          <p className="text-sm text-base-content/60">
            Краткий отчёт по каждому клипу буфера; подробный DDR — по запросу на сервер.
          </p>
        )}

        {isStreamMode ? (
          <div className="space-y-2" aria-live="polite">
            <p className="text-sm text-base-content/70">
              Поток: {snapshot.streamLive ? 'активен' : 'ожидание микрофона…'}
            </p>
            {(snapshot.streamPhase === 'collecting' ||
              snapshot.streamPhase === 'finalizing' ||
              snapshot.streamPhase === 'pause') && (
              <div className="space-y-1">
                <p className="text-sm text-base-content/60">{streamPhaseLabel(snapshot.streamPhase)}</p>
                {snapshot.streamPhase === 'collecting' ? (
                  <progress
                    className="progress progress-primary w-full"
                    value={windowProgressPct}
                    max={100}
                    aria-label="Прогресс окна анализа"
                  />
                ) : null}
              </div>
            )}
            {config.analysisMode === 'stream-manual' ? (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={!canStartManual}
                onClick={() => requestStartManualStreamWindow()}
              >
                Старт окна ({config.streamWindowSec} с)
              </button>
            ) : null}
          </div>
        ) : null}

        {isTrackImport ? (
          snapshot.lastSampleTitle ? (
            <p className="text-sm text-base-content/70">
              Последний клип:{' '}
              <span className="font-medium tabular-nums">{snapshot.lastSampleTitle}</span>
            </p>
          ) : (
            <p className="text-sm text-base-content/60">Ожидание записи в буфер…</p>
          )
        ) : null}

        {snapshot.status === 'loading' && isTrackImport ? (
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
          <>
            <p className="text-xs text-base-content/50">Формат: краткий (drone-detection-brief/v1)</p>
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
          </>
        ) : null}

        {showResults && canRequestDetailed ? (
          <button
            type="button"
            className="btn btn-sm btn-outline w-full sm:w-auto"
            disabled={briefReport?.meta.detailedReportStatus === 'pending'}
            onClick={() => void handleRequestDetailed()}
          >
            {briefReport?.meta.detailedReportStatus === 'pending'
              ? 'Подробный отчёт готовится…'
              : 'Запросить подробный отчёт (сервер)'}
          </button>
        ) : null}

        {detailRequestMessage ? (
          <p className="text-xs text-base-content/60" role="status">
            {detailRequestMessage}
          </p>
        ) : null}

        {hasDetailedReport ? (
          <div className="space-y-2">
            <button
              type="button"
              className="btn btn-sm btn-outline w-full sm:w-auto"
              aria-expanded={detailExpanded}
              onClick={() => setDetailExpanded((open) => !open)}
            >
              {detailExpanded ? 'Скрыть подробный отчёт' : 'Подробный отчёт (DDR)'}
            </button>
            {detailExpanded && snapshot.detailedReport ? (
              <DroneDetectionReportView report={snapshot.detailedReport} />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
};
