/**
 * Состояние и команды плагина тембрового теста. Спринт `mfcc-plugin-sprint`, блок
 * `mfcc-plugin-state` (структурщик).
 *
 * ШОВ С ЭКРАНОМ, названный до работы: внутрь идут команды `setStrictness` и `setFrameCount`,
 * наружу — текущий уровень, число кадров и результат последней серии. Экран не знает, как
 * считается серия; состояние не знает, как она рисуется.
 *
 * ЧЕГО ЗДЕСЬ НЕТ И ПОЧЕМУ. Истории прогонов, телеметрии и выгрузки — тимлид выбросил их из
 * спринта: «прибор разведки просто должен показать СЕЙЧАС; специалист видит сейчас, не
 * собирает архив». Поэтому хранится РОВНО ОДНА последняя серия.
 */
import type {
  MfccFrameCount,
  MfccPluginConfig,
  MfccSeriesResult,
  MfccStrictnessLevel,
} from './types';
import { MFCC_FRAME_COUNTS } from './types';

/** Умолчания конфига. Средний уровень и пять кадров — как у порогового детектора. */
export const DEFAULT_MFCC_CONFIG: MfccPluginConfig = {
  strictness: 'normal',
  frameCount: 5,
  analysisSource: 'microphone',
};

/**
 * Состояние одного экземпляра плагина.
 *
 * `collecting` отделено от `series !== null` намеренно: «идёт сбор» и «есть прошлый
 * результат» — разные вещи, и слить их значило бы показывать вчерашний вердикт как текущий.
 */
export interface MfccPluginState {
  readonly config: MfccPluginConfig;
  readonly collecting: boolean;
  /** Последняя серия. `null` — прогонов ещё не было в этой сессии. */
  readonly series: MfccSeriesResult | null;
  /**
   * Замеренный на живом тракте порог немого кадра. `null` — не замерян, и тогда действует
   * `minMagnitude` пресета, а он равен нулю, то есть защиты нет.
   */
  readonly measuredMagnitudeFloor: number | null;
}

export const INITIAL_MFCC_STATE: MfccPluginState = {
  config: DEFAULT_MFCC_CONFIG,
  collecting: false,
  series: null,
  measuredMagnitudeFloor: null,
};

/** Уровень строгости — закрытый список; чужое значение отвергается, а не подставляется. */
export function isStrictnessLevel(v: unknown): v is MfccStrictnessLevel {
  return v === 'easy' || v === 'normal' || v === 'strict';
}

export function isFrameCount(v: unknown): v is MfccFrameCount {
  return MFCC_FRAME_COUNTS.includes(v as MfccFrameCount);
}

/**
 * Команды. Каждая возвращает НОВОЕ состояние; молчаливой мутации нет — экран перерисовывается
 * по возвращённому значению, а не по факту, что где-то что-то поменялось.
 *
 * Смена настройки во время сбора ОТМЕНЯЕТ серию, а не правит её на ходу: серия, у которой
 * половина кадров судилась одним порогом, а половина другим, — не серия, а её видимость.
 */
export function setStrictness(
  state: MfccPluginState,
  level: MfccStrictnessLevel,
): MfccPluginState {
  if (state.config.strictness === level) return state;
  return {
    ...state,
    config: { ...state.config, strictness: level },
    collecting: false,
    series: null,
  };
}

export function setFrameCount(state: MfccPluginState, count: MfccFrameCount): MfccPluginState {
  if (state.config.frameCount === count) return state;
  return {
    ...state,
    config: { ...state.config, frameCount: count },
    collecting: false,
    series: null,
  };
}

export function setAnalysisSource(state: MfccPluginState, source: string): MfccPluginState {
  if (state.config.analysisSource === source) return state;
  // Смена источника обнуляет и замеренный порог тишины: он снят на ДРУГОМ тракте и о новом
  // ничего не говорит. Оставить его значило бы судить микрофон по чужой тишине.
  return {
    ...state,
    config: { ...state.config, analysisSource: source },
    collecting: false,
    series: null,
    measuredMagnitudeFloor: null,
  };
}

export function startCollecting(state: MfccPluginState): MfccPluginState {
  if (state.collecting) return state;
  // Прошлая серия снимается на старте, а не по приходу первой новой: иначе между нажатием
  // и первым кадром экран показывал бы прошлый вердикт как текущий.
  return { ...state, collecting: true, series: null };
}

export function stopCollecting(state: MfccPluginState): MfccPluginState {
  if (!state.collecting) return state;
  return { ...state, collecting: false };
}

export function applySeries(state: MfccPluginState, series: MfccSeriesResult): MfccPluginState {
  return { ...state, collecting: false, series };
}

export function applyMagnitudeFloor(state: MfccPluginState, floor: number): MfccPluginState {
  if (!Number.isFinite(floor) || floor < 0) return state;
  return { ...state, measuredMagnitudeFloor: floor };
}

/**
 * Порог немого кадра, действующий сейчас: замеренный на живом тракте важнее пресетного.
 * Пресетный равен нулю (защиты нет) — поэтому пока не замерено, защиты действительно нет,
 * и это видно из значения, а не из умолчания.
 */
export function effectiveMagnitudeFloor(
  state: MfccPluginState,
  presetMinMagnitude: number,
): number {
  return state.measuredMagnitudeFloor ?? presetMinMagnitude;
}
