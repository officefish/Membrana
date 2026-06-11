import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMembranaStore } from '@membrana/agenda';

import { QuickPresetButtons } from './components/QuickPresetButtons';
import { TrendsFrameTicks } from './components/TrendsFrameTicks';
import { TrendsTemplateList } from './components/TrendsTemplateList';
import {
  INTERVAL_MS_MAX,
  INTERVAL_MS_MIN,
  INTERVAL_MS_PRESETS,
  MEASUREMENTS_MAX,
  MEASUREMENTS_MIN,
  MEASUREMENT_COUNT_PRESETS,
  analysisDurationSec,
} from './measurementPresets';
import {
  requestStartManualTrendsCollection,
  requestStopTrendsCollection,
  trendsFftPluginState,
} from './trendsFftPluginState';
import { useTrendsFftAnalyzer } from './useTrendsFftAnalyzer';
import {
  TRENDS_FFT_ANALYZER_PLUGIN_ID,
  resolveTrendsFftAnalyzerConfig,
  type TrendsDetectionMode,
  type TrendsFftAnalyzerPluginConfig,
} from './types';

type PanelTab = 'detector' | 'templates';

export interface TrendsFftLabViewProps {
  readonly moduleId: string;
  readonly layout?: 'panel' | 'fullscreen';
  readonly footer?: React.ReactNode;
}

