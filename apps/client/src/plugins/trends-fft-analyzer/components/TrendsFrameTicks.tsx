import React, { useMemo } from 'react';

import type { TrendsTickState } from '../trendsFftPluginState';

export interface TrendsFrameTicksProps {
  readonly total: number;
  readonly states: readonly TrendsTickState[];
  readonly activeIndex: number;
  readonly isCollecting: boolean;
  readonly density?: 'compact' | 'comfortable';
}

function tickCellClass(
  state: TrendsTickState | undefined,
  isCurrent: boolean,
  isCollecting: boolean,
): string {
  if (state === 'collected') {
    return 'border-primary bg-primary/15 text-primary font-semibold';
  }
  if (isCurrent && isCollecting) {
    return 'border-primary bg-primary/25 text-primary animate-pulse';
  }
  return 'border-base-300 bg-base-200/50 text-base-content/45';
}

function tickContent(
  state: TrendsTickState | undefined,
  index: number,
  isCurrent: boolean,
  isCollecting: boolean,
): string {
  if (state === 'collected') return '✓';
  if (isCurrent && isCollecting) return '…';
  return String(index + 1);
}

export const TrendsFrameTicks: React.FC<TrendsFrameTicksProps> = ({
  total,
  states,
  activeIndex,
  isCollecting,
  density = 'compact',
}) => {
  const comfortable = density === 'comfortable';

  const cellStyle = useMemo(() => {
    const minPx = comfortable
      ? total <= 30
        ? 36
        : total <= 80
          ? 28
          : total <= 150
            ? 22
            : 16
      : total <= 30
        ? 28
        : total <= 80
          ? 22
          : total <= 150
            ? 18
            : 14;
    return {
      gridTemplateColumns: `repeat(auto-fill, minmax(${minPx}px, 1fr))`,
    } as const;
  }, [total, comfortable]);

  const fontClass = comfortable
    ? total <= 50
      ? 'text-xs'
      : total <= 120
        ? 'text-[10px]'
        : 'text-[9px]'
    : total <= 50
      ? 'text-[10px]'
      : total <= 120
        ? 'text-[9px]'
        : 'text-[8px]';

  return (
    <div className="space-y-2 min-w-0">
      <div
        className={`grid w-full gap-0.5 ${fontClass}`}
        style={cellStyle}
        role="list"
        aria-label="Прогресс замеров"
      >
        {Array.from({ length: total }).map((_, index) => {
          const state = states[index];
          const isCurrent = index === activeIndex;
          return (
            <div
              key={index}
              role="listitem"
              className={`aspect-square min-w-0 rounded-sm border flex items-center justify-center tabular-nums leading-none transition-colors duration-150 ${tickCellClass(state, isCurrent, isCollecting)}`}
              title={
                state === 'collected'
                  ? `Замер ${index + 1}: выполнен`
                  : isCurrent
                    ? `Замер ${index + 1}: текущий`
                    : `Замер ${index + 1}: ожидание`
              }
            >
              {tickContent(state, index, isCurrent, isCollecting)}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-base-content/55">
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex h-3 w-3 items-center justify-center rounded-sm border border-primary bg-primary/15 text-[8px] text-primary">
            ✓
          </span>
          выполнен
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex h-3 w-3 items-center justify-center rounded-sm border border-primary bg-primary/25 text-[8px] text-primary">
            …
          </span>
          текущий
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex h-3 w-3 items-center justify-center rounded-sm border border-base-300 bg-base-200/50 text-[8px]">
            n
          </span>
          ожидание
        </span>
      </div>
    </div>
  );
};
