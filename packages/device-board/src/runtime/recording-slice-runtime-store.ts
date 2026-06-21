import { createReferenceValue, type ScenarioReferenceValue } from '@membrana/core';

/** In-memory RecordingSliceRef registry per StopRecording node execution. */
export class RecordingSliceRuntimeStore {
  private readonly nodeSlices = new Map<string, ScenarioReferenceValue>();

  /** Сохраняет slice ref после StopRecording. */
  setNodeSlice(nodeId: string, sliceHandle: string): ScenarioReferenceValue {
    const ref = createReferenceValue('RecordingSliceRef', sliceHandle);
    this.nodeSlices.set(nodeId, ref);
    return ref;
  }

  /** RecordingSliceRef последнего выполнения StopRecording. */
  getSliceRef(nodeId: string): ScenarioReferenceValue {
    return (
      this.nodeSlices.get(nodeId) ?? {
        kind: 'RecordingSliceRef',
        handle: null,
        valid: false,
      }
    );
  }

  resetAll(): void {
    this.nodeSlices.clear();
  }
}
