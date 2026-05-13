import React, { useEffect, useRef } from 'react';
import { renderFftBarsCanvas, type SyncCanvasOptions } from '../canvas/renderFrequencyVisualization';
import { useInvalidateCanvasThemeOnDataTheme } from './useInvalidateCanvasThemeOnDataTheme';

export interface LiveFftBarsCanvasProps {
  analyserRef: { current: AnalyserNode | null };
  live: boolean;
  title?: string;
  layout?: SyncCanvasOptions;
}

const defaultFftLayout: SyncCanvasOptions = { minCssWidth: 280, minCssHeight: 160 };

export const LiveFftBarsCanvas: React.FC<LiveFftBarsCanvasProps> = React.memo(
  ({ analyserRef, live, title = 'FFT (столбики)', layout }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const layoutRef = useRef(layout);
    layoutRef.current = layout;
    useInvalidateCanvasThemeOnDataTheme();

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let raf = 0;

      const draw = () => {
        const a = analyserRef.current;
        if (live && a) {
          const data = new Uint8Array(a.frequencyBinCount);
          a.getByteFrequencyData(data);
          renderFftBarsCanvas(canvas, data, layoutRef.current ?? defaultFftLayout);
        } else {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const r = canvas.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
          }
        }
        raf = requestAnimationFrame(draw);
      };

      raf = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(raf);
    }, [analyserRef, live]);

    return (
      <div className="rounded-2xl bg-base-200 border border-base-300 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-base-content/60 uppercase tracking-wider">
            {title}
          </span>
        </div>
        <div className="rounded-lg border border-base-300 overflow-hidden bg-base-300/30 min-h-[200px]">
          <canvas ref={canvasRef} className="w-full h-[200px] block" />
        </div>
      </div>
    );
  },
);
