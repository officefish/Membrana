import React from 'react';

import { getNeuralDroneController } from './neuralDroneAnalyzerState';
import { useNeuralDroneAnalyzer } from './useNeuralDroneAnalyzer';

export interface NeuralDroneAnalyzerPanelProps {
  readonly moduleId: string;
}

/** Топ-классы клипа из features результата (`top:<имя>` → score). */
function topClasses(features: Readonly<Record<string, number>> | undefined): [string, number][] {
  if (!features) return [];
  return Object.entries(features)
    .filter(([key]) => key.startsWith('top:'))
    .map(([key, score]): [string, number] => [key.slice(4), score])
    .sort((a, b) => b[1] - a[1]);
}

export const NeuralDroneAnalyzerPanel: React.FC<NeuralDroneAnalyzerPanelProps> = () => {
  const snapshot = useNeuralDroneAnalyzer();
  const busy = snapshot.status === 'analyzing' || snapshot.status === 'model-loading';
  const result = snapshot.lastResult;

  return (
    <div className="card card-bordered bg-base-100 shadow-sm">
      <div className="card-body gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Нейро-детекция дрона (YAMNet)</span>
            <span className="text-xs text-base-content/60">
              {snapshot.status === 'model-loading'
                ? 'Загрузка модели…'
                : snapshot.status === 'model-error'
                  ? 'Модель не загрузилась — запуск анализа повторит загрузку'
                  : snapshot.modelReady
                    ? 'Модель готова (офлайн-бандл)'
                    : 'Модель не загружена'}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy || !snapshot.selectedSampleId}
            onClick={() => getNeuralDroneController()?.analyzeSelectedSample()}
          >
            {snapshot.status === 'analyzing' ? 'Анализ…' : 'Анализировать сэмпл'}
          </button>
        </div>

        {snapshot.blockedReason ? (
          <div className="text-xs text-base-content/60">{snapshot.blockedReason}</div>
        ) : null}

        {(snapshot.status === 'error' || snapshot.status === 'model-error') &&
        snapshot.errorMessage ? (
          <div
            className={`alert ${snapshot.status === 'model-error' ? 'alert-warning' : 'alert-error'} py-2 text-xs`}
            role="alert"
          >
            {snapshot.errorMessage}
          </div>
        ) : null}

        {result && snapshot.status === 'ready' ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`badge ${result.isDrone ? 'badge-error' : 'badge-success'} badge-lg font-semibold`}
              >
                {result.isDrone ? 'Дрон' : 'Не дрон'}
              </span>
              <span className="text-sm tabular-nums">
                score {(result.confidence * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-base-content/50 tabular-nums">
                {result.latencyMs.toFixed(0)} мс
              </span>
            </div>
            {snapshot.analyzedSampleTitle ? (
              <div className="text-xs text-base-content/60">
                Сэмпл: {snapshot.analyzedSampleTitle}
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-base-content/50">
                Топ-классы AudioSet
              </span>
              {topClasses(result.features).map(([name, score]) => (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <span className="w-48 truncate" title={name}>
                    {name}
                  </span>
                  <progress
                    className="progress progress-primary h-1.5 flex-1"
                    value={Math.round(score * 100)}
                    max={100}
                    aria-label={`${name}: ${(score * 100).toFixed(1)}%`}
                  />
                  <span className="w-10 text-right tabular-nums">{(score * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
