import React from 'react';
import type { PatternTemplate, TemplateScore } from '@membrana/trends-detector-service';

export interface TrendsScoreRankingProps {
  readonly scores: readonly TemplateScore[];
  readonly selectedKey: string | null;
  readonly onSelect: (key: string) => void;
  readonly getTemplate?: (key: string) => PatternTemplate | undefined;
  readonly compact?: boolean;
  readonly hideTitle?: boolean;
}

const MEDALS = ['🥇', '🥈', '🥉'] as const;

export const TrendsScoreRanking: React.FC<TrendsScoreRankingProps> = ({
  scores,
  selectedKey,
  onSelect,
  getTemplate,
  compact = false,
  hideTitle = false,
}) => {
  const top3 = scores.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="flex flex-col gap-2" aria-label="Топ-3 совпадений с шаблонами">
      {!hideTitle ? (
        <div className="text-xs font-medium text-base-content/70">
          Рейтинг совпадений
        </div>
      ) : null}
      <ul className="flex flex-col gap-1.5">
        {top3.map((entry, index) => {
          const template = getTemplate?.(entry.key);
          const label = template?.name ?? entry.key;
          const icon = template?.icon ?? '❓';
          const color = template?.color ?? '#999';
          const isSelected = entry.key === selectedKey;
          const percent = Math.round(entry.score);

          return (
            <li key={entry.key}>
              <button
                type="button"
                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                    : 'border-base-300 bg-base-100/40 hover:bg-base-200/60'
                } ${compact ? 'py-1.5' : ''}`}
                aria-pressed={isSelected}
                onClick={() => onSelect(entry.key)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0" aria-hidden>
                    {MEDALS[index] ?? `${index + 1}.`}
                  </span>
                  <span className="text-lg shrink-0" aria-hidden>
                    {icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate font-medium ${compact ? 'text-sm' : 'text-base'}`}
                      style={{ color }}
                    >
                      {label}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <progress
                        className={`progress w-full ${
                          index === 0 ? 'progress-primary' : 'progress-neutral'
                        }`}
                        value={percent}
                        max={100}
                        aria-label={`Совпадение ${percent}%`}
                      />
                      <span className="text-sm font-semibold tabular-nums shrink-0 w-10 text-right">
                        {percent}%
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-base-content/50 leading-snug">
        Нажмите на шаблон, чтобы увидеть таблицу метрик и причины совпадения.
      </p>
    </div>
  );
};
