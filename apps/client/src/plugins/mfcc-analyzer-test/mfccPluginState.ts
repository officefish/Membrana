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
  MfccFrameResult,
  MfccIntervalMs,
  MfccPluginConfig,
  MfccSeriesResult,
  MfccStrictnessLevel,
} from './types';
import { MFCC_FRAME_COUNTS, MFCC_INTERVALS } from './types';

/**
 * Умолчания конфига — те же, что у порогового детектора: «5×500 мс, normal».
 * Промежуток взят из образца, а не назначен: принцип замеров через промежуток задан
 * владельцем в шторме, и расходиться с образцом в числах не на чем.
 */
export const DEFAULT_MFCC_CONFIG: MfccPluginConfig = {
  strictness: 'normal',
  frameCount: 5,
  intervalMs: 500,
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
   * Замеры ИДУЩЕЙ серии, по одному по мере взятия. Пусто, когда сбора нет.
   *
   * Отдельно от `series` намеренно: серия — это вердикт, она существует только целиком.
   * Незаконченный набор замеров вердиктом не является, и звать его серией значило бы дать
   * экрану показать половину как целое.
   */
  readonly taken: readonly MfccFrameResult[];
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
  taken: [],
  measuredMagnitudeFloor: null,
};

/** Уровень строгости — закрытый список; чужое значение отвергается, а не подставляется. */
export function isStrictnessLevel(v: unknown): v is MfccStrictnessLevel {
  return v === 'easy' || v === 'normal' || v === 'strict';
}

export function isFrameCount(v: unknown): v is MfccFrameCount {
  return MFCC_FRAME_COUNTS.includes(v as MfccFrameCount);
}

export function isIntervalMs(v: unknown): v is MfccIntervalMs {
  return MFCC_INTERVALS.includes(v as MfccIntervalMs);
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
    taken: [],
  };
}

export function setFrameCount(state: MfccPluginState, count: MfccFrameCount): MfccPluginState {
  if (state.config.frameCount === count) return state;
  return {
    ...state,
    config: { ...state.config, frameCount: count },
    collecting: false,
    series: null,
    taken: [],
  };
}

export function setIntervalMs(state: MfccPluginState, ms: MfccIntervalMs): MfccPluginState {
  if (state.config.intervalMs === ms) return state;
  // Как и прочие настройки, отменяет идущий сбор: серия, у которой часть кадров снята с одним
  // промежутком, а часть с другим, охватывает неизвестно какое время и устойчивости не меряет.
  return {
    ...state,
    config: { ...state.config, intervalMs: ms },
    collecting: false,
    series: null,
    taken: [],
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
    taken: [],
    measuredMagnitudeFloor: null,
  };
}

export function startCollecting(state: MfccPluginState): MfccPluginState {
  if (state.collecting) return state;
  // Прошлая серия снимается на старте, а не по приходу первой новой: иначе между нажатием
  // и первым кадром экран показывал бы прошлый вердикт как текущий.
  return { ...state, collecting: true, series: null, taken: [] };
}

export function stopCollecting(state: MfccPluginState): MfccPluginState {
  if (!state.collecting) return state;
  return { ...state, collecting: false };
}

/**
 * Взятый замер — в ход серии. Копится только пока идёт сбор: замер, пришедший после отмены,
 * принадлежит серии, которой уже нет, и приписывать его следующей значило бы смешать две.
 */
export function appendTaken(state: MfccPluginState, frame: MfccFrameResult): MfccPluginState {
  if (!state.collecting) return state;
  return { ...state, taken: [...state.taken, frame] };
}

export function applySeries(state: MfccPluginState, series: MfccSeriesResult): MfccPluginState {
  return { ...state, collecting: false, series, taken: [] };
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
