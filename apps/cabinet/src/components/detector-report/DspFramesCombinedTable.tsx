import React from 'react';

import type { DspCombinedFrameRow } from './buildDspCombinedFrameRows';
import { formatFundamentalHz, formatTimestampSec } from './detectorReportUi';

function droneMark(isDrone: boolean): React.ReactNode {
  return (
    <span
      className={`font-semibold ${isDrone ? 'text-warning' : 'text-base-content/35'}`}
      title={isDrone ? 'дрон' : 'не дрон'}
    >
      {isDrone ? '●' : '·'}
    </span>
  );
}

export interface DspFramesCombinedTableProps {
  readonly rows: readonly DspCombinedFrameRow[];
}

export const DspFramesCombinedTable: React.FC<DspFramesCombinedTableProps> = ({ rows }) => {
  if (rows.length === 0) {
    return (
      <p className="text-xs text-base-content/60">Нет FFT-кадров для отображения.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-base-300">
      <table className="table table-xs w-full">
        <thead>
          <tr className="text-base-content/60">
            <th>№</th>
            <th>t (с)</th>
            <th>harmonic</th>
            <th>cepstrum</th>
            <th>f0 (Гц)</th>
            <th>flux</th>
            <th>low %</th>
            <th className="text-center" title="Гармонический">
              Г
            </th>
            <th className="text-center" title="Кепстральный">
              К
            </th>
            <th className="text-center" title="Спектральный поток">
              С
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const f0 =
              row.harmonic?.fundamentalHz ??
              row.cepstral?.fundamentalHz ??
              null;
            return (
              <tr key={row.index}>
                <td className="tabular-nums">{row.index + 1}</td>
                <td className="tabular-nums">{formatTimestampSec(row.timestampMs)}</td>
                <td className="tabular-nums">
                  {row.harmonic ? row.harmonic.maxHarmonicScore.toFixed(3) : '—'}
                </td>
                <td className="tabular-nums">
                  {row.cepstral ? row.cepstral.cepstrumPeak.toFixed(3) : '—'}
                </td>
                <td className="tabular-nums">{formatFundamentalHz(f0)}</td>
                <td className="tabular-nums">
                  {row.spectralFlux ? row.spectralFlux.flux.toFixed(3) : '—'}
                </td>
                <td className="tabular-nums">
                  {row.spectralFlux ? row.spectralFlux.lowEnergyPercent.toFixed(1) : '—'}
                </td>
                <td className="text-center">
                  {row.harmonic ? droneMark(row.harmonic.isDrone) : '—'}
                </td>
                <td className="text-center">
                  {row.cepstral ? droneMark(row.cepstral.isDrone) : '—'}
                </td>
                <td className="text-center">
                  {row.spectralFlux ? droneMark(row.spectralFlux.isDrone) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
