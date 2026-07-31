/**
 * Плагин тембрового теста: живой поток кадров → кепстральные коэффициенты → ворота пресета →
 * вердикт серии. Спринт `mfcc-plugin-sprint`, блок `mfcc-plugin-lifecycle` (структурщик).
 *
 * ЗАЧЕМ. Слово владельца (шторм 31.07, хвост Х1): «нам плагины нужны просто чтобы выявить
 * потенциал MFCC как таковой». Прибор разведки, а не продукт: оператора ещё нет, и потому
 * здесь нет телеметрии, выгрузки и истории — тимлид выбросил их из спринта.
 *
 * ШОВ С ЯДРОМ, названный до работы: внутрь идёт `AudioFrameFeed` (кадры от источника),
 * наружу — векторы коэффициентов. Экстрактор принадлежит ядру, подписка и жизненный цикл —
 * плагину. Плагин не знает, как считаются коэффициенты, и не должен.
 *
 * ОТПЕЧАТОК НАСТРОЕК — НЕСУЩЕЕ. Детектор отвергает вектор с чужим `configHash`: «коридор,
 * снятый при 26 фильтрах, ничего не говорит о векторе при 40». Плагин обязан считать кадры
 * ИМЕННО при настройках пресета и объявить это. Живой урок 31.07: параметры, переданные
 * аргументом вызова считалки, молча игнорировались, и две разные конфигурации дали
 * побайтово одинаковый выход — настройки задаются свойствами объекта.
 */
import type { AudioSampleFrame } from '@membrana/audio-engine-service';

import { createAnalysisFrameFeed, type AudioFrameFeed } from '../../lib/audioAnalysis';

import { MFCC_PRESET_FIRST_CUT } from './presets';
import {
  INITIAL_MFCC_STATE,
  applySeries,
  effectiveMagnitudeFloor,
  startCollecting,
  stopCollecting,
  type MfccPluginState,
} from './mfccPluginState';
import type { MfccFrameResult, MfccPresetSpec, MfccSeriesResult } from './types';

export const MFCC_ANALYZER_TEST_PLUGIN_ID = 'mfcc-analyzer-test';

/**
 * Настройки свёртки, разобранные из отпечатка пресета.
 *
 * Разбор, а не вторая копия чисел: отпечаток и есть единственное место, где они названы.
 * Две копии разъехались бы молча — тот самый класс, что ловили весь день (у каждого
 * потребителя свой список).
 */
export function configFromHash(configHash: string): {
  melBands: number;
  numberOfCoefficients: number;
  bufferSize: number;
} | null {
  const m = /^mel(\d+)-c(\d+)-buf(\d+)$/u.exec(configHash);
  if (!m) return null;
  return {
    melBands: Number(m[1]),
    numberOfCoefficients: Number(m[2]),
    bufferSize: Number(m[3]),
  };
}

/** Норма вектора — по ней кадр признаётся немым. */
export function vectorMagnitude(vector: readonly number[]): number {
  let sum = 0;
  for (const v of vector) sum += v * v;
  return Math.sqrt(sum);
}

/**
 * Судьба одного кадра по воротам пресета.
 *
 * Немой кадр НЕ считается ни прошедшим, ни провалившим: он выходит из знаменателя серии.
 * Иначе тишина накручивала бы долю в любую сторону, и вердикт говорил бы о молчании, а не
 * о цели.
 */
export function judgeFrame(
  vector: readonly number[],
  index: number,
  preset: MfccPresetSpec,
  minInBandRatio: number,
  magnitudeFloor: number,
): MfccFrameResult {
  const judged = preset.judgedCoefficients;
  const magnitude = vectorMagnitude(vector);
  const judgedValues = judged.map((c) => vector[c] ?? Number.NaN);

  if (magnitude < magnitudeFloor) {
    return {
      index,
      magnitude,
      judgedValues,
      inBandCount: 0,
      judgedCount: judged.length,
      state: 'silent',
    };
  }

  let inBand = 0;
  for (const c of judged) {
    const value = vector[c];
    const bounds = preset.bounds[c];
    if (value === undefined || bounds === undefined || !Number.isFinite(value)) continue;
    if (value >= bounds.min && value <= bounds.max) inBand += 1;
  }
  const ratio = judged.length === 0 ? 0 : inBand / judged.length;
  return {
    index,
    magnitude,
    judgedValues,
    inBandCount: inBand,
    judgedCount: judged.length,
    state: ratio >= minInBandRatio ? 'passed' : 'failed',
  };
}

/**
 * Вердикт серии. Отказ — с причиной, а не молчаливое «не обнаружено»: «цели нет» и «судить
 * было нечем» разные вещи, и слить их значит соврать в пользу прибора.
 */
