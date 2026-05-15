import React, { useEffect, useRef } from 'react';

import {
  drawBars,
  drawRadar,
  drawTriangle,
  type IndicesDrawValues,
} from '../fftIndicesDraw';
import { getFftIndicesDrawPalette } from '../fftIndicesThemeColors';
import { useCanvasContainerSize } from '../useCanvasContainerSize';
import type { FftIndicesVizMode } from '../types';

export interface FftIndicesCanvasProps {
  readonly mode: FftIndicesVizMode;
  readonly values: IndicesDrawValues;
  readonly height?: number;
}

const FALLBACK_WIDTH = 320;
const DEFAULT_H = 200;

export const FftIndicesCanvas: React.FC<FftIndicesCanvasProps> = ({
  mode,
  values,
  height = DEFAULT_H,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = useCanvasContainerSize(containerRef, FALLBACK_WIDTH);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = '100%';
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const palette = getFftIndicesDrawPalette();

    switch (mode) {
      case 'radar':
        drawRadar(ctx, width, height, values, palette);
        break;
      case 'bars':
        drawBars(ctx, width, height, values, palette);
        break;
      case 'triangle':
        drawTriangle(ctx, width, height, values, palette);
        break;
    }
  }, [mode, values, width, height]);

  const modeLabel =
    mode === 'radar' ? 'Радар' : mode === 'bars' ? 'Полосы' : 'Треугольник';

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <canvas
        ref={canvasRef}
        className="block w-full rounded-lg bg-base-200"
        role="img"
        aria-label={`Визуализация FFT-индексов: ${modeLabel}`}
      />
    </div>
  );
};
