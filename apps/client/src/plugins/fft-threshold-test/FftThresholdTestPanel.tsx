import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { fftThresholdPluginState } from './fftThresholdPluginState';
import { useMembranaStore } from '@membrana/agenda';
import {
  THRESHOLD_TEST_FRAME_COUNTS,
  type StrictnessLevel,
  type ThresholdTestFrameCount,
} from '@membrana/fft-analyzer-service';

import { FrameTicks } from './components/FrameTicks';
import { ReportHistory } from './components/ReportHistory';
import { MetricWithRaw } from './components/MetricWithRaw';
import { NormalizedThresholdRow } from './components/NormalizedThresholdRow';
import {
  requestStartManualTest,
  requestStopThresholdTest,
} from './fftThresholdPluginState';
import { useFftThresholdTest } from './useFftThresholdTest';
import {
  formatRawCentroid,
  formatRawFlux,
  formatRawLoudness,
  normalizeCentroidHz,
  normalizeFlux,
  normalizeLoudness,
  thresholdsFromNormalized,
  thresholdsToNormalized,
  type NormalizedThresholds,
} from './normalizeMetrics';
import {
  FFT_THRESHOLD_TEST_PLUGIN_ID,
  STRICTNESS_LABELS,
  resolveFftThresholdTestConfig,
  type FftThresholdTestPluginConfig,
} from './types';

export interface FftThresholdTestPanelProps {
  moduleId: string;
}