export function judgeSeries(
  frames: readonly MfccFrameResult[],
  preset: MfccPresetSpec,
  strictness: MfccSeriesResult['strictness'],
): MfccSeriesResult {
  const pair = preset.strictness[strictness];
  const silentCount = frames.filter((f) => f.state === 'silent').length;
  const judgedCount = frames.length - silentCount;
  const passedCount = frames.filter((f) => f.state === 'passed').length;
  const passRate = judgedCount === 0 ? 0 : passedCount / judgedCount;

  let refusal: string | null = null;
  if (frames.length === 0) refusal = 'серия пуста — кадров не пришло';
  else if (judgedCount === 0) refusal = `все ${frames.length} кадров немые — судить нечем`;

  return {
    configHash: preset.configHash,
    strictness,
    frames,
    judgedCount,
    silentCount,
    passedCount,
    passRate,
    detected: refusal === null && passRate >= pair.minPassRate,
    refusal,
  };
}

/**
 * Сборщик серии: копит кадры до нужной длины и отдаёт вердикт.
 *
 * Вынесен отдельно от подписки, потому что подписка — про поток и отписку, а сборка — про
 * счёт. Смешение этих двух предметов и есть «один король, два скипетра», от которого
 * структурщик оберегал ядро.
 */
export function createSeriesCollector(
  preset: MfccPresetSpec,
  strictness: MfccSeriesResult['strictness'],
  frameCount: number,
  magnitudeFloor: number,
) {
  const collected: MfccFrameResult[] = [];
  const pair = preset.strictness[strictness];
  return {
    /** @returns вердикт, когда серия набрана; `null` — ещё копим. */
    accept(vector: readonly number[]): MfccSeriesResult | null {
      collected.push(judgeFrame(vector, collected.length, preset, pair.minInBandRatio, magnitudeFloor));
      if (collected.length < frameCount) return null;
      return judgeSeries(collected, preset, strictness);
    },
    get size(): number {
      return collected.length;
    },
  };
}

/**
 * Установка плагина. Возвращает функцию снятия — фид останавливается и подписка снимается,
 * иначе поток кадров переживёт плагин и будет считать в пустоту.
 */
export function installMfccAnalyzerTest(deps: {
  readonly extract: (samples: Float32Array) => readonly number[] | null;
  readonly onState: (state: MfccPluginState) => void;
  readonly preset?: MfccPresetSpec;
}): {
  start(state: MfccPluginState): Promise<void>;
  stop(): Promise<void>;
  teardown(): void;
} {
  const preset = deps.preset ?? MFCC_PRESET_FIRST_CUT;
  const parsed = configFromHash(preset.configHash);
  if (parsed === null) {
    // Отказ на входе, а не молчаливое умолчание: неразобранный отпечаток означает, что мы
    // не знаем, при каких настройках сняты ворота, и любой вердикт был бы о чём-то другом.
    throw new Error(
      `mfcc-analyzer-test: отпечаток «${preset.configHash}» не разбирается — при каких настройках сняты ворота, неизвестно`,
    );
  }

  let feed: AudioFrameFeed | null = null;
  let unsubscribe: (() => void) | null = null;
  let collector: ReturnType<typeof createSeriesCollector> | null = null;
  let state: MfccPluginState = INITIAL_MFCC_STATE;

  const push = (next: MfccPluginState): void => {
    state = next;
    deps.onState(state);
  };

  const handleFrame = (frame: AudioSampleFrame): void => {
    if (collector === null) return;
    // Кадр чужой длины пропускаем: коэффициенты, снятые при другом размере окна, несравнимы
    // с воротами пресета. Молча подогнать длину значило бы судить не то, что слышно.
    const samples = frame.samples;
    if (samples.length !== parsed.bufferSize) return;
    const vector = deps.extract(samples);
    if (vector === null) return;
    const series = collector.accept(vector);
    if (series !== null) {
      collector = null;
      push(applySeries(state, series));
    }
  };

  return {
    async start(from: MfccPluginState): Promise<void> {
      state = from;
      const floor = effectiveMagnitudeFloor(state, preset.minMagnitude);
      collector = createSeriesCollector(
        preset,
        state.config.strictness,
        state.config.frameCount,
        floor,
      );
      push(startCollecting(state));
      feed = createAnalysisFrameFeed({ kind: state.config.analysisSource as never });
      unsubscribe = feed.subscribe(handleFrame);
      await feed.start();
    },
    async stop(): Promise<void> {
      collector = null;
      unsubscribe?.();
      unsubscribe = null;
      await feed?.stop();
      feed = null;
      push(stopCollecting(state));
    },
    teardown(): void {
      collector = null;
      unsubscribe?.();
      unsubscribe = null;
      void feed?.stop();
      feed = null;
    },
  };
}
