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
import {
  evaluatePipe,
  magnitudeOf,
  type MfccVector,
  type PipeSpec,
} from '@membrana/mfcc-analyzer-service';

import {
  createAnalysisFrameFeed,
  type AnalysisSourceKind,
  type AudioFrameFeed,
} from '../../lib/audioAnalysis';

import {
  MIN_SILENCE_FRAMES,
  detectMagnitudeThreshold,
  type MagnitudeThresholdMeasurement,
} from './detectMagnitudeThreshold';
import { MFCC_PRESET_FIRST_CUT } from './presets';
import {
  INITIAL_MFCC_STATE,
  appendTaken,
  applySeries,
  effectiveMagnitudeFloor,
  startCollecting,
  stopCollecting,
  type MfccPluginState,
} from './mfccPluginState';
import type { MfccFrameResult, MfccPresetSpec, MfccSeriesResult } from './types';

export const MFCC_ANALYZER_TEST_PLUGIN_ID = 'mfcc-analyzer-test';

/**
 * Сколько кадров слушать тишину. Втрое больше минимума замера: черта по самому краю выборки
 * держалась бы на одном кадре, а не на хвосте распределения.
 */
const SILENCE_SAMPLE_FRAMES = MIN_SILENCE_FRAMES * 3;

/** Срок ожидания кадров тишины. Кадр при окне 4096 и частоте 48 кГц идёт ~85 мс. */
const SILENCE_DEADLINE_MS = 8_000;

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
  sampleRate: number;
} | null {
  // Частота — несущая настройка, а не подробность: банк мел-фильтров строится ОТ НЕЁ, и
  // вектор, снятый на 44 100, несравним с воротами, снятыми на 48 000. Пока отпечаток её не
  // нёс, подмена не ловилась ничем — длина вектора совпадала, и вердикт выносился о другом.
  // Отпечаток без `-sr` отвергается намеренно: «не знаем частоту» и «частота такая-то» суть
  // разные состояния, и первое не должно молча притворяться вторым.
  const m = /^mel(\d+)-c(\d+)-buf(\d+)-sr(\d+)$/u.exec(configHash);
  if (!m) return null;
  return {
    melBands: Number(m[1]),
    numberOfCoefficients: Number(m[2]),
    bufferSize: Number(m[3]),
    sampleRate: Number(m[4]),
  };
}

/**
 * Норма вектора — по ней кадр признаётся немым. Счёт УШЁЛ В ПАКЕТ (`magnitudeOf`); здесь
 * остался мост через контейнер:
 * meyda отдаёт `number[]`, судья ждёт `Float32Array`. Это ABI, а не семантика — норма √Σx²
 * от контейнера не зависит (обзор `docs/discussions/mfcc-judge-semantics.md`, §2).
 */
export function vectorMagnitude(vector: readonly number[]): number {
  return magnitudeOf(Float32Array.from(vector));
}

/**
 * Пресет клиента → спека судьи. Разворот делает КЛИЕНТ, и это по праву, а не по недоделке:
 * `strictness` у прибора есть выбор пары порогов внутри пресета, а у пакета такого понятия
 * нет вовсе — в спеке уже лежат числа. Судья не обязан знать, из какого набора взяты его
 * пороги.
 */
function specOf(
  preset: MfccPresetSpec,
  strictness: MfccSeriesResult['strictness'],
  magnitudeFloor: number,
): PipeSpec {
  const pair = preset.strictness[strictness];
  return {
    bounds: preset.bounds,
    configHash: preset.configHash,
    minInBandRatio: pair.minInBandRatio,
    minPassRate: pair.minPassRate,
    minMagnitude: magnitudeFloor,
    judgedCoefficients: preset.judgedCoefficients,
  };
}

/** Вектор клиента → вектор судьи. `windowStartIndex` порядковый: серия равномерна. */
function vectorsOf(raw: readonly (readonly number[])[], configHash: string): MfccVector[] {
  return raw.map((v, i) => ({
    coefficients: Float32Array.from(v),
    windowStartIndex: i,
    configHash,
  }));
}

/**
 * Слепок отсуженных коэффициентов — забота КЛИЕНТА, а не судьи. Пакет его не хранит
 * принципиально: приговор кадра не есть архив его входа. Панели слепок нужен для показа,
 * поэтому собирается здесь, рядом с вызовом, из тех же чисел.
 */
function judgedValuesOf(vector: readonly number[], preset: MfccPresetSpec): number[] {
  return preset.judgedCoefficients.map((c) => vector[c] ?? Number.NaN);
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
  const judgedValues = judgedValuesOf(vector, preset);
  const spec: PipeSpec = {
    ...specOf(preset, 'normal', magnitudeFloor),
    // Кадр судится долей коэффициентов в коридоре; доля прошедших КАДРОВ к одному кадру
    // отношения не имеет, и подставлять сюда порог серии значило бы смешать два предмета.
    minInBandRatio,
    minPassRate: 0,
  };
  const outcome = evaluatePipe(vectorsOf([vector], preset.configHash), spec);

  if (!outcome.ok) {
    // Приговор неизвестен — и это НЕ «прошёл» и не «провалил». В словаре прибора кадр, о
    // котором судья ничего не сказал, называется немым: он выходит из знаменателя серии, а
    // причина отказа доедет до панели строкой серии. Выдумать здесь состояние значило бы
    // написать приговор за судью.
    return {
      index,
      magnitude: vectorMagnitude(vector),
      judgedValues,
      inBandCount: 0,
      judgedCount: judged.length,
      state: 'silent',
    };
  }

  const verdict = outcome.report.frames[0]!;
  return {
    index,
    magnitude: verdict.magnitude,
    judgedValues,
    inBandCount: verdict.inBandCount,
    judgedCount: verdict.judgedCoefficientCount,
    state: verdict.state,
  };
}

