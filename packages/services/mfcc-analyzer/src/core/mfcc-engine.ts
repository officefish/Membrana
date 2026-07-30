/**
 * Живое состояние ядра. Всё, что помнится между кадрами, живёт **здесь и только здесь** —
 * граница проведена структурщиком: процессор stateless, движок держит состояние.
 *
 * Движок НЕ кадрирует сигнал: кадры приходят готовыми от `audio-engine-service`. Он лишь
 * ведёт настройку окна, накапливает векторы и следит, чтобы в одном окне не смешались
 * векторы, посчитанные разными настройками.
 */
import type { AudioWindow, MfccConfig, MfccExtractor, MfccVector } from '../types.js';
import { configHashOf, processWindow } from './mfcc-processor.js';

export interface MfccEngineState {
  readonly config: MfccConfig;
  readonly vectors: readonly MfccVector[];
  /** Отказы не теряются: без них «векторов мало» неотличимо от «кадры были плохие». */
  readonly refusals: readonly { readonly windowStartIndex: number; readonly reason: string }[];
}

export function createEngine(config: MfccConfig): MfccEngineState {
  return { config, vectors: [], refusals: [] };
}

/**
 * Принять кадр. Чистый редьюсер: состояние на входе, состояние на выходе, часов внутри нет.
 */
export function acceptWindow(
  state: MfccEngineState,
  window: AudioWindow,
  extract: MfccExtractor,
): MfccEngineState {
  const result = processWindow(window, state.config, extract);
  if (!result.ok) {
    return {
      ...state,
      refusals: [...state.refusals, { windowStartIndex: window.startIndex, reason: result.reason }],
    };
  }
  return { ...state, vectors: [...state.vectors, result.vector] };
}

/**
 * Сменить настройку. **Накопленные векторы отбрасываются, а не досчитываются**: вектор,
 * посчитанный прежней свёрткой, несравним с новым, и оставить их рядом значило бы получить
 * усреднение по несопоставимым величинам — молчаливо и без единого признака в выходе.
 */
export function reconfigure(state: MfccEngineState, config: MfccConfig): MfccEngineState {
  if (configHashOf(config) === configHashOf(state.config)) return state;
  return { config, vectors: [], refusals: [] };
}

/**
 * Снимок для потребителя. Отдаёт и знаменатель — сколько кадров отвергнуто: доля пригодных
 * кадров без общего числа читается как «всё хорошо» при любом качестве входа.
 */
export function snapshot(state: MfccEngineState): {
  readonly configHash: string;
  readonly accepted: number;
  readonly refused: number;
  readonly vectors: readonly MfccVector[];
} {
  return {
    configHash: configHashOf(state.config),
    accepted: state.vectors.length,
    refused: state.refusals.length,
    vectors: state.vectors,
  };
}
