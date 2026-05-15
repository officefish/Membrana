import React from 'react';

import type { FftThresholdFrameReportRow } from '../buildFftThresholdTestReport';

export interface FrameTickStripProps {
  readonly frames: readonly FftThresholdFrameReportRow[];
}

/** Компактный ряд ✓/✗ по кадрам (свёрнутый отчёт). */
export const FrameTickStrip: React.FC<FrameTickStripProps> = ({ frames }) => (
  <div className="flex flex-wrap gap-0.5" role="list" aria-label="Результаты кадров">
    {frames.map((frame) => (
      <span
        key={frame.index}
        role="listitem"
        className={`inline-flex h-6 min-h-6 w-6 min-w-6 items-center justify-center rounded text-[10px] font-mono ${
          frame.framePassed
            ? 'bg-success/15 text-success border border-success/40'
            : 'bg-error/15 text-error border border-error/40'
        }`}
        title={`Кадр ${frame.index + 1}: ${frame.framePassed ? 'пройден' : 'не пройден'}`}
        aria-label={`Кадр ${frame.index + 1} ${frame.framePassed ? 'пройден' : 'не пройден'}`}
      >
        {frame.framePassed ? '✓' : '✗'}
      </span>
    ))}
  </div>
);
