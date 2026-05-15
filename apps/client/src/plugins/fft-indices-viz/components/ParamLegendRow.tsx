import React from 'react';

import { FFT_INDICES_VIZ_DRONE_NORM, formatActivityPercent } from '../fftIndicesVizNormalize';
import {
  FFT_INDICES_METRIC_THEME,
  type FftIndicesMetricTheme,
} from '../fftIndicesThemeColors';

export type ParamLegendKind = 'centroid' | 'flux' | 'rms';

export interface ParamLegendRowProps {
  readonly kind: ParamLegendKind;
  readonly label: string;
  readonly activity: number;
  readonly showDroneZone: boolean;
}

const BAR_CLASS: Record<FftIndicesMetricTheme, string> = {
  error: 'bg-error',
  info: 'bg-info',
  success: 'bg-success',
};

const TEXT_CLASS: Record<FftIndicesMetricTheme, string> = {
  error: 'text-error',
  info: 'text-info',
  success: 'text-success',
};

const droneZoneNorm = (kind: ParamLegendKind): { min: number; max: number } =>
  FFT_INDICES_VIZ_DRONE_NORM[kind === 'rms' ? 'rms' : kind];

export const ParamLegendRow: React.FC<ParamLegendRowProps> = ({
  kind,
  label,
  activity,
  showDroneZone,
}) => {
  const theme = FFT_INDICES_METRIC_THEME[kind];
  const zone = droneZoneNorm(kind);

  return (
    <div className="flex w-full min-w-0 flex-col gap-1 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-base-content/80">{label}</span>
        <span className={`tabular-nums ${TEXT_CLASS[theme]}`}>
          {formatActivityPercent(activity)}
        </span>
      </div>
      <div className="relative h-px w-full rounded-full bg-base-300 overflow-hidden">
        {showDroneZone && (
          <div
            className="absolute inset-y-0 bg-success/20"
            style={{
              left: `${zone.min * 100}%`,
              width: `${Math.min(100, (zone.max - zone.min) * 100)}%`,
            }}
            aria-hidden
            title="Ориентир зоны дрона (шкала демо)"
          />
        )}
        <div
          className={`absolute inset-y-0 left-0 h-full rounded-full transition-[width] duration-75 ease-out ${BAR_CLASS[theme]}`}
          style={{ width: `${Math.min(100, activity * 100)}%` }}
        />
      </div>
    </div>
  );
};
