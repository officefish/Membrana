import {
  createReferenceValue,
  formatTrackRefHandle,
  type ScenarioReferenceValue,
} from '@membrana/core';

/** In-memory TrackRef registry per NewTrack node execution. */
export class TrackRuntimeStore {
  private readonly nodeTracks = new Map<string, ScenarioReferenceValue>();

  /** Сохраняет TrackRef для узла NewTrack после createTrackFromSampleRefs. */
  setNodeTrack(nodeId: string, trackId: string): ScenarioReferenceValue {
    const ref = createReferenceValue('TrackRef', formatTrackRefHandle(trackId));
    this.nodeTracks.set(nodeId, ref);
    return ref;
  }

  /** TrackRef последнего выполнения узла NewTrack. */
  getTrackRef(nodeId: string): ScenarioReferenceValue {
    return (
      this.nodeTracks.get(nodeId) ?? {
        kind: 'TrackRef',
        handle: null,
        valid: false,
      }
    );
  }

  resetAll(): void {
    this.nodeTracks.clear();
  }
}
