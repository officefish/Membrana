interface Props {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly className?: string;
}

/** Компактный нейтральный слайдер порога (внутренне — confidenceThreshold классификатора). */
export function SensitivityThresholdSlider({ value, onChange, className = '' }: Props) {
  return (
    <label className={`form-control w-full max-w-[13rem] ${className}`.trim()}>
      <div className="label py-0 min-h-0 gap-1">
        <span className="label-text text-xs text-base-content/70">Порог чувствительности</span>
        <span className="label-text-alt text-xs font-mono tabular-nums text-base-content/55">
          {Math.round(value * 100)}%
        </span>
      </div>
      <input
        type="range"
        min={0.2}
        max={0.9}
        step={0.01}
        value={value}
        className="range range-xs h-1.5 min-h-0"
        aria-label="Порог чувствительности"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
