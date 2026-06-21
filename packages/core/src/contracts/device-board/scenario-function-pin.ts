/**
 * Граничные pins пользовательской функции (CGF F1, D-PINS-9).
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §4.3
 */

import type { SocketType } from './socket-type.js';

/** Максимум pins на стороне Input или Output (exec + data в общем лимите). */
export const MAX_SCENARIO_FUNCTION_PINS_PER_SIDE = 9;

/** Один pin на границе функции. */
export interface ScenarioFunctionPin {
  readonly id: string;
  readonly name: string;
  readonly kind: 'exec' | 'data';
  /** Обязателен для `kind: 'data'`. */
  readonly socketType?: SocketType;
}

function slugPinId(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'pin';
}

/** Дефолтный exec-in pin новой функции. */
export function createDefaultFunctionExecInputPin(): ScenarioFunctionPin {
  return { id: 'exec-in', name: 'exec-in', kind: 'exec' };
}

/** Дефолтный exec-out pin новой функции. */
export function createDefaultFunctionExecOutputPin(): ScenarioFunctionPin {
  return { id: 'exec-out', name: 'exec-out', kind: 'exec' };
}

/** Нормализует legacy string pin или объект. */
export function normalizeScenarioFunctionPin(
  value: string | ScenarioFunctionPin,
): ScenarioFunctionPin {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const kind = trimmed.startsWith('exec') ? ('exec' as const) : ('data' as const);
    return {
      id: slugPinId(trimmed),
      name: trimmed,
      kind,
    };
  }
  return {
    id: value.id.trim().length > 0 ? value.id : slugPinId(value.name),
    name: value.name,
    kind: value.kind,
    ...(value.kind === 'data' && value.socketType !== undefined ? { socketType: value.socketType } : {}),
  };
}

/** Нормализует массив pins (legacy `string[]` или structured). */
export function normalizeScenarioFunctionPins(
  values: readonly (string | ScenarioFunctionPin)[] | undefined,
  fallback: readonly ScenarioFunctionPin[],
): readonly ScenarioFunctionPin[] {
  if (values === undefined || values.length === 0) {
    return fallback;
  }
  return values.map((item) => normalizeScenarioFunctionPin(item));
}

/** True, если количество pins на стороне в пределах D-PINS-9. */
export function isScenarioFunctionPinCountValid(count: number): boolean {
  return count >= 0 && count <= MAX_SCENARIO_FUNCTION_PINS_PER_SIDE;
}
