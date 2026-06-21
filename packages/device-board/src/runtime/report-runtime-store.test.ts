import { describe, expect, it } from 'vitest';
import { createScenarioReportPayload } from '@membrana/core';

import { ReportRuntimeStore } from './report-runtime-store.js';

describe('ReportRuntimeStore (DBJ3)', () => {
  it('stores payload and returns ReportRef per node', () => {
    const store = new ReportRuntimeStore();
    const payload = createScenarioReportPayload({
      schema: 'drone-detection-report/v1',
      reportId: 'rep-1',
      trackId: 'track-1',
      isDetected: true,
      payload: { foo: 'bar' },
    });
    const ref = store.setNodeReport('node-1', payload);
    expect(ref.kind).toBe('ReportRef');
    expect(ref.handle).toBe('report:rep-1');
    expect(ref.valid).toBe(true);
    expect(store.getReportRef('node-1')).toEqual(ref);
    expect(store.getPayload('report:rep-1')).toEqual(payload);
  });

  it('resetAll clears registry', () => {
    const store = new ReportRuntimeStore();
    store.setNodeReport(
      'node-1',
      createScenarioReportPayload({
        schema: 'trends-fft/v0.1',
        reportId: 'rep-2',
        trackId: 'track-2',
        isDetected: false,
        payload: {},
      }),
    );
    store.resetAll();
    expect(store.getReportRef('node-1').valid).toBe(false);
    expect(store.getPayload('report:rep-2')).toBeNull();
  });
});
