import React from 'react';

import type { FrameTickState } from '../fftThresholdPluginState';

export interface FrameTicksProps {
  readonly total: number;
  readonly states: readonly FrameTickState[];
  readonly activeIndex: number;
  readonly isCollecting: boolean;
}

function tickStyle(
  state: FrameTickState | undefined,
  isCurrent: boolean,
  isCollecting: boolean,
): string {
  if (state === 'passed') {
    return 'bg-base-300 border-2 border-primary text-base-content';
  }
  if (state === 'failed') {
    return 'bg-error/20 border-2 border-error text-error';
  }
  if (isCurrent && isCollecting) {
    return 'bg-primary/30 border border-primary/50 animate-pulse text-base-content';
  }
  return 'bg-base-300 border border-base-300 text-base-content/50';
}

function tickLabel(state: FrameTickState | undefined, index: number): string {
  if (state === 'passed') return '✓';
  if (state === 'failed') return '✗';
  return String(index + 1);
}

export const FrameTicks: React.FC<FrameTicksProps> = ({
  total,
  states,
  activeIndex,
  isCollecting,
}) => (
  <div className="flex flex-wrap justify-center gap-1" role="list" aria-label="Статус кадров теста">
    {Array.from({ length: total }).map((_, index) => {
      const state = states[index];
      const isCurrent = index === activeIndex;
      return (
        <div
          key={index}
          role="listitem"
          className={`flex h-8 w-8 min-h-10 min-w-10 items-center justify-center rounded-md text-xs font-mono tabular-nums transition-all duration-200 ${tickStyle(state, isCurrent, isCollecting)}`}
          title={
            state === 'passed'
              ? 'Кадр пройден'
              : state === 'failed'
                ? 'Кадр не пройден'
                : isCurrent
                  ? 'Текущий кадр'
                  : 'Ожидание'
          }
        >
          {tickLabel(state, index)}
        </div>
      );
    })}
  </div>
);
