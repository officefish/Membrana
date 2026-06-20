import { createReferenceValue, formatReporterRefHandle, type ScenarioReferenceValue } from '@membrana/core';

/** In-memory ReporterRef registry per journal handle (per scenario run). */
export class ReporterRuntimeStore {
  private readonly reporters = new Map<string, ScenarioReferenceValue>();

  /** Stable ReporterRef для journal handle; создаётся при первом обращении. */
  getReporterRef(journalHandle: string): ScenarioReferenceValue {
    const cached = this.reporters.get(journalHandle);
    if (cached !== undefined) {
      return cached;
    }
    const reporter = createReferenceValue(
      'ReporterRef',
      formatReporterRefHandle(journalHandle),
    );
    this.reporters.set(journalHandle, reporter);
    return reporter;
  }

  resetAll(): void {
    this.reporters.clear();
  }
}
