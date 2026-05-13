import React, { useLayoutEffect, useRef } from 'react';
import {
  renderFftBarsCanvas,
  renderSpectrumLineCanvas,
  type SpectrumLineOptions,
  type SyncCanvasOptions,
} from '../canvas/renderFrequencyVisualization';

/**
 * Один кадр частотного спектра (0…255 на бин), без AnalyserNode —
 * для офлайн-кадров, экспорта из {@link import('./types/sequences').AudioFrameSequence} и т.п.
 */
export interface FftBarsSnapshotCanvasProps {
  magnitudes: Uint8Array | null;
  layout?: SyncCanvasOptions;
  className?: string;
}

export const FftBarsSnapshotCanvas: React.FC<FftBarsSnapshotCanvasProps> = React.memo(
  ({ magnitudes, layout, className }) => {
    const ref = useRef<HTMLCanvasElement>(null);

    useLayoutEffect(() => {
      const c = ref.current;
      if (!c) return;
      if (!magnitudes || magnitudes.length === 0) {
        const ctx = c.getContext('2d');
        if (ctx && c.width > 0 && c.height > 0) {
          ctx.clearRect(0, 0, c.width, c.height);
        }
        return;
      }
      renderFftBarsCanvas(c, magnitudes, layout);
    }, [magnitudes, layout]);

    return <canvas ref={ref} className={className ?? 'w-full h-[200px] block'} />;
  },
);

export interface SpectrumLineSnapshotCanvasProps {
  magnitudes: Uint8Array | null;
  options?: SpectrumLineOptions;
  className?: string;
}

export const SpectrumLineSnapshotCanvas: React.FC<SpectrumLineSnapshotCanvasProps> = React.memo(
  ({ magnitudes, options, className }) => {
    const ref = useRef<HTMLCanvasElement>(null);

    useLayoutEffect(() => {
      const c = ref.current;
      if (!c) return;
      if (!magnitudes || magnitudes.length === 0) {
        const ctx = c.getContext('2d');
        if (ctx && c.width > 0 && c.height > 0) {
          ctx.clearRect(0, 0, c.width, c.height);
        }
        return;
      }
      renderSpectrumLineCanvas(c, magnitudes, options);
    }, [magnitudes, options]);

    return <canvas ref={ref} className={className ?? 'w-full h-[200px] block'} />;
  },
);
