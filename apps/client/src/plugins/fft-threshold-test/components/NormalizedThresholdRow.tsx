import React from 'react';
import { clamp01 } from '../normalizeMetrics';

export interface NormalizedThresholdRowProps {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly rawRangeLabel: string;
  readonly onMin: (v: number) => void;
  readonly onMax: (v: number) => void;
}

/** Пороги в шкале 0…1; под полями — сырой диапазон после сохранения в store. */
export const NormalizedThresholdRow: React.FC<NormalizedThresholdRowProps> = ({
  label,
  min,
  max,
  rawRangeLabel,
  onMin,
  onMax,
}) => (
  <label className="form-control">
    <span className="label-text text-base-content/70">
      {label} <span className="text-base-content/45">(0…1)</span>
    </span>
    <div className="flex gap-2">
      <input
        type="number"
        min={0}
        max={1}
        step={0.01}
        className="input input-bordered input-sm flex-1 tabular-nums"
        value={clamp01(min).toFixed(2)}
        onChange={(e) => onMin(clamp01(Number(e.target.value)))}
        aria-label={`${label} минимум`}
      />
      <input
        type="number"
        min={0}
        max={1}
        step={0.01}
        className="input input-bordered input-sm flex-1 tabular-nums"
        value={clamp01(max).toFixed(2)}
        onChange={(e) => onMax(clamp01(Number(e.target.value)))}
        aria-label={`${label} максимум`}
      />
    </div>
    <span className="text-[9px] text-base-content/45 font-mono tabular-nums mt-0.5">
      сыро: {rawRangeLabel}
    </span>
  </label>
);
