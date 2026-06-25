import {
  createReferenceValue,
  formatPromiseRefHandle,
  parsePromiseRefHandle,
  type ScenarioAsyncJobKind,
  type ScenarioReferenceValue,
} from '@membrana/core';

/** In-memory PromiseRef registry per Start Async Job node. */
export class PromiseRuntimeStore {
  private readonly nodePromises = new Map<string, ScenarioReferenceValue>();

  /** Сохраняет PromiseRef после регистрации async job. */
  setNodePromise(
    nodeId: string,
    kind: ScenarioAsyncJobKind,
    promiseId: string,
  ): ScenarioReferenceValue {
    const ref = createReferenceValue('PromiseRef', formatPromiseRefHandle(kind, promiseId));
    this.nodePromises.set(nodeId, ref);
    return ref;
  }

  /** PromiseRef последнего выполнения Start Async Job. */
  getPromiseRef(nodeId: string): ScenarioReferenceValue {
    return (
      this.nodePromises.get(nodeId) ?? {
        kind: 'PromiseRef',
        handle: null,
        valid: false,
      }
    );
  }

  /** True, если handle совпадает с зарегистрированным PromiseRef узла. */
  nodeMatchesPromiseHandle(nodeId: string, handle: string): boolean {
    const ref = this.nodePromises.get(nodeId);
    if (ref === undefined || ref.handle === null) {
      return false;
    }
    const parsed = parsePromiseRefHandle(handle);
    const nodeParsed = parsePromiseRefHandle(ref.handle);
    return (
      parsed !== null &&
      nodeParsed !== null &&
      parsed.kind === nodeParsed.kind &&
      parsed.promiseId === nodeParsed.promiseId
    );
  }

  resetAll(): void {
    this.nodePromises.clear();
  }
}
