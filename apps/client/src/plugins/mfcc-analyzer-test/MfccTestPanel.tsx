/**
 * Панель тембрового теста. Спринт `mfcc-plugin-sprint`, блок `mfcc-plugin-ui-screen`
 * (верстальщик) — последний блок спринта.
 *
 * РАСКЛАДКА СВЕРХУ ВНИЗ, по решению верстальщика: управление → живой счётчик → вердикт →
 * разделитель → коридоры калибровки. Вердикт стоит ВЫШЕ коридоров, потому что коридоры
 * объясняют вердикт, а не наоборот.
 *
 * ТРИ ЛЕГАЛЬНЫХ «НЕТ» ВЕРСТАЛЬЩИКА, принятые целиком:
 *  · нет выгрузки отчёта с панели — требует медиа-слоя и договора с ним, отдельная работа;
 *  · нет истории серий — состояние хранит РОВНО одну, история значила бы переделку состояния;
 *  · нет покадрового вердикта во время сбора — вердикт считается по полной серии,
 *    промежуточный не значил бы ничего. Живой счётчик кадров при этом есть.
 *
 * ЧЕГО ЗДЕСЬ НЕТ ПО ЧУЖОЙ ПРИЧИНЕ, а не по решению. Считалка коэффициентов приходит
 * ПРОПОМ `extract`. Клиент не зависит от `@membrana/mfcc-analyzer-service`, и ядро не везёт
 * готовую реализацию — экстрактор в нём инъецируемый. Завести зависимость значило бы править
 * `apps/client/package.json`, а он не в зоне ни одного блока этого спринта. Долг назван, а не
 * закрыт молча правкой чужого файла: включение прибора в реестр плагинов — следующая работа.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AnalysisSourceSelect } from '../../lib/audioAnalysis/AnalysisSourceSelect';
import type { AnalysisSourceKind } from '../../lib/audioAnalysis';

import { CoefficientRow } from './components/CoefficientRow';
import { ReportCard } from './components/ReportCard';
import { buildMfccTestReport } from './buildMfccTestReport';
import { installMfccAnalyzerTest } from './mfccAnalyzerPlugin';
import {
  INITIAL_MFCC_STATE,
  effectiveMagnitudeFloor,
  setAnalysisSource,
  setFrameCount,
  setStrictness,
  type MfccPluginState,
} from './mfccPluginState';
import { MFCC_PRESET_FIRST_CUT } from './presets';
import { MFCC_FRAME_COUNTS, type MfccFrameCount, type MfccStrictnessLevel } from './types';

/**
 * Подписи уровней — словами владельца из шторма, а не «слабый/средний/сильный».
 * Уровень называет ОБСТАНОВКУ, в которой прибор должен срабатывать, иначе выбор делается
 * вслепую: «строже» само по себе не говорит, строже к чему.
 */
const STRICTNESS_LABELS: Record<MfccStrictnessLevel, string> = {
  easy: 'Мягкий · цель под моторами и стрельбой',
  normal: 'Средний · разные модели и ветер',
  strict: 'Строгий · дрон без постороннего шума',
};

export interface MfccTestPanelProps {
  /**
   * Считалка коэффициентов. Приходит извне: плагин не знает, как они считаются, и не должен
   * — этот шов назван структурщиком до работы.
   */
  readonly extract: (samples: Float32Array) => readonly number[] | null;
}