export const FftThresholdTestPanel: React.FC<FftThresholdTestPanelProps> = ({
  moduleId,
}) => {
  const snapshot = useFftThresholdTest();
  const rawConfig = useMembranaStore((s) =>
    s.getPlugin(moduleId, FFT_THRESHOLD_TEST_PLUGIN_ID)?.config,
  );
  const updatePluginConfig = useMembranaStore((s) => s.updatePluginConfig);
  const config = useMemo(
    () => resolveFftThresholdTestConfig(rawConfig),
    [rawConfig],
  );
  const normThresholds = useMemo(
    () => thresholdsToNormalized(config.thresholds),
    [config.thresholds],
  );
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fftThresholdPluginState.syncConfig({
      mode: config.mode,
      frameCount: config.frameCount,
      strictness: config.strictness,
      thresholds: config.thresholds,
      intervalMs: config.intervalMs,
    });
  }, [config]);

  const patchConfig = useCallback(
    (updates: Partial<FftThresholdTestPluginConfig>) => {
      updatePluginConfig<FftThresholdTestPluginConfig>(
        moduleId,
        FFT_THRESHOLD_TEST_PLUGIN_ID,
        updates,
      );
    },
    [moduleId, updatePluginConfig],
  );

  const patchNormThresholds = useCallback(
    (patch: (prev: NormalizedThresholds) => NormalizedThresholds) => {
      const next = patch(thresholdsToNormalized(config.thresholds));
      patchConfig({ thresholds: thresholdsFromNormalized(next) });
    },
    [config.thresholds, patchConfig],
  );

  const rawThresholdLabels = useMemo(
    () => ({
      centroid: `${formatRawCentroid(config.thresholds.centroid.min)} … ${formatRawCentroid(config.thresholds.centroid.max)}`,
      flux: `${formatRawFlux(config.thresholds.flux.min)} … ${formatRawFlux(config.thresholds.flux.max)}`,
      loudness: `${formatRawLoudness(config.thresholds.rms.min)} … ${formatRawLoudness(config.thresholds.rms.max)}`,
    }),
    [config.thresholds],
  );

  const isCollecting = snapshot.phase === 'collecting';
  const activeIndex = Math.min(snapshot.collectedCount, snapshot.frameCount - 1);
  const canStartManual =
    config.mode === 'manual' && snapshot.live && !isCollecting;
  const canStop = isCollecting;

  const frame = snapshot.currentFrame;

  return (
    <div className="rounded-box border border-primary/30 bg-base-200/30 p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-base-content">FFT пороговый тест</h3>
        <p className="text-xs text-base-content/60 mt-0.5">
          Серия кадров по центроиду, потоку и громкости; шкала 0…1 — только отображение,
          вердикт и журнал — в сырых единицах.
        </p>
      </div>

      <div className="flex gap-1 p-0.5 rounded-lg bg-base-300/50" role="group" aria-label="Режим теста">
        {(['auto', 'manual'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={config.mode === mode}
            className={`flex-1 min-h-10 py-1.5 text-xs rounded-md transition-all duration-200 ${
              config.mode === mode
                ? 'bg-primary text-primary-content shadow-sm'
                : 'text-base-content/60 hover:text-base-content'
            }`}
            onClick={() => patchConfig({ mode })}
          >
            {mode === 'auto' ? 'Авторежим' : 'Ручной режим'}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isCollecting
                ? 'bg-success animate-pulse'
                : snapshot.live
                  ? 'bg-primary'
                  : 'bg-base-content/30'
            }`}
            aria-hidden
          />
          <span className="text-xs text-base-content/70">
            {config.mode === 'auto'
              ? snapshot.live
                ? isCollecting
                  ? 'Автосбор кадров…'
                  : 'Ожидание следующего теста'
                : 'Ожидание микрофона'
              : isCollecting
                ? `Сбор ${snapshot.collectedCount}/${snapshot.frameCount}`
                : snapshot.live
                  ? 'Готов к запуску'
                  : 'Ожидание микрофона'}
          </span>
        </div>
        {config.mode === 'manual' && (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-success btn-xs min-h-10"
              disabled={!canStartManual}
              onClick={() => requestStartManualTest()}
            >
              Старт
            </button>
            <button
              type="button"
              className="btn btn-error btn-xs min-h-10"
              disabled={!canStop}
              onClick={() => requestStopThresholdTest()}
            >
              Стоп
            </button>
          </div>
        )}
      </div>

      {!snapshot.live && (
        <p className="text-xs text-center text-base-content/50 py-1">
          Запустите поток микрофона в модуле выше.
        </p>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] text-base-content/50">
          <span>Кадры теста</span>
          <span className="tabular-nums">
            {snapshot.collectedCount}/{snapshot.frameCount}
          </span>
        </div>
        <FrameTicks
          total={snapshot.frameCount}
          states={snapshot.tickStates}
          activeIndex={isCollecting ? activeIndex : snapshot.frameCount}
          isCollecting={isCollecting}
        />
        <div className="flex flex-wrap justify-center gap-3 text-[10px] text-base-content/50">
          <span>✓ пройден</span>
          <span>✗ не пройден</span>
          <span>цифра — ожидание</span>
        </div>
      </div>

      {frame && isCollecting && (
        <div className="rounded-lg bg-base-300/40 p-2 grid grid-cols-3 gap-2">
          <MetricWithRaw
            label="Центр"
            norm={normalizeCentroidHz(frame.centroid)}
            rawLabel={formatRawCentroid(frame.centroid)}
            ok={frame.centroidOk}
          />
          <MetricWithRaw
            label="Поток"
            norm={normalizeFlux(frame.flux)}
            rawLabel={formatRawFlux(frame.flux)}
            ok={frame.fluxOk}
          />
          <MetricWithRaw
            label="Громк."
            norm={normalizeLoudness(frame.rms)}
            rawLabel={formatRawLoudness(frame.rms)}
            ok={frame.rmsOk}
          />
        </div>
      )}

      <ReportHistory />

      <button
        type="button"
        className="w-full text-[10px] text-base-content/50 hover:text-base-content min-h-10"
        onClick={() => setShowSettings((v) => !v)}
        aria-expanded={showSettings}
      >
        {showSettings ? '▲ Скрыть настройки' : '▼ Настройки теста'}
      </button>

      {showSettings && (
        <div className="space-y-3 rounded-lg bg-base-300/30 p-3 text-xs">
          <NormalizedThresholdRow
            label="Центроид"
            min={normThresholds.centroid.min}
            max={normThresholds.centroid.max}
            rawRangeLabel={rawThresholdLabels.centroid}
            onMin={(v) =>
              patchNormThresholds((n) => ({
                ...n,
                centroid: { ...n.centroid, min: v },
              }))
            }
            onMax={(v) =>
              patchNormThresholds((n) => ({
                ...n,
                centroid: { ...n.centroid, max: v },
              }))
            }
          />
          <NormalizedThresholdRow
            label="Поток"
            min={normThresholds.flux.min}
            max={normThresholds.flux.max}
            rawRangeLabel={rawThresholdLabels.flux}
            onMin={(v) =>
              patchNormThresholds((n) => ({
                ...n,
                flux: { ...n.flux, min: v },
              }))
            }
            onMax={(v) =>
              patchNormThresholds((n) => ({
                ...n,
                flux: { ...n.flux, max: v },
              }))
            }
          />
          <NormalizedThresholdRow
            label="Громкость"
            min={normThresholds.loudness.min}
            max={normThresholds.loudness.max}
            rawRangeLabel={rawThresholdLabels.loudness}
            onMin={(v) =>
              patchNormThresholds((n) => ({
                ...n,
                loudness: { ...n.loudness, min: v },
              }))
            }
            onMax={(v) =>
              patchNormThresholds((n) => ({
                ...n,
                loudness: { ...n.loudness, max: v },
              }))
            }
          />
          <label className="form-control">
            <span className="label-text text-base-content/70">Интервал (мс)</span>
            <input
              type="number"
              className="input input-bordered input-sm tabular-nums"
              min={50}
              step={50}
              value={config.intervalMs}
              onChange={(e) => patchConfig({ intervalMs: Number(e.target.value) })}
            />
          </label>
          <div>
            <span className="text-base-content/70">Кадров в тесте</span>
            <div className="flex gap-1 mt-1">
              {THRESHOLD_TEST_FRAME_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`btn btn-xs flex-1 min-h-10 ${
                    config.frameCount === n ? 'btn-primary' : 'btn-ghost'
                  }`}
                  onClick={() => patchConfig({ frameCount: n as ThresholdTestFrameCount })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-base-content/70">Строгость</span>
            <div className="flex gap-1 mt-1">
              {(['easy', 'normal', 'strict'] as StrictnessLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`btn btn-xs flex-1 min-h-10 ${
                    config.strictness === level ? 'btn-primary' : 'btn-ghost'
                  }`}
                  onClick={() => patchConfig({ strictness: level })}
                >
                  {STRICTNESS_LABELS[level]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
