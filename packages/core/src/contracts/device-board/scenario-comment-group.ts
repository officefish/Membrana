/**
 * Comment group — визуальная рамка на канвасе (CGF G1), не runtime.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §18
 */

/** Ветка / слой, на котором расположена группа. */
export type ScenarioCommentGroupBranch =
  | 'initial'
  | 'onConnect'
  | 'main'
  | 'alarm'
  | 'onStop'
  | 'onDisconnect'
  | 'function'
  | 'signal';

/** Прямоугольник группы в flow space. */
export interface ScenarioCommentGroupRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Пресеты цвета рамки comment group (DaisyUI + custom). */
export const SCENARIO_COMMENT_GROUP_FRAME_COLOR_PRESETS = [
  'custom',
  'neutral',
  'primary',
  'secondary',
  'info',
  'warning',
  'accent',
  'error',
] as const;

export type ScenarioCommentGroupFrameColorPreset =
  (typeof SCENARIO_COMMENT_GROUP_FRAME_COLOR_PRESETS)[number];

/** Цвет рамки группы: тема DaisyUI или custom RGB (#RRGGBB). */
export interface ScenarioCommentGroupFrameColor {
  readonly preset: ScenarioCommentGroupFrameColorPreset;
  /** Hex #RRGGBB — только для preset === 'custom'. */
  readonly rgb?: string;
}

export const DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR: ScenarioCommentGroupFrameColor = {
  preset: 'accent',
};

/** Type guard для preset id. */
export function isScenarioCommentGroupFrameColorPreset(
  value: string,
): value is ScenarioCommentGroupFrameColorPreset {
  return (SCENARIO_COMMENT_GROUP_FRAME_COLOR_PRESETS as readonly string[]).includes(value);
}

/** Нормализует frameColor с дефолтом accent. */
export function resolveScenarioCommentGroupFrameColor(
  input: Partial<ScenarioCommentGroupFrameColor> | null | undefined,
): ScenarioCommentGroupFrameColor {
  const preset = input?.preset;
  if (preset === undefined || !isScenarioCommentGroupFrameColorPreset(preset)) {
    return DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR;
  }
  if (preset === 'custom') {
    const rgb = typeof input?.rgb === 'string' && input.rgb.trim().length > 0 ? input.rgb.trim() : '#7c3aed';
    return { preset: 'custom', rgb };
  }
  return { preset };
}

/** Comment group в document-scope (не scenario graph node). */
export interface ScenarioCommentGroup {
  readonly id: string;
  readonly branch: ScenarioCommentGroupBranch;
  readonly title: string;
  readonly description?: string;
  readonly frameColor?: ScenarioCommentGroupFrameColor;
  readonly rect: ScenarioCommentGroupRect;
  readonly nodeIds: readonly string[];
}

/** Type guard для branch id. */
export function isScenarioCommentGroupBranch(value: string): value is ScenarioCommentGroupBranch {
  return (
    value === 'initial' ||
    value === 'onConnect' ||
    value === 'main' ||
    value === 'alarm' ||
    value === 'onStop' ||
    value === 'onDisconnect' ||
    value === 'function' ||
    value === 'signal'
  );
}
