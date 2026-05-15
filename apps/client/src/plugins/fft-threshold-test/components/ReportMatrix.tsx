import React from 'react';

import type { FftThresholdTestReport } from '../buildFftThresholdTestReport';
import {
  formatRawCentroid,
  formatRawFlux,
  formatRawLoudness,
} from '../normalizeMetrics';

export interface ReportMatrixProps {
  readonly report: FftThresholdTestReport;
}

function rangeCell(ok: boolean): React.ReactNode {
  return (
    <span className={ok ? 'text-success' : 'text-error'} aria-label={ok ? 'в диапазоне' : 'вне диапазона'}>
      {ok ? '✓' : '✗'}
    </span>
  );
}

export const ReportMatrix: React.FC<ReportMatrixProps> = ({ report }) => (
  <div className="overflow-x-auto">
    <table className="table table-xs table-zebra w-full font-mono tabular-nums text-[10px]">
      <thead>
        <tr className="text-base-content/60">
          <th scope="col">№</th>
          <th scope="col">Центр (Гц)</th>
          <th scope="col">Центр норм</th>
          <th scope="col">C</th>
          <th scope="col">Поток</th>
          <th scope="col">Поток норм</th>
          <th scope="col">F</th>
          <th scope="col">RMS</th>
          <th scope="col">RMS норм</th>
          <th scope="col">R</th>
          <th scope="col">Кадр</th>
        </tr>
      </thead>
      <tbody>
        {report.frames.map((row) => (
          <tr key={row.index}>
            <td>{row.index + 1}</td>
            <td>{formatRawCentroid(row.centroidHz)}</td>
            <td>{row.centroidNorm.toFixed(2)}</td>
            <td>{rangeCell(row.centroidInRange)}</td>
            <td>{formatRawFlux(row.fluxRaw)}</td>
            <td>{row.fluxNorm.toFixed(2)}</td>
            <td>{rangeCell(row.fluxInRange)}</td>
            <td>{formatRawLoudness(row.rmsRaw)}</td>
            <td>{row.rmsNorm.toFixed(2)}</td>
            <td>{rangeCell(row.rmsInRange)}</td>
            <td>{rangeCell(row.framePassed)}</td>
          </tr>
        ))}
        <tr className="font-semibold text-base-content">
          <td colSpan={10}>Итог</td>
          <td>{rangeCell(report.isDetected)}</td>
        </tr>
      </tbody>
    </table>
  </div>
);
