import React, { useEffect, useMemo, useState } from 'react';
import { useMembranaStore } from '@membrana/agenda';
import type { SoundQualityBadgeTone } from '@membrana/fft-analyzer-service';

import { soundQualityVizPluginState } from './soundQualityVizPluginState';
import { useSoundQualityViz } from './useSoundQualityViz';
import {
  SOUND_QUALITY_VIZ_PLUGIN_ID,
  defaultSoundQualityVizConfig,
  resolveSoundQualityVizConfig,
} from './types';

export interface SoundQualityVizPanelProps {
  readonly moduleId: string;
}

const BADGE_CLASS: Record<SoundQualityBadgeTone, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
};

function overallBarClass(overall: number): string {
  if (overall >= 80) return 'bg-success';
  if (overall >= 60) return 'bg-success/80';
  if (overall >= 40) return 'bg-warning';
  if (overall >= 20) return 'bg-warning/80';
  return 'bg-error';
}

function formatSnrDb(snr: number): string {
  return `${snr.toFixed(1)} dB`;
}

function formatPercent(value: number): string {
  return `${Math.round(value)} %`;
}

function formatPeakDb(peakDb: number): string {
  return `${peakDb.toFixed(1)} dB`;
}

interface SubMetricRowProps {
  readonly label: string;
  readonly value: string;
}

const SubMetricRow: React.FC<SubMetricRowProps> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-2 text-xs">
    <span className="text-base-content/70">{label}</span>
    <span className="tabular-nums text-base-content font-medium">{value}</span>
  </div>
);

export const SoundQualityVizPanel: React.FC<SoundQualityVizPanelProps> = ({
  moduleId,
}) => {
  const snapshot = useSoundQualityViz();
  const rawConfig = useMembranaStore((s) =>
    s.getPlugin(moduleId, SOUND_QUALITY_VIZ_PLUGIN_ID)?.config,
  );
  const config = useMemo(
    () => resolveSoundQualityVizConfig(rawConfig ?? defaultSoundQualityVizConfig),
    [rawConfig],
  );

  const [debouncedMessage, setDebouncedMessage] = useState(snapshot.qualityMessage);

  useEffect(() => {
    soundQualityVizPluginState.syncConfig(config);
  }, [config]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedMessage(snapshot.qualityMessage);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [snapshot.qualityMessage]);

  const { metrics, badge } = snapshot;
  const overallPct = Math.min(100, Math.max(0, metrics.overall));
  const streamStatus = snapshot.streamActive
    ? 'Оценка качества потока'
    : 'Ожидание микрофона';

  return (
    <div className="rounded-box border border-primary/30 bg-base-200/30 p-4 space-y-4 w-full min-w-0">
      <div>
        <h3 className="text-sm font-semibold text-base-content">Качество звука</h3>
        <p className="text-xs text-base-content/60 mt-0.5">
          Пригодность сигнала для анализа: SNR, чёткость, динамика и запас по
          уровню. Параметры буфера — во вкладке «Плагины» слева.
        </p>
      </div>

      <p className="text-xs text-base-content/70" aria-live="polite">
        {streamStatus}
      </p>

      {!snapshot.streamActive && (
        <p className="text-xs text-center text-base-content/50 py-2">
          Запустите поток микрофона для live-оценки.
        </p>
      )}

      {snapshot.streamActive && (
        <div className="space-y-4 w-full min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`badge badge-sm ${BADGE_CLASS[badge.tone]}`}
            >
              {badge.label}
            </span>
            <span className="text-xs tabular-nums text-base-content/70">
              Общий балл: {formatPercent(overallPct)}
            </span>
          </div>

          <div
            className="w-full min-w-0"
            role="meter"
            aria-valuenow={Math.round(overallPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Общее качество звука"
          >
            <div className="relative h-1 w-full rounded-full bg-base-300 overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 h-full rounded-full transition-[width] duration-150 ease-out ${overallBarClass(overallPct)}`}
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-base-300/80 bg-base-100/50 px-3 py-2">
            <SubMetricRow label="SNR" value={formatSnrDb(metrics.snr)} />
            <SubMetricRow label="Чёткость" value={formatPercent(metrics.clarity)} />
            <SubMetricRow label="Динамика" value={formatPercent(metrics.dynamics)} />
            <SubMetricRow label="Пик" value={formatPeakDb(metrics.peakDb)} />
          </div>

          <p
            className="text-xs text-base-content/75 leading-relaxed"
            aria-live="polite"
          >
            {debouncedMessage}
          </p>
        </div>
      )}
    </div>
  );
};
