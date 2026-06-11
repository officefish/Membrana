import React from 'react';
import { SYSTEM_TEMPLATES } from '@membrana/trends-detector-service';

export interface TrendsTemplateListProps {
  readonly enabledKeys: readonly string[];
  readonly onToggle: (key: string, enabled: boolean) => void;
  readonly compact?: boolean;
}

export const TrendsTemplateList: React.FC<TrendsTemplateListProps> = ({
  enabledKeys,
  onToggle,
  compact = false,
}) => {
  const enabledSet = new Set(enabledKeys);

  return (
    <div className={`flex flex-col gap-2 min-h-0 ${compact ? '' : 'max-h-64 overflow-y-auto pr-1'}`}>
      {SYSTEM_TEMPLATES.map((template) => {
        const checked = enabledSet.has(template.key);
        return (
          <label
            key={template.key}
            className={`flex items-start gap-2 rounded-lg border p-2 cursor-pointer transition-colors ${
              checked
                ? 'border-primary/40 bg-primary/5'
                : 'border-base-300 bg-base-200/30 opacity-75'
            }`}
          >
            <input
              type="checkbox"
              className="checkbox checkbox-sm mt-0.5"
              checked={checked}
              onChange={(e) => onToggle(template.key, e.target.checked)}
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                {template.icon} {template.name}
              </span>
              {!compact && (
                <span className="block text-xs text-base-content/60 leading-snug mt-0.5">
                  {template.description}
                </span>
              )}
            </span>
          </label>
        );
      })}
      <p className="text-[11px] text-base-content/50 leading-snug">
        Полный редактор пользовательских шаблонов (создание из WAV, спектральные и
        временные пороги) — отдельная задача; сейчас доступны только системные классы.
      </p>
    </div>
  );
};
