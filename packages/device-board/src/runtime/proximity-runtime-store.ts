import type { ProximityTrendResult, ScenarioReferenceValue } from '@membrana/core';

/**
 * basn-4 (#323): in-memory ProximityRef per MakeProximityTrend node.
 * Ключевой инвариант: ref.valid = (trend !== 'lost') — выход из alarm-loop
 * собирается существующим is-valid (false-ветка) без нового branch-узла.
 */
export class ProximityRuntimeStore {
  private readonly nodeResults = new Map<
    string,
    { readonly ref: ScenarioReferenceValue; readonly result: ProximityTrendResult }
  >();

  /** Сохраняет результат последней оценки узла; lost → invalid ref. */
  setNodeResult(nodeId: string, result: ProximityTrendResult): ScenarioReferenceValue {
    const ref: ScenarioReferenceValue = {
      kind: 'ProximityRef',
      handle: `proximity:${nodeId}`,
      valid: result.trend !== 'lost',
    };
    this.nodeResults.set(nodeId, { ref, result });
    return ref;
  }

  /** ProximityRef последней оценки узла; до первой оценки — invalid. */
  getProximityRef(nodeId: string): ScenarioReferenceValue {
    return (
      this.nodeResults.get(nodeId)?.ref ?? {
        kind: 'ProximityRef',
        handle: null,
        valid: false,
      }
    );
  }

  /** Результат последней оценки (для инспектора/логов). */
  getResult(nodeId: string): ProximityTrendResult | null {
    return this.nodeResults.get(nodeId)?.result ?? null;
  }

  resetAll(): void {
    this.nodeResults.clear();
  }
}
