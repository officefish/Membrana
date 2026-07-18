import React from 'react';
import { useMembranaStore } from '@membrana/agenda';

import { SCOREBOARD_MEASURED_AT, SCOREBOARD_ROWS } from './scoreboardData';
import {
  MIC_DETECTOR_SCOREBOARD_PLUGIN_ID,
  probabilityOfDetection,
  probabilityOfFalseAlarm,
  resolveMicDetectorScoreboardConfig,
  type ScoreboardRow,
} from './types';

export interface DetectorScoreboardPanelProps {
  readonly moduleId: string;
}

const FAMILY_LABEL: Record<ScoreboardRow['family'], string> = {
  dsp: 'спектральный',
  neural: 'нейросеть',
  'neural-trained': 'нейросеть + обучение',
};

const pct = (value: number): string => `${(value * 100).toFixed(1)} %`;

export const DetectorScoreboardPanel: React.FC<DetectorScoreboardPanelProps> = ({
  moduleId,
}) => {
  const rawConfig = useMembranaStore((s) =>
    s.getPlugin(moduleId, MIC_DETECTOR_SCOREBOARD_PLUGIN_ID)?.config,
  );
  const config = resolveMicDetectorScoreboardConfig(rawConfig);

  return (
    <section className="card bg-base-200 shadow-sm">
      <div className="card-body gap-3">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h3 className="card-title text-base">Качество детекции</h3>
          <span className="text-xs opacity-60">измерено {SCOREBOARD_MEASURED_AT}</span>
        </div>

        <p className="text-xs opacity-70">
          Штуки первичны, доли — производны: на выборке в несколько десятков записей
          процент прячет масштаб. Интервал показывает, где число ещё догадка.
        </p>

        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>детектор</th>
                <th>набор</th>
                <th>обнаружено дронов</th>
                <th>ложных тревог</th>
                {config.showPercents && (
                  <>
                    <th className="font-mono">P_d</th>
                    <th className="font-mono">P_fa</th>
                  </>
                )}
                <th>интервал P_d</th>
                <th className="font-mono">AUC</th>
              </tr>
            </thead>
            <tbody>
              {SCOREBOARD_ROWS.map((row) => {
                const trained = row.family === 'neural-trained';
                return (
                  <tr key={row.detector} className={trained ? 'font-medium' : undefined}>
                    <td>
                      <div>{row.detector}</div>
                      <div className="text-xs opacity-60">{FAMILY_LABEL[row.family]}</div>
                    </td>
                    <td className="text-xs">
                      <div>{row.datasetLabel}</div>
                      <div className="opacity-60 tabular-nums">{row.datasetSize} записей</div>
                    </td>
                    <td className="tabular-nums">
                      {row.detected} из {row.dronesTotal}
                    </td>
                    <td className="tabular-nums">
                      {row.falseAlarms} из {row.cleanTotal}
                    </td>
                    {config.showPercents && (
                      <>
                        <td className="tabular-nums font-mono">
                          {pct(probabilityOfDetection(row))}
                        </td>
                        <td className="tabular-nums font-mono">
                          {pct(probabilityOfFalseAlarm(row))}
                        </td>
                      </>
                    )}
                    <td className="tabular-nums text-xs opacity-70">
                      {pct(row.pdInterval[0])} – {pct(row.pdInterval[1])}
                    </td>
                    <td className="tabular-nums font-mono">
                      {row.rocAuc == null ? '—' : row.rocAuc.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="text-xs opacity-70 space-y-1">
          {SCOREBOARD_ROWS.filter((r) => r.caveat).map((r) => (
            <p key={r.detector}>
              <span className="font-medium">{r.detector}:</span> {r.caveat}
            </p>
          ))}
        </div>

        <details className="text-xs opacity-60">
          <summary className="cursor-pointer">откуда числа</summary>
          <ul className="mt-1 space-y-0.5">
            {SCOREBOARD_ROWS.map((r) => (
              <li key={r.detector}>
                {r.detector} — {r.source}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
};