export const MfccTestPanel: React.FC<MfccTestPanelProps> = ({ extract }) => {
  const preset = MFCC_PRESET_FIRST_CUT;
  const [state, setState] = useState<MfccPluginState>(INITIAL_MFCC_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const handle = useMemo(
    () => installMfccAnalyzerTest({ extract, onState: setState, preset }),
    [extract, preset],
  );

  // Снятие обязательно: без него поток кадров переживёт панель и будет считать в пустоту.
  useEffect(() => () => handle.teardown(), [handle]);

  const floor = effectiveMagnitudeFloor(state, preset.minMagnitude);
  const report = useMemo(
    () => (state.series === null ? null : buildMfccTestReport(state.series, preset, floor)),
    [state.series, preset, floor],
  );

  // Значения судимых коэффициентов берутся из ПОСЛЕДНЕГО судимого кадра: немой кадр значений
  // не даёт, и подставлять его нули значило бы нарисовать точку там, где замера не было.
  const lastJudgedValues = useMemo(() => {
    const frames = state.series?.frames ?? [];
    for (let i = frames.length - 1; i >= 0; i -= 1) {
      const f = frames[i];
      if (f !== undefined && f.state !== 'silent') return f.judgedValues;
    }
    return null;
  }, [state.series]);

  const valueOf = useCallback(
    (coefficient: number): number | null => {
      if (lastJudgedValues === null) return null;
      const at = preset.judgedCoefficients.indexOf(coefficient);
      return at < 0 ? null : (lastJudgedValues[at] ?? null);
    },
    [lastJudgedValues, preset.judgedCoefficients],
  );

  const collected = state.series?.frames.length ?? 0;

  return (
    <div className="space-y-3 p-2">
      <div className="grid grid-cols-2 gap-2">
        <AnalysisSourceSelect
          value={state.config.analysisSource as AnalysisSourceKind}
          onChange={(v) => setState((s) => setAnalysisSource(s, v))}
        />
        <label className="form-control w-full">
          <span className="label-text text-xs">Кадров в серии</span>
          <select
            className="select select-bordered select-xs w-full"
            aria-label="Кадров в серии"
            value={state.config.frameCount}
            disabled={state.collecting}
            onChange={(e) =>
              setState((s) => setFrameCount(s, Number(e.target.value) as MfccFrameCount))
            }
          >
            {MFCC_FRAME_COUNTS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div role="group" aria-label="Уровень строгости" className="space-y-1">
        {(Object.keys(STRICTNESS_LABELS) as MfccStrictnessLevel[]).map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={state.config.strictness === level}
            disabled={state.collecting}
            className={`btn btn-xs w-full justify-start min-h-8 ${
              state.config.strictness === level ? 'btn-primary' : 'btn-ghost'
            }`}
            onClick={() => setState((s) => setStrictness(s, level))}
          >
            {STRICTNESS_LABELS[level]}
          </button>
        ))}
      </div>

      {!preset.situationsCalibrated && (
        <p className="text-[10px] leading-snug text-warning" role="note">
          Обстановки не откалиброваны: имена уровней держатся на аналогии с пороговым
          детектором, а не на измерении — смесей цели с помехой в корпусе не было.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          className="btn btn-success btn-xs flex-1 min-h-10"
          disabled={state.collecting}
          onClick={() => void handle.start(stateRef.current)}
        >
          Старт
        </button>
        <button
          type="button"
          className="btn btn-error btn-xs flex-1 min-h-10"
          disabled={!state.collecting}
          onClick={() => void handle.stop()}
        >
          Стоп
        </button>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="text-center text-[11px] tabular-nums text-base-content/60"
      >
        {state.collecting
          ? `идёт сбор · кадров ${collected} из ${state.config.frameCount}`
          : report === null
            ? 'прогонов ещё не было'
            : `серия собрана · кадров ${collected}`}
      </p>

      {report !== null && !state.collecting && <ReportCard report={report} />}

      <div className="space-y-1">
        <div className="flex items-baseline justify-between border-t border-base-content/10 pt-2">
          <span className="text-[10px] uppercase tracking-wide text-base-content/50">
            Коридоры калибровки · только чтение
          </span>
          <span className="text-[10px] text-base-content/40">
            ◆ — судятся ({preset.judgedCoefficients.length} из {preset.bounds.length})
          </span>
        </div>
        <div className="grid grid-cols-1 gap-px sm:grid-cols-2">
          {preset.bounds.map((b, i) => (
            <CoefficientRow
              key={i}
              index={i}
              min={b.min}
              max={b.max}
              value={valueOf(i)}
              isJudged={preset.judgedCoefficients.includes(i)}
            />
          ))}
        </div>
        <p className="text-[10px] leading-snug text-base-content/40">{preset.provenance}</p>
      </div>
    </div>
  );
};
