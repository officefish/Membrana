import type { BoardSocketPin } from './board-node-data.js';

/** Одна «сквозная» пара in/out с общей подписью по центру ноды. */
export interface PassthroughPortLane {
  readonly centerText: string;
  readonly inputHandle: string;
  readonly outputHandle: string;
  readonly centerTopPercent: number;
}

/** Вертикальное смещение handle (в % высоты тела ноды). */
export function handleOffsetPercent(index: number, total: number): number {
  if (total <= 1) {
    return 50;
  }
  return ((index + 1) / (total + 1)) * 100;
}

/**
 * Пары портов с одинаковой подписью (exec/exec, & device/& device, …).
 * Для них в UI одна центральная метка `-> label ->` вместо дубля на краях.
 * Если число входов и выходов различается — сквозные метки не показываем.
 */
export function findPassthroughPortLanes(
  inputs: readonly BoardSocketPin[],
  outputs: readonly BoardSocketPin[],
  resolveLabel: (pin: BoardSocketPin) => string,
): PassthroughPortLane[] {
  if (inputs.length !== outputs.length) {
    return [];
  }

  const lanes: PassthroughPortLane[] = [];
  const usedOutputIndices = new Set<number>();

  inputs.forEach((inputPin, inputIndex) => {
    const label = resolveLabel(inputPin);
    const outputIndex = outputs.findIndex(
      (outputPin, index) =>
        !usedOutputIndices.has(index) && resolveLabel(outputPin) === label,
    );
    if (outputIndex < 0) {
      return;
    }
    usedOutputIndices.add(outputIndex);
    lanes.push({
      centerText: `-> ${label} ->`,
      inputHandle: inputPin.name,
      outputHandle: outputs[outputIndex]!.name,
      centerTopPercent:
        (handleOffsetPercent(inputIndex, inputs.length) +
          handleOffsetPercent(outputIndex, outputs.length)) /
        2,
    });
  });

  return lanes;
}