export const TrendsFftLabView: React.FC<TrendsFftLabViewProps> = ({
  moduleId,
  layout = 'panel',
  footer,
}) => {
  const isFullscreen = layout === 'fullscreen';
  const snapshot = useTrendsFftAnalyzer();
  const rawConfig = useMembranaStore((s) =>
    s.getPlugin(moduleId, TRENDS_FFT_ANALYZER_PLUGIN_ID)?.config,
  );
  const updatePluginConfig = useMembranaStore((s) => s.updatePluginConfig);
  const config = useMemo(
    () => resolveTrendsFftAnalyzerConfig(rawConfig),
    [rawConfig],
  );
  const [activeTab, setActiveTab] = useState<PanelTab>('detector');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    trendsFftPluginState.syncConfig({
      mode: config.detectionMode,
      measurementsCount: config.measurementsCount,
      intervalMs: config.intervalMs,
      minRms: config.minRms,
    });
  }, [
    config.detectionMode,
    config.measurementsCount,
    config.intervalMs,
    config.minRms,
  ]);

  const patchConfig = useCallback(
    (updates: Partial<TrendsFftAnalyzerPluginConfig>) => {
      updatePluginConfig<TrendsFftAnalyzerPluginConfig>(
        moduleId,
        TRENDS_FFT_ANALYZER_PLUGIN_ID,
        updates,
      );
    },
    [moduleId, updatePluginConfig],
  );

  const setMode = useCallback(
    (detectionMode: TrendsDetectionMode) => {
      patchConfig({ detectionMode });
    },
    [patchConfig],
  );

  const toggleTemplate = useCallback(
    (key: string, enabled: boolean) => {
      const set = new Set(config.enabledTemplateKeys);
      if (enabled) set.add(key);
      else set.delete(key);
      const next = [...set];
      patchConfig({
        enabledTemplateKeys: next.length > 0 ? next : config.enabledTemplateKeys,
      });
    },
    [config.enabledTemplateKeys, patchConfig],
  );

  const isCollecting = snapshot.phase === 'collecting';
  const activeIndex = Math.min(
    snapshot.collectedCount,
    Math.max(0, snapshot.measurementsCount - 1),
  );
  const durationSec = analysisDurationSec(config.measurementsCount, config.intervalMs);
  const result = snapshot.lastResult;

  return (
    <div
      className={`flex flex-col min-h-0 ${isFullscreen ? 'h-full gap-4' : 'gap-3'}`}
    >
      <div className="flex flex-wrap gap-2 border-b border-base-300 pb-2 shrink-0">
        <button
          type="button"
          className={`btn btn-xs min-h-8 ${activeTab === 'detector' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('detector')}
        >
          Детектор
        </button>
        <button
          type="button"
          className={`btn btn-xs min-h-8 ${activeTab === 'templates' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('templates')}
        >
          Шаблоны ({config.enabledTemplateKeys.length})
        </button>
      </div>

      {activeTab === 'templates' ? (
        <div className={isFullscreen ? 'flex-1 min-h-0 overflow-y-auto' : undefined}>
          <TrendsTemplateList
            enabledKeys={config.enabledTemplateKeys}
            onToggle={toggleTemplate}
          />
        </div>
      ) : (
        <div
          className={`flex flex-col gap-3 min-h-0 ${
            isFullscreen ? 'flex-1' : ''
          }`}
        >
          <div className="flex flex-wrap gap-1 rounded-lg bg-base-200/50 p-1 shrink-0">
            <button
              type="button"
              className={`btn btn-xs flex-1 min-h-9 ${config.detectionMode === 'auto' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('auto')}
            >
              Авторежим
            </button>
            <button
              type="button"
              className={`btn btn-xs flex-1 min-h-9 ${config.detectionMode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('manual')}
            >
              Ручной
            </button>
          </div>

          <div className="flex items-start justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <h3
                className={
                  isFullscreen ? 'text-2xl font-bold' : 'card-title text-base'
                }
              >
                Анализатор тенденций FFT
              </h3>
              <p className="text-xs text-base-content/60">
                <span
                  className={`inline-block h-2 w-2 rounded-full mr-1 align-middle ${
                    snapshot.live
                      ? isCollecting
                        ? 'bg-success animate-pulse'
                        : 'bg-primary'
                      : 'bg-base-content/30'
                  }`}
                  aria-hidden
                />
                {snapshot.live
                  ? config.detectionMode === 'auto'
                    ? isCollecting
                      ? 'Автоанализ: сбор замеров'
                      : snapshot.phase === 'result'
                        ? 'Автоанализ: пауза перед следующим циклом'
                        : 'Автоанализ: ожидание'
                    : isCollecting
                      ? 'Ручной сбор замеров'
                      : 'Ручной режим: нажмите Старт'
                  : 'Запустите поток микрофона в модуле'}
              </p>
            </div>
            {config.detectionMode === 'manual' && (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  className="btn btn-primary btn-sm min-h-9"
                  disabled={!snapshot.live || isCollecting}
                  onClick={requestStartManualTrendsCollection}
                >
                  Старт
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm min-h-9"
                  disabled={!isCollecting}
                  onClick={requestStopTrendsCollection}
                >
                  Стоп
                </button>
              </div>
            )}
          </div>

          <section
            className={`flex flex-col gap-2 min-w-0 min-h-0 ${
              isFullscreen ? 'flex-1' : ''
            }`}
            aria-label="Прогресс замеров"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-base-content/70 shrink-0">
              <span>
                Замеры: {snapshot.collectedCount} / {snapshot.measurementsCount}
              </span>
              <span>
                {config.intervalMs} мс · ≈ {durationSec.toFixed(1)} с/цикл
              </span>
            </div>
            <progress
              className="progress progress-primary w-full shrink-0"
              value={snapshot.collectedCount}
              max={snapshot.measurementsCount}
              aria-label="Прогресс сбора"
            />
            <div
              className={
                isFullscreen
                  ? 'flex-1 min-h-[8rem] overflow-y-auto overflow-x-hidden'
                  : 'min-w-0'
              }
            >
              <TrendsFrameTicks
                total={snapshot.measurementsCount}
                states={snapshot.tickStates}
                activeIndex={activeIndex}
                isCollecting={isCollecting}
                density={isFullscreen ? 'comfortable' : 'compact'}
              />
            </div>
          </section>

          {snapshot.currentSample && isCollecting && (
            <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums shrink-0">
              <div className="rounded-box bg-base-200/60 p-2">
                <div className="text-base-content/50">centroid</div>
                <div>{snapshot.currentSample.centroid.toFixed(0)} Hz</div>
              </div>
              <div className="rounded-box bg-base-200/60 p-2">
                <div className="text-base-content/50">flux</div>
                <div>{snapshot.currentSample.flux.toFixed(3)}</div>
              </div>
              <div className="rounded-box bg-base-200/60 p-2">
                <div className="text-base-content/50">rms</div>
                <div>{snapshot.currentSample.rms.toFixed(4)}</div>
              </div>
            </div>
          )}

          <div
            className={`rounded-box border border-base-300 bg-base-200/40 shrink-0 ${
              isFullscreen ? 'p-4' : 'p-3'
            }`}
            role="status"
            aria-live="polite"
          >
            {result ? (
              <div className="flex items-center gap-3">
                <span
                  className={isFullscreen ? 'text-5xl' : 'text-3xl'}
                  aria-hidden
                >
                  {result.detectedStateIcon}
                </span>
                <div>
                  <div className={isFullscreen ? 'text-xl font-semibold' : 'font-semibold'}>
                    {result.detectedStateName}
                  </div>
                  <div className="text-sm text-base-content/70">
                    Уверенность: {result.confidence}% ({result.confidenceLevel})
                  </div>
                  {!result.isDetected && (
                    <div className="text-xs text-warning mt-1">
                      Ниже порога minConfidence ({config.minConfidence}%)
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-base-content/60">
                {isCollecting
                  ? 'Сбор метрик для классификации по шаблонам…'
                  : 'Результат появится после полного окна замеров'}
              </p>
            )}
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-8 w-full shrink-0"
            aria-expanded={showSettings}
            onClick={() => setShowSettings((v) => !v)}
          >
            {showSettings
              ? 'Скрыть параметры окна'
              : 'Параметры окна (замеры и интервал)'}
          </button>

          {showSettings ? (
            <div className="rounded-box border border-base-300 bg-base-200/30 p-3 space-y-3 shrink-0 max-h-64 overflow-y-auto">
              <QuickPresetButtons
                label={`Замеров (${MEASUREMENTS_MIN}–${MEASUREMENTS_MAX})`}
                values={MEASUREMENT_COUNT_PRESETS}
                current={config.measurementsCount}
                disabled={isCollecting}
                onSelect={(measurementsCount) => patchConfig({ measurementsCount })}
              />
              <label className="form-control">
                <span className="label-text text-xs">Точное число замеров</span>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  min={MEASUREMENTS_MIN}
                  max={MEASUREMENTS_MAX}
                  value={config.measurementsCount}
                  disabled={isCollecting}
                  onChange={(e) =>
                    patchConfig({ measurementsCount: Number(e.target.value) })
                  }
                />
              </label>
              <QuickPresetButtons
                label={`Интервал, мс (${INTERVAL_MS_MIN}–${INTERVAL_MS_MAX})`}
                values={INTERVAL_MS_PRESETS}
                current={config.intervalMs}
                unit=" мс"
                disabled={isCollecting}
                onSelect={(intervalMs) => patchConfig({ intervalMs })}
              />
              <label className="form-control">
                <span className="label-text text-xs">Точный интервал (мс)</span>
                <input
                  type="number"
                  className="input input-bordered input-sm"
                  min={INTERVAL_MS_MIN}
                  max={INTERVAL_MS_MAX}
                  step={10}
                  value={config.intervalMs}
                  disabled={isCollecting}
                  onChange={(e) => patchConfig({ intervalMs: Number(e.target.value) })}
                />
              </label>
            </div>
          ) : null}

          {footer}
        </div>
      )}
    </div>
  );
};
