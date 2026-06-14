import React, { useEffect, useRef } from 'react';

import { FFT_INDICES_VIZ_DRONE_NORM } from '../fftIndicesVizNormalize';
import { drawFluxHistory } from '../fftIndicesDraw';
import { getFftIndicesDrawPalette } from '../fftIndicesThemeColors';
import { useCanvasContainerSize } from '../useCanvasContainerSize';

const FLUX_ZONE_MIN = FFT_INDICES_VIZ_DRONE_NORM.flux.min;
const FLUX_ZONE_MAX = FFT_INDICES_VIZ_DRONE_NORM.flux.max;
const FALLBACK_WIDTH = 320;

export interface FluxHistoryCanvasProps {
  readonly history: readonly number[];
  readonly showDroneZone: boolean;
  readonly height?: number;
}

export const FluxHistoryCanvas: React.FC<FluxHistoryCanvasProps> = ({
  history,
  showDroneZone,
  height = 72,
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
    drawFluxHistory(
      ctx,
      width,
      height,
      history,
      showDroneZone ? FLUX_ZONE_MIN : 0,
      showDroneZone ? FLUX_ZONE_MAX : 0,
      getFftIndicesDrawPalette(),
    );
  }, [history, showDroneZone, width, height]);

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <canvas
        ref={canvasRef}
        className="block w-full rounded-lg bg-base-200"
        role="img"
        aria-label="История спектрального потока"
      />
    </div>
  );
};
