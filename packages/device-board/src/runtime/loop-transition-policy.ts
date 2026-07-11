/**
 * loop-transition-policy — единственный решатель перехода main↔alarm по combined-метрике.
 *
 * Консилиум `detection-alarm-loop-switch-2026-07-11` (тема 1): вход в alarm по
 * `combinedScore` (fusion), а не по соло-`isDrone`. Этот слой поверх `front`
 * добавляет асимметричный гистерезис + debounce, чтобы сирена не мигала на границе
 * порога. Чистая функция — тестируется без графа и без DOM.
 *
 * - Вход: `score >= enterThreshold` (при наличии свежего окна).
 * - Удержание: `score >= enterThreshold - holdDelta` (асимметрия: вход строгий, удержание мягкое).
 * - Выход: `debounceN` подряд кадров ниже удержания (или пустых окон) → в main.
 * - Пустое окно (`present === false`): трактуется как «ниже» → затухание уверенности,
 *   не залипание в alarm (предусловие «молчащий пустой batch», решение 2026-07-11).
 */
export interface LoopTransitionPolicy {
  /** Порог входа в alarm (по умолчанию 0.5 — дефолт branch-on-detection). */
  readonly enterThreshold: number;
  /** Δ гистерезиса: удержание при `enterThreshold - holdDelta`. */
  readonly holdDelta: number;
  /** Кадров подряд ниже удержания до выхода из alarm. */
  readonly debounceN: number;
}

export const DEFAULT_LOOP_TRANSITION_POLICY: LoopTransitionPolicy = {
  enterThreshold: 0.5,
  holdDelta: 0.15,
  debounceN: 3,
};

export interface LoopTransitionState {
  /** Фактический активный луп: true — alarm, false — main. */
  readonly inAlarm: boolean;
  /** Кадров подряд ниже удержания (для debounce выхода). */
  readonly belowStreak: number;
}

export const INITIAL_LOOP_TRANSITION_STATE: LoopTransitionState = {
  inAlarm: false,
  belowStreak: 0,
};

/** Вход в кадре анализа: сырой combinedScore + наличие свежего окна. */
export interface LoopTransitionInput {
  /** Сырой combinedScore ∈ [0,1] последнего анализа. */
  readonly score: number;
  /** Есть ли свежее окно (fusion получил вход). Пустое окно → false. */
  readonly present: boolean;
}

/**
 * Продвинуть политику на один кадр. Чистая: (state, input, policy) → state.
 * `result.inAlarm` — единственный источник решения о переключении лупа.
 */
export function advanceLoopTransition(
  state: LoopTransitionState,
  input: LoopTransitionInput,
  policy: LoopTransitionPolicy = DEFAULT_LOOP_TRANSITION_POLICY,
): LoopTransitionState {
  const holdThreshold = policy.enterThreshold - policy.holdDelta;

  // Защита от невалидного score (NaN/±Inf) и кламп к контракту [0,1].
  const score = Number.isFinite(input.score) ? Math.min(1, Math.max(0, input.score)) : 0;

  // Пустое окно = нет свежей уверенности → трактуем как «ниже удержания».
  const aboveHold = input.present && score >= holdThreshold;
  const aboveEnter = input.present && score >= policy.enterThreshold;

  if (!state.inAlarm) {
    // В main: вход только по строгому порогу входа.
    if (aboveEnter) {
      return { inAlarm: true, belowStreak: 0 };
    }
    return { inAlarm: false, belowStreak: 0 };
  }

  // В alarm: удержание мягким порогом; выход по debounce ниже удержания.
  if (aboveHold) {
    return { inAlarm: true, belowStreak: 0 };
  }
  const belowStreak = state.belowStreak + 1;
  if (belowStreak >= policy.debounceN) {
    return { inAlarm: false, belowStreak: 0 };
  }
  return { inAlarm: true, belowStreak };
}
