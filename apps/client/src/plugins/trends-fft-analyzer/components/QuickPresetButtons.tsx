import React from 'react';

export interface QuickPresetButtonsProps {
  readonly label: string;
  readonly values: readonly number[];
  readonly current: number;
  readonly unit?: string;
  readonly disabled?: boolean;
  readonly onSelect: (value: number) => void;
}

export const QuickPresetButtons: React.FC<QuickPresetButtonsProps> = ({
  label,
  values,
  current,
  unit = '',
  disabled = false,
  onSelect,
}) => (
  <div className="form-control gap-1">
    <span className="label-text text-xs">{label}</span>
    <div className="flex flex-wrap gap-1">
      {values.map((value) => {
        const active = value === current;
        return (
          <button
            key={value}
            type="button"
            className={`btn btn-xs min-h-8 px-2 ${active ? 'btn-primary' : 'btn-ghost btn-outline'}`}
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onSelect(value)}
          >
            {value}
            {unit}
          </button>
        );
      })}
    </div>
  </div>
);
