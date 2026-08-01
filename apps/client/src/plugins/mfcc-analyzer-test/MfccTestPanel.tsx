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

import { CoefficientRow } from './components/CoefficientRow';
import { ReportCard } from './components/ReportCard';
import { SeriesTicks } from './components/SeriesTicks';
import { buildMfccTestReport } from './buildMfccTestReport';
import { installMfccAnalyzerTest, toSourceKind } from './mfccAnalyzerPlugin';
import {
  INITIAL_MFCC_STATE,
  applyMagnitudeFloor,
  effectiveMagnitudeFloor,
  isFrameCount,
  isIntervalMs,
  setAnalysisSource,
  setFrameCount,
  setIntervalMs,
  setStrictness,
  type MfccPluginState,
} from './mfccPluginState';
import { MFCC_PRESET_FIRST_CUT } from './presets';
import { MFCC_FRAME_COUNTS, MFCC_INTERVALS, type MfccStrictnessLevel } from './types';

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
  readonly extract: (samples: Float32Array, sampleRate: number) => readonly number[] | null;
  /** Модуль-хозяин: по нему адресуется живой микрофонный тракт. Без него кадров не будет. */
  readonly moduleId: string;
}

export const MfccTestPanel: React.FC<MfccTestPanelProps> = ({ extract, moduleId }) => {
  const preset = MFCC_PRESET_FIRST_CUT;
  const [state, setState] = useState<MfccPluginState>(INITIAL_MFCC_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const handle = useMemo(
    () => installMfccAnalyzerTest({ extract, onState: setState, moduleId, preset }),
    [extract, moduleId, preset],
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
    // Во время сбора — из хода серии, после — из готовой: иначе коридоры оживали бы только
    // в конце, и весь сбор оператор смотрел бы на пустые дорожки.
    const frames = state.collecting ? state.taken : (state.series?.frames ?? []);
    for (let i = frames.length - 1; i >= 0; i -= 1) {
      const f = frames[i];
      if (f !== undefined && f.state !== 'silent') return f.judgedValues;
    }
    return null;
  }, [state.collecting, state.taken, state.series]);

  const valueOf = useCallback(
    (coefficient: number): number | null => {
      if (lastJudgedValues === null) return null;
      const at = preset.judgedCoefficients.indexOf(coefficient);
      return at < 0 ? null : (lastJudgedValues[at] ?? null);
    },
    [lastJudgedValues, preset.judgedCoefficients],
  );

  // Счёт ведётся по ХОДУ сбора, а не по готовой серии: серия появляется только целиком, и
  // пока её нет, счётчик по ней стоял бы на нуле весь сбор — прибор работал, а выглядел мёртвым.
  const collected = state.collecting ? state.taken.length : (state.series?.frames.length ?? 0);

  // Замер тишины — отдельное действие оператора. Слушать тишину надо, когда цели заведомо
  // нет; смешать это с серией значило бы взять порог по звуку, в котором цель, возможно, есть.
  const [measuring, setMeasuring] = useState(false);
  const [measureNote, setMeasureNote] = useState<string | null>(null);
  const runMeasure = useCallback(() => {
    setMeasuring(true);
    setMeasureNote(null);
    void handle
      .measureSilence(stateRef.current)
      .then((m) => {
        if (m.floor === null) {
          // Отказ показывается словами, а не молчаливым отсутствием порога: иначе оператор
          // решит, что замер прошёл, и будет судить незащищённым прибором, думая обратное.
          setMeasureNote(`замер не состоялся: ${m.refusal ?? 'причина не названа'}`);
          return;
        }
        setState((s) => applyMagnitudeFloor(s, m.floor as number));
        setMeasureNote(
          `порог ${m.floor.toFixed(4)} по ${m.sampleCount} кадрам ` +
            `(тишина ${m.observed?.min.toFixed(4)}…${m.observed?.max.toFixed(4)})`,
        );
      })
      .finally(() => setMeasuring(false));
  }, [handle]);

  return (
    <div className="space-y-3 p-2">
      <div className="grid grid-cols-2 gap-2">
        <AnalysisSourceSelect
          value={toSourceKind(state.config.analysisSource)}
          onChange={(v) => setState((s) => setAnalysisSource(s, v))}
        />
        <label className="form-control w-full">
          <span className="label-text text-xs">Замеров в серии</span>
          <select
            className="select select-bordered select-xs w-full"
            aria-label="Замеров в серии"
            value={state.config.frameCount}
            disabled={state.collecting}
            onChange={(e) => {
              // Разбор, а не приведение: значение приходит из разметки строкой, и каст просто
              // объявил бы его правильным. Чужое значение — не смена настройки, а ничего.
              const next = Number(e.target.value);
              if (isFrameCount(next)) setState((s) => setFrameCount(s, next));
            }}
          >
            {MFCC_FRAME_COUNTS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="form-control w-full">
        <span className="label-text text-xs">
          Промежуток между замерами
          <span className="ml-1 text-base-content/50">
            · серия охватит {((state.config.frameCount - 1) * state.config.intervalMs) / 1000}
            {' с'}
          </span>
        </span>
        <select
          className="select select-bordered select-xs w-full"
          aria-label="Промежуток между замерами"
          value={state.config.intervalMs}
          disabled={state.collecting}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (isIntervalMs(next)) setState((s) => setIntervalMs(s, next));
          }}
        >
          {MFCC_INTERVALS.map((ms) => (
            <option key={ms} value={ms}>
              {ms === 0 ? 'подряд, без промежутка' : `${ms} мс`}
            </option>
          ))}
        </select>
      </label>

      {state.config.intervalMs === 0 && (
        <p className="text-[10px] leading-snug text-warning" role="note">
          Без промежутка серия — это один непрерывный звук: при пяти замерах меньше полусекунды.
          Устойчивость источника так не меряется, короткий хлопок пройдёт серию целиком.
        </p>
      )}

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

      <div className="space-y-1 rounded-lg border border-base-content/10 p-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-outline btn-xs flex-1 min-h-9"
            disabled={state.collecting || measuring}
            onClick={runMeasure}
          >
            {measuring ? 'слушаю тишину…' : 'Замерить тишину'}
          </button>
          <span className="w-28 shrink-0 text-right text-[10px] tabular-nums text-base-content/60">
            {state.measuredMagnitudeFloor === null
              ? 'порог не замерен'
              : `порог ${state.measuredMagnitudeFloor.toFixed(4)}`}
          </span>
        </div>
        <p className="text-[10px] leading-snug text-base-content/50">
          {measureNote ??
            'Замерять при заведомо молчащей цели: порог отделяет немой кадр от судимого. ' +
              'Пока не замерен, защиты от тишины нет — кадр из околонулевых коэффициентов ' +
              'проходит любой коридор, включающий ноль.'}
        </p>
      </div>

      <div className="space-y-1">
        <SeriesTicks
          total={state.config.frameCount}
          taken={state.collecting ? state.taken : (state.series?.frames ?? [])}
          isCollecting={state.collecting}
        />
        <div className="flex flex-wrap justify-center gap-3 text-[10px] text-base-content/50">
          <span>✓ в воротах</span>
          <span>✗ вне ворот</span>
          <span>· немой, не судился</span>
        </div>
        <p
          role="status"
          aria-live="polite"
          className="text-center text-[11px] tabular-nums text-base-content/60"
        >
          {state.collecting
            ? `идёт сбор · замеров ${collected} из ${state.config.frameCount}`
            : report === null
              ? 'прогонов ещё не было'
              : `серия собрана · замеров ${collected}`}
        </p>
      </div>

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
