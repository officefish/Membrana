import { describe, expect, it } from 'vitest';

import {
  barycentricWeights,
  drawBars,
  drawRadar,
  drawTriangle,
} from './fftIndicesDraw';

function mockCtx(): CanvasRenderingContext2D {
  const calls: string[] = [];
  const ctx = {
    clearRect: () => calls.push('clear'),
    fillRect: () => calls.push('fillRect'),
    strokeRect: () => calls.push('strokeRect'),
    beginPath: () => calls.push('beginPath'),
    moveTo: () => undefined,
    lineTo: () => undefined,
    closePath: () => undefined,
    stroke: () => calls.push('stroke'),
    fill: () => calls.push('fill'),
    arc: () => calls.push('arc'),
    fillText: () => calls.push('fillText'),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    font: '',
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

const testPalette = {
  error: '#ef4444',
  info: '#3b82f6',
  success: '#22c55e',
} as const;

describe('fftIndicesDraw', () => {
  const zeros = { centroidNorm: 0, fluxNorm: 0, rmsNorm: 0 };

  it('barycentricWeights sum to 1', () => {
    const w = barycentricWeights({ centroidNorm: 0.8, fluxNorm: 0.4, rmsNorm: 0.2 });
    expect(w[0]! + w[1]! + w[2]!).toBeCloseTo(1);
  });

  it('barycentricWeights uses equal thirds when all zero', () => {
    const w = barycentricWeights(zeros);
    expect(w).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });

  it('drawRadar does not throw on zero values', () => {
    expect(() => drawRadar(mockCtx(), 200, 160, zeros, testPalette)).not.toThrow();
  });

  it('drawBars does not throw on zero values', () => {
    expect(() => drawBars(mockCtx(), 200, 160, zeros, testPalette)).not.toThrow();
  });

  it('drawTriangle does not throw on zero values', () => {
    expect(() => drawTriangle(mockCtx(), 200, 160, zeros, testPalette)).not.toThrow();
  });
});
