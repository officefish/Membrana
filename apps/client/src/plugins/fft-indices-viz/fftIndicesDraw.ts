/** Pure canvas helpers (no DOM). */

import { clamp01 } from '../../lib/fftMetricNormalize';

import {
  colorForMetric,
  type FftIndicesDrawPalette,
  withPaletteAlpha,
} from './fftIndicesThemeColors';

export interface IndicesDrawValues {
  readonly centroidNorm: number;
  readonly fluxNorm: number;
  readonly rmsNorm: number;
}

/** Шкала 0…1 для радара и полос. */
export function clampIndicesDrawValues(values: IndicesDrawValues): IndicesDrawValues {
  return {
    centroidNorm: clamp01(values.centroidNorm),
    fluxNorm: clamp01(values.fluxNorm),
    rmsNorm: clamp01(values.rmsNorm),
  };
}

/** Веса для треугольника: каждая вершина 0…1, сумма = 1 (барицентрические). */
export function barycentricWeights(values: IndicesDrawValues): readonly [number, number, number] {
  const r = clamp01(values.rmsNorm);
  const c = clamp01(values.centroidNorm);
  const f = clamp01(values.fluxNorm);
  const sum = r + c + f;
  if (sum <= 1e-9) return [1 / 3, 1 / 3, 1 / 3];
  return [r / sum, c / sum, f / sum];
}

export function drawRadar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  values: IndicesDrawValues,
  palette: FftIndicesDrawPalette,
): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 24;
  const clamped = clampIndicesDrawValues(values);
  const vals = [clamped.centroidNorm, clamped.fluxNorm, clamped.rmsNorm];
  const angles = [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6];
  const labels = ['Центр', 'Поток', 'RMS'];
  const labelColors = [
    colorForMetric(palette, 'centroid'),
    colorForMetric(palette, 'flux'),
    colorForMetric(palette, 'rms'),
  ];

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, width, height);

  for (let level = 1; level <= 4; level++) {
    const r = (radius * level) / 4;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const x = centerX + Math.cos(angles[i]!) * r;
      const y = centerY + Math.sin(angles[i]!) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(128,128,128,0.25)';
    ctx.stroke();
  }

  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const r = radius * vals[i]!;
    const x = centerX + Math.cos(angles[i]!) * r;
    const y = centerY + Math.sin(angles[i]!) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = withPaletteAlpha(palette.success, 0.25);
  ctx.fill();
  ctx.strokeStyle = palette.success;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = '10px system-ui, sans-serif';
  for (let i = 0; i < 3; i++) {
    const x = centerX + Math.cos(angles[i]!) * (radius + 12);
    const y = centerY + Math.sin(angles[i]!) * (radius + 12);
    ctx.fillStyle = labelColors[i]!;
    ctx.fillText(labels[i]!, x - 12, y);
  }
}

export function drawBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  values: IndicesDrawValues,
  palette: FftIndicesDrawPalette,
): void {
  const barW = (width - 40) / 3;
  const barH = height - 48;
  const clamped = clampIndicesDrawValues(values);
  const items = [
    { label: 'Центр', norm: clamped.centroidNorm, color: colorForMetric(palette, 'centroid') },
    { label: 'Поток', norm: clamped.fluxNorm, color: colorForMetric(palette, 'flux') },
    { label: 'RMS', norm: clamped.rmsNorm, color: colorForMetric(palette, 'rms') },
  ];

  ctx.clearRect(0, 0, width, height);
  items.forEach((item, i) => {
    const x = 20 + i * barW;
    const y = 16;
    ctx.strokeStyle = 'rgba(128,128,128,0.35)';
    ctx.strokeRect(x, y, barW - 12, barH);
    const fillH = barH * Math.min(1, item.norm);
    ctx.fillStyle = item.norm > 1 ? palette.error : item.color;
    ctx.fillRect(x, y + barH - fillH, barW - 12, fillH);
    ctx.fillStyle = 'rgba(200,200,200,0.8)';
    ctx.font = '10px system-ui';
    ctx.fillText(item.label, x, y + barH + 14);
  });
}

export function drawTriangle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  values: IndicesDrawValues,
  palette: FftIndicesDrawPalette,
): void {
  const cx = width / 2;
  const cy = height / 2 + 10;
  const size = Math.min(width, height) * 0.35;
  const pts = [
    { x: cx, y: cy - size },
    { x: cx + size * 0.866, y: cy + size * 0.5 },
    { x: cx - size * 0.866, y: cy + size * 0.5 },
  ];
  const [wRms, wCentroid, wFlux] = barycentricWeights(values);
  const px = pts[0]!.x * wRms + pts[1]!.x * wCentroid + pts[2]!.x * wFlux;
  const py = pts[0]!.y * wRms + pts[1]!.y * wCentroid + pts[2]!.y * wFlux;

  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.moveTo(pts[0]!.x, pts[0]!.y);
  ctx.lineTo(pts[1]!.x, pts[1]!.y);
  ctx.lineTo(pts[2]!.x, pts[2]!.y);
  ctx.closePath();
  ctx.strokeStyle = withPaletteAlpha(palette.success, 0.6);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fillStyle = palette.success;
  ctx.fill();
}

export function drawFluxHistory(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  history: readonly number[],
  droneZoneMin: number,
  droneZoneMax: number,
  palette: FftIndicesDrawPalette,
): void {
  ctx.clearRect(0, 0, width, height);
  const z1 = height - droneZoneMin * height;
  const z2 = height - droneZoneMax * height;
  ctx.fillStyle = withPaletteAlpha(palette.success, 0.12);
  ctx.fillRect(0, Math.min(z1, z2), width, Math.abs(z2 - z1));

  if (history.length < 2) return;

  ctx.beginPath();
  ctx.strokeStyle = palette.info;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < history.length; i++) {
    const x = (i / (history.length - 1)) * width;
    const y = height - Math.min(1, history[i]!) * height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
