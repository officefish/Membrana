import type { AnalysisSourceKind } from './types';

const SOURCE_LABELS: Record<Exclude<AnalysisSourceKind, 'graph'>, string> = {
  microphone: 'Микрофон (live)',
  'sample-library': 'Библиотека сэмплов',
};

interface AnalysisSourceSelectProps {
  readonly value: AnalysisSourceKind;
  readonly onChange: (value: AnalysisSourceKind) => void;
  readonly className?: string;
}

export function AnalysisSourceSelect({
  value,
  onChange,
  className = '',
}: AnalysisSourceSelectProps) {
  const selectValue = value === 'graph' ? 'microphone' : value;

  return (
    <label className={`form-control w-full ${className}`.trim()}>
      <span className="label-text text-xs">Источник анализа</span>
      <select
        className="select select-bordered select-xs w-full"
        aria-label="Источник анализа"
        value={selectValue}
        onChange={(event) => {
          const next = event.target.value as Exclude<AnalysisSourceKind, 'graph'>;
          onChange(next);
        }}
      >
        {(Object.keys(SOURCE_LABELS) as Array<keyof typeof SOURCE_LABELS>).map((key) => (
          <option key={key} value={key}>
            {SOURCE_LABELS[key]}
          </option>
        ))}
      </select>
    </label>
  );
}
