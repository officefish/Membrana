import {
  createReferenceValue,
  formatReportRefHandle,
  type ScenarioReportPayload,
  type ScenarioReferenceValue,
} from '@membrana/core';

/** In-memory ReportRef registry per scenario run (payload for PublishReport). */
export class ReportRuntimeStore {
  private readonly payloads = new Map<string, ScenarioReportPayload>();

  private readonly nodeReports = new Map<string, ScenarioReferenceValue>();

  /** Сохраняет payload и возвращает ReportRef для узла make-report. */
  setNodeReport(nodeId: string, payload: ScenarioReportPayload): ScenarioReferenceValue {
    const ref = createReferenceValue('ReportRef', formatReportRefHandle(payload.reportId));
    if (ref.handle !== null) {
      this.payloads.set(ref.handle, payload);
    }
    this.nodeReports.set(nodeId, ref);
    return ref;
  }

  /** ReportRef, созданный последним выполнением make-report узла. */
  getReportRef(nodeId: string): ScenarioReferenceValue {
    return (
      this.nodeReports.get(nodeId) ?? {
        kind: 'ReportRef',
        handle: null,
        valid: false,
      }
    );
  }

  /** ScenarioReportPayload по handle ReportRef (для PublishReport). */
  getPayload(reportHandle: string): ScenarioReportPayload | null {
    return this.payloads.get(reportHandle) ?? null;
  }

  resetAll(): void {
    this.payloads.clear();
    this.nodeReports.clear();
  }
}
