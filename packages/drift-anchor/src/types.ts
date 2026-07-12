/**
 * Drift-Anchor — контракты данных (DA0).
 *
 * Консилиум nightly-agents-platform 2026-07-12: единый контракт для обоих якорей
 * (A структурный / B поведенческий) и утреннего дайджеста. Вердикт выносит чистая
 * функция `computeDrift`; LLM только аннотирует (reasoning-гипотеза), вердикт не меняет.
 */

export type DriftVerdict = 'ok' | 'drift' | 'broken';

/** Семейство якоря: структурный (хэши/множества) или поведенческий (числовой score). */
export type AnchorKind = 'structural' | 'behavioral';

/**
 * Компонент снимка. `structural` — строковый хэш/маркер (изменился ↔ не изменился);
 * `behavioral` — число (score), сравнивается по порогам ε₁/ε₂.
 */
export interface SnapshotComponent {
  readonly id: string;
  readonly kind: AnchorKind;
  readonly value: string | number;
}

/** Снимок состояния в момент времени (собирает раннер поверх hermes:brief — снаружи ядра). */
export interface Snapshot {
  readonly takenAt: string;
  readonly components: readonly SnapshotComponent[];
}

/** Пороги в конфиге, не в коде (иначе сам порог задрейфует). Только для behavioral. */
export interface DriftThresholds {
  /** delta > epsilon1 → 'drift'. */
  readonly epsilon1: number;
  /** delta > epsilon2 → 'broken'. */
  readonly epsilon2: number;
}

/** Результат сравнения одного компонента baseline↔current. */
export interface AnchorResult {
  readonly id: string;
  readonly kind: AnchorKind;
  readonly baseline: string | number | null;
  readonly current: string | number | null;
  /** structural: 0 (не изменён) / 1 (изменён/исчез/новый); behavioral: |Δ|. */
  readonly delta: number;
  readonly verdict: DriftVerdict;
  /** LLM-гипотеза (заполняется раннером, НЕ ядром); бейдж «гипотеза» в UI. */
  readonly reasoning?: string;
}

/** Утренний дрейф-дайджест — выход `computeDrift`, вход для UI-карточки. */
export interface MorningDriftDigest {
  readonly generatedAt: string;
  readonly anchors: readonly AnchorResult[];
  readonly summary: { readonly ok: number; readonly drift: number; readonly broken: number };
}
