import type { ScenarioDetectionFusionValue } from '@membrana/core';

/**
 * basn-2 (#323): in-memory value DetectionFusion per MakeDetectionFusion node.
 * Value, не ref (консилиум т.1) — store нужен лишь чтобы downstream data-pull
 * (branch-on-detection и т.п.) читал последний результат узла между exec-шагами.
 */
export class DetectionFusionRuntimeStore {
  private readonly nodeFusions = new Map<string, ScenarioDetectionFusionValue>();

  /** Сохраняет value последнего вычисления узла MakeDetectionFusion. */
  setNodeFusion(nodeId: string, value: ScenarioDetectionFusionValue): void {
    this.nodeFusions.set(nodeId, value);
  }

  /** Value последнего вычисления узла; null — fusion ещё не считался. */
  getFusionValue(nodeId: string): ScenarioDetectionFusionValue | null {
    return this.nodeFusions.get(nodeId) ?? null;
  }

  resetAll(): void {
    this.nodeFusions.clear();
  }
}
