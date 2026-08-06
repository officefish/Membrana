import React from 'react';
import { useMembranaStore } from '@membrana/agenda';

import { LADDER, isDegenerate, ladderVerdict, overlapsPrevious, previousOfSameMethod } from './ladderData';
import { PENDING_LADDER, SCOREBOARD_MEASURED_AT, SCOREBOARD_ROWS } from './scoreboardData';
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

        {/* Ф2: лестница обучения спектрального. Отдельной секцией, а не строками таблицы
            выше: там вопрос «кто чего стоит», здесь — «держится ли одно с ростом N»
            (разбор Родченко 06.08). Оба метода сборки показаны рядом; отбирать «лучший»
            по тесту запрещено самим отчётом, и витрина не намекает на победителя. */}
        <section className="text-xs" aria-labelledby="scoreboard-ladder">
          <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
            <h4 id="scoreboard-ladder" className="font-medium">
              Спектральный: лестница обучения
            </h4>
            {LADDER.available && (
              <span className="opacity-60">
                тест неподвижен: {LADDER.testLabel} · корпус {LADDER.corpusLabel}
              </span>
            )}
          </div>

          {!LADDER.available ? (
            <p className="opacity-70">{LADDER.unavailableReason}</p>
          ) : (
            <>
              <p className="opacity-70 mb-1">
                Растёт только обучающая часть; ступень считается в дронах. Если интервалы
                соседних ступеней перекрываются — рост не доказан, сколько бы ни двигалась точка.
              </p>
              <div className="overflow-x-auto">
                <table className="table table-xs">
                  <thead>
                    <tr>
                      <th>обучено на</th>
                      <th>сборка</th>
                      <th>обнаружено</th>
                      <th>ложных</th>
                      <th className="font-mono">P_d интервал</th>
                      <th className="font-mono">AUC</th>
                      <th>против прошлой ступени</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LADDER.steps.map((step, i) => {
                      const prev = previousOfSameMethod(LADDER.steps, i);
                      const overlap = overlapsPrevious(step, prev);
                      return (
                        <tr key={`${step.nTrainDrones}-${step.method}`}>
                          <td className="tabular-nums">
                            {step.nTrainDrones} дронов
                            <div className="opacity-60">из {step.nTrainTotal} записей</div>
                          </td>
                          <td>{step.method}</td>
                          <td className="tabular-nums">
                            {step.detected} из {step.dronesTotal}
                          </td>
                          <td className="tabular-nums">
                            {step.falseAlarms} из {step.cleanTotal}
                          </td>
                          <td className="tabular-nums font-mono">
                            {step.pdInterval[0].toFixed(2)}–{step.pdInterval[1].toFixed(2)}
                          </td>
                          <td className="tabular-nums font-mono">
                            {step.rocAuc == null ? '—' : step.rocAuc.toFixed(3)}
                          </td>
                          <td className="opacity-70">
                            {isDegenerate(step) ? (
                              <span className="font-medium">
                                сработал на всё — рабочая точка фиктивна
                              </span>
                            ) : overlap === null ? (
                              'первая ступень'
                            ) : overlap ? (
                              `интервал перекрывается с ${prev?.nTrainDrones} — рост не доказан`
                            ) : (
                              `интервал разошёлся с ${prev?.nTrainDrones}`
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="opacity-80 mt-1 font-medium">{ladderVerdict(LADDER.steps)}</p>
              <p className="opacity-60 mt-1">
                Отчёт собран {LADDER.generatedAt?.slice(0, 10)} · интервал{' '}
                {LADDER.steps[0]?.intervalMethod} · параметры подобраны только на обучающей части.
                Замер не говорит о поведении за пределами этого теста и этих ступеней.
              </p>
            </>
          )}
        </section>

        <section className="text-xs" aria-labelledby="scoreboard-pending-ladder">
          <h4 id="scoreboard-pending-ladder" className="font-medium mb-1">
            Ступени обучения — ещё не измерены
          </h4>
          <p className="opacity-70 mb-1">
            Показаны пустыми намеренно: «не измерено» не то же самое, что «измерено плохо».
          </p>
          <ul className="opacity-70 space-y-0.5">
            {PENDING_LADDER.map((step) => (
              <li key={step.trainSize} className="tabular-nums">
                обучение на {step.trainSize} — {step.blockedBy}
              </li>
            ))}
          </ul>
        </section>

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