/**
 * Вердикт серии. Отказ — с причиной, а не молчаливое «не обнаружено»: «цели нет» и «судить
 * было нечем» разные вещи, и слить их значит соврать в пользу прибора.
 */
export function judgeSeries(
  vectors: readonly (readonly number[])[],
  preset: MfccPresetSpec,
  strictness: MfccSeriesResult['strictness'],
  magnitudeFloor: number,
): MfccSeriesResult {
  const empty = {
    configHash: preset.configHash,
    strictness,
    frames: [] as readonly MfccFrameResult[],
    judgedCount: 0,
    silentCount: 0,
    passedCount: 0,
    passRate: 0,
    detected: false,
  };
  if (vectors.length === 0) return { ...empty, refusal: 'серия пуста — кадров не пришло' };

  const outcome = evaluatePipe(
    vectorsOf(vectors, preset.configHash),
    specOf(preset, strictness, magnitudeFloor),
  );

  // Отказ у судьи — ОТДЕЛЬНАЯ ветвь типа, у панели — поле рядом с `detected`. Разворот
  // ветви в поле делается здесь, на границе, и только в эту сторону: превратить ветвь в
  // поле внутри пакета значило бы откатиться к менее честной конструкции, где `passRate: 0`
  // читается как «серия провалилась», хотя серия не судилась вовсе.
  if (!outcome.ok) return { ...empty, refusal: outcome.reason };

  const report = outcome.report;
  const frames: MfccFrameResult[] = report.frames.map((f, i) => ({
    index: i,
    magnitude: f.magnitude,
    judgedValues: judgedValuesOf(vectors[i]!, preset),
    inBandCount: f.inBandCount,
    judgedCount: f.judgedCoefficientCount,
    state: f.state,
  }));

  const mute = report.judgedCount === 0;
  return {
    configHash: report.configHash,
    strictness,
    frames,
    judgedCount: report.judgedCount,
    silentCount: report.silentCount,
    passedCount: report.passedCount,
    passRate: report.passRate,
    // Отказ и обнаружение несовместны: инвариант прибора, а не судьи.
    detected: !mute && report.detected,
    // «Все кадры немые» судья отказом не считает — он честно отдаёт отчёт с judgedCount 0.
    // Прибору же это отказ: «цели нет» и «судить было нечем» разные вещи, и различие
    // принадлежит прибору, а не судье.
    refusal: mute ? `все ${report.frames.length} кадров немые — судить нечем` : null,
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
  // Копятся ВЕКТОРЫ, а не приговоры: судью серии зовут по исходным числам, и приговор кадра
  // архивом входа не является.
  const collected: (readonly number[])[] = [];
  const pair = preset.strictness[strictness];
  return {
    /**
     * @returns судьбу взятого замера и — когда серия набрана — вердикт.
     *
     * Замер отдаётся НАРУЖУ СРАЗУ, а не копится молча до конца: экран обязан показывать ход
     * сбора. В первой редакции наружу шёл только готовый вердикт, и счётчик на экране весь
     * сбор стоял на нуле — прибор работал, а выглядел мёртвым.
     */
    accept(vector: readonly number[]): { frame: MfccFrameResult; series: MfccSeriesResult | null } {
      const frame = judgeFrame(vector, collected.length, preset, pair.minInBandRatio, magnitudeFloor);
      collected.push(vector);
      return {
        frame,
        series:
          collected.length < frameCount
            ? null
            : judgeSeries(collected, preset, strictness, magnitudeFloor),
      };
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
/**
 * Приведение настройки источника к закрытому списку фида.
 *
 * Разбором, а не приведением типа. Живой урок 31.07: в первой редакции здесь стоял каст
 * `as never`, и он заглушил компилятор ровно там, где тот сказал бы, что фиду нужны совсем
 * другие поля. Прибор собрался, отрисовался и не получил НИ ОДНОГО кадра — поймано ручным
 * прогоном на живом микрофоне, то есть тем самым вещдоком, ради которого норма и заведена.
 */
export function toSourceKind(value: string): AnalysisSourceKind {
  if (value === 'sample-library') return 'sample-library';
  if (value === 'graph') return 'graph';
  return 'microphone';
}

export function installMfccAnalyzerTest(deps: {
  readonly extract: (samples: Float32Array, sampleRate: number) => readonly number[] | null;
  readonly onState: (state: MfccPluginState) => void;
  /** Модуль-хозяин: живой микрофонный тракт адресуется по нему, без него кадров не будет. */
  readonly moduleId: string;
  readonly preset?: MfccPresetSpec;
}): {
  start(state: MfccPluginState): Promise<void>;
  stop(): Promise<void>;
  measureSilence(state: MfccPluginState): Promise<MagnitudeThresholdMeasurement>;
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
  /** Время последнего ВЗЯТОГО замера. Кадры между замерами пропускаются, а не копятся. */
  let lastTakenAt = 0;

  const push = (next: MfccPluginState): void => {
    state = next;
    deps.onState(state);
  };

  const handleFrame = (frame: AudioSampleFrame): void => {
    if (collector === null) return;
    // ЗАМЕРЫ ЧЕРЕЗ ПРОМЕЖУТОК — принцип, названный владельцем в шторме. Поток отдаёт кадры
    // сплошь, но серия берёт из них по одному в промежуток: она меряет, что источник звучит
    // УСТОЙЧИВО, а не что он был громким доли секунды. Промежуточные кадры именно
    // ПРОПУСКАЮТСЯ, а не усредняются: усреднение размазало бы короткую помеху по всей серии.
    const now = Date.now();
    if (state.config.intervalMs > 0 && now - lastTakenAt < state.config.intervalMs) return;
    // Кадр чужой длины пропускаем: коэффициенты, снятые при другом размере окна, несравнимы
    // с воротами пресета. Молча подогнать длину значило бы судить не то, что слышно.
    const samples = frame.samples;
    if (samples.length !== parsed.bufferSize) return;
    // Частота кадра доходит сюда настоящей и передаётся дальше: раньше её выбрасывали, и
    // считалка работала на умолчании библиотеки, а не на том, что реально слышно.
    const vector = deps.extract(samples, frame.sampleRate);
    if (vector === null) return;
    // Отсчёт промежутка ведётся от ВЗЯТОГО замера, а не от пришедшего кадра: иначе кадры
    // чужой длины или несосчитанные сдвигали бы шаг, и серия охватывала бы не то время.
    lastTakenAt = now;
    const { frame: judged, series } = collector.accept(vector);
    if (series === null) {
      push(appendTaken(state, judged));
      return;
    }
    collector = null;
    push(applySeries(state, series));
  };

  return {
    async start(from: MfccPluginState): Promise<void> {
      state = from;
      // Первый замер берётся сразу: ждать промежуток до него значило бы тратить его впустую.
      lastTakenAt = 0;
      const floor = effectiveMagnitudeFloor(state, preset.minMagnitude);
      collector = createSeriesCollector(
        preset,
        state.config.strictness,
        state.config.frameCount,
        floor,
      );
      push(startCollecting(state));
      // Размер кадра берётся из ОТПЕЧАТКА ПРЕСЕТА, а не назначается здесь: считалка и ворота
      // сняты при этом окне, и попросить у фида другое значило бы судить не то, что слышно.
      feed = createAnalysisFrameFeed({
        analysisSource: toSourceKind(state.config.analysisSource),
        moduleId: deps.moduleId,
        bufferSize: parsed.bufferSize,
      });
      unsubscribe = feed.subscribe(handleFrame);
      await feed.start();
    },
    /**
     * Замер порога немого кадра на живом тракте.
     *
     * ЗАЧЕМ ОТДЕЛЬНЫМ ДЕЙСТВИЕМ, а не внутри серии: тишину надо слушать, когда цели заведомо
     * НЕТ, а серию — когда она может быть. Смешать эти два прослушивания значило бы взять
     * порог по звуку, в котором, возможно, есть цель, и объявить её частью тишины.
     *
     * Дыра, которую это закрывает, найдена ручным прогоном 31.07: замер был построен блоком
     * математика, состояние умело его принять, а на экране не было чем его вызвать. Путь был
     * мёртв — возможность есть, дотянуться нельзя.
     */
    async measureSilence(from: MfccPluginState): Promise<MagnitudeThresholdMeasurement> {
      const collected: (readonly number[])[] = [];
      const own = createAnalysisFrameFeed({
        analysisSource: toSourceKind(from.config.analysisSource),
        moduleId: deps.moduleId,
        bufferSize: parsed.bufferSize,
      });
      const off = own.subscribe((frame) => {
        if (frame.samples.length !== parsed.bufferSize) return;
        const vector = deps.extract(frame.samples, frame.sampleRate);
        if (vector !== null) collected.push(vector);
      });
      await own.start();
      // Ожидание с СРОКОМ, а не «пока не наберётся». Кадры могут не пойти вовсе — поток
      // остановлен, устройство отобрано, — и вечное ожидание оставило бы прибор висеть без
      // единого слова. По сроку выходим с тем, что есть: замер сам откажется с причиной,
      // если кадров мало.
      await new Promise<void>((resolve) => {
        const deadline = Date.now() + SILENCE_DEADLINE_MS;
        const tick = (): void => {
          if (collected.length >= SILENCE_SAMPLE_FRAMES || Date.now() >= deadline) resolve();
          else setTimeout(tick, 40);
        };
        tick();
      });
      off();
      await own.stop();
      return detectMagnitudeThreshold(collected);
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
