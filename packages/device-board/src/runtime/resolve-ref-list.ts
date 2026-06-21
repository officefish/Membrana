import type { ScenarioReferenceValue, ScenarioVariableValue } from '@membrana/core';

import type { CollectRuntimeStore } from './collect-runtime-store.js';
import { isReferenceValid } from './reference-validity.js';

const COLLECT_BATCH_HANDLE_PREFIX = 'collect-batch:' as const;

export type RefListKind = 'AudioSampleRefList' | 'FftFrameRefList';

function asReferenceValue(value: ScenarioVariableValue | null): ScenarioReferenceValue | null {
  if (value === null || typeof value !== 'object' || !('handle' in value) || !('valid' in value)) {
    return null;
  }
  return value as ScenarioReferenceValue;
}

/** Раскрывает list-ref (Collect batch handle) в массив member ref'ов. */
export function resolveRefListMembers(
  listRef: ScenarioVariableValue | null,
  expectedKind: RefListKind,
  collectStore: CollectRuntimeStore | undefined,
): readonly ScenarioReferenceValue[] {
  const ref = asReferenceValue(listRef);
  if (ref === null || !isReferenceValid(ref) || ref.handle === null) {
    return [];
  }
  if (ref.kind !== expectedKind) {
    return [];
  }
  if (
    collectStore !== undefined &&
    ref.handle.startsWith(COLLECT_BATCH_HANDLE_PREFIX)
  ) {
    const collectNodeId = ref.handle.slice(COLLECT_BATCH_HANDLE_PREFIX.length);
    return collectStore.getLastBatchRefs(collectNodeId);
  }
  return [];
}
