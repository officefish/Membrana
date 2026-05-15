import React from 'react';

export interface MetricWithRawProps {
  readonly label: string;
  readonly norm: number;
  readonly rawLabel: string;
  readonly ok?: boolean;
}

/** Основное значение — нормализованное 0…1; сырьё — мелким шрифтом. */
export const MetricWithRaw: React.FC<MetricWithRawProps> = ({
  label,
  norm,
  rawLabel,
  ok,
}) => (
  <div>
    <div className="flex items-center gap-1">
      <span className="text-base-content/50">{label}</span>
      {ok !== undefined && (
        <span className={ok ? 'text-success text-[10px]' : 'text-error text-[10px]'}>
          {ok ? '✓' : '✗'}
        </span>
      )}
    </div>
    <div
      className={`text-sm font-mono tabular-nums ${ok === false ? 'text-error' : 'text-base-content'}`}
    >
      {norm.toFixed(2)}
    </div>
    <div className="text-[9px] text-base-content/45 font-mono tabular-nums">сыро: {rawLabel}</div>
  </div>
);
