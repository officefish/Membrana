import React, { useEffect, useRef } from 'react';
import { renderSpectrumLineCanvas, type SpectrumLineOptions } from '../canvas/renderFrequencyVisualization';
import { useInvalidateCanvasThemeOnDataTheme } from './useInvalidateCanvasThemeOnDataTheme';

const defaultLineOptions: SpectrumLineOptions = {
  minCssWidth: 280,
  minCssHeight: 140,
  pointCount: 200,
};

export interface LiveSpectrumLineCanvasProps {
  analyserRef: { current: AnalyserNode | null };
  live: boolean;
  title?: string;
  spectrumOptions?: SpectrumLineOptions;
}

export const LiveSpectrumLineCanvas: React.FC<LiveSpectrumLineCanvasProps> = React.memo(
  ({ analyserRef, live, title = 'Спектр (кривая)', spectrumOptions }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const optionsRef = useRef(spectrumOptions);
    optionsRef.current = spectrumOptions;
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
          renderSpectrumLineCanvas(canvas, data, {
            ...defaultLineOptions,
            ...optionsRef.current,
          });
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
