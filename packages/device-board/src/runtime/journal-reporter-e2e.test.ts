import { describe, expect, it, vi } from 'vitest';
import {
  createReferenceValue,
  createScenarioVariable,
  type ScenarioSubgraph,
  type ScenarioVariable,
} from '@membrana/core';

import { MAKE_REPORT_FROM_TRACK_OUT_HANDLE } from '../graph/make-report-from-track-node.js';
import { VARIABLE_VALUE_HANDLE } from '../graph/variable-node.js';
import { executeScenarioBlock } from './block-executor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { ReportRuntimeStore } from './report-runtime-store.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import { ScenarioVariableStore } from './variable-store.js';

describe('journal reporter E2E (DBJ4)', () => {
  it('MakeReportFromTrack → PublishReport calls host publishReport with payload', async () => {
    const reportPayload = {
      schema: 'drone-detection-report/v1',
      reportId: 'rep-e2e-1',
      trackId: 'track-abc',
      isDetected: true,
      summaryText: 'detected',
      payload: { source: 'e2e' },
    };
    const makeReportFromTrack = vi.fn(async () => reportPayload);
    const publishReport = vi.fn(async () => true);
    const host = createStubScenarioRuntimeHost({ makeReportFromTrack, publishReport });

    const journalVar: ScenarioVariable = {
      ...createScenarioVariable('var-journal', 'journal1', 'JournalRef'),
      value: createReferenceValue('JournalRef', 'journal:device:dev-1'),
    };
    const reporterVar: ScenarioVariable = {
      ...createScenarioVariable('var-reporter', 'reporter1', 'ReporterRef'),
      value: createReferenceValue('ReporterRef', 'reporter:journal:device:dev-1'),
    };
    const trackVar: ScenarioVariable = {
      ...createScenarioVariable('var-track', 'track1', 'TrackRef'),
      value: createReferenceValue('TrackRef', 'track:track-abc'),
    };

    const variableStore = new ScenarioVariableStore([journalVar, reporterVar, trackVar]);
    const reportStore = new ReportRuntimeStore();

    const subgraph: ScenarioSubgraph = {
      entry: 'mrt',
      nodes: [
        {
          id: 'vg-journal',
          nodeKind: 'variable-get',
          blockKind: 'custom',
          label: 'Journal',
          variableId: journalVar.id,
        },
        {
          id: 'vg-reporter',
          nodeKind: 'variable-get',
          blockKind: 'custom',
          label: 'Reporter',
          variableId: reporterVar.id,
        },
        {
          id: 'vg-track',
          nodeKind: 'variable-get',
          blockKind: 'custom',
          label: 'Track',
          variableId: trackVar.id,
        },
        {
          id: 'mrt',
          nodeKind: 'make-report-from-track',
          blockKind: 'custom',
          label: 'MakeReportFromTrack',
        },
        {
          id: 'pr',
          nodeKind: 'publish-report',
          blockKind: 'custom',
          label: 'PublishReport',
        },
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'vg-reporter',
          sourceHandle: VARIABLE_VALUE_HANDLE,
          target: 'mrt',
          targetHandle: 'reporter',
          dataType: 'ReporterRef',
        },
        {
          id: 'd2',
          kind: 'data',
          source: 'vg-track',
          sourceHandle: VARIABLE_VALUE_HANDLE,
          target: 'mrt',
          targetHandle: 'track',
          dataType: 'TrackRef',
        },
        {
          id: 'd3',
          kind: 'data',
          source: 'mrt',
          sourceHandle: MAKE_REPORT_FROM_TRACK_OUT_HANDLE,
          target: 'pr',
          targetHandle: 'report',
          dataType: 'ReportRef',
        },
        {
          id: 'd4',
          kind: 'data',
          source: 'vg-journal',
          sourceHandle: VARIABLE_VALUE_HANDLE,
          target: 'pr',
          targetHandle: 'journal',
          dataType: 'JournalRef',
        },
        {
          id: 'x1',
          kind: 'exec',
          source: 'mrt',
          sourceHandle: 'exec-out',
          target: 'pr',
          targetHandle: 'exec-in',
        },
      ],
    };

    const resolveContext = {
      getReportRef: (nodeId: string) => reportStore.getReportRef(nodeId),
    };

    await runSubgraphOnce(subgraph, host, new AbortController().signal, {
      branch: 'main',
      variableStore,
      reportStore,
      resolveContext,
    });

    expect(makeReportFromTrack).toHaveBeenCalledOnce();
    expect(publishReport).toHaveBeenCalledOnce();
    expect(publishReport).toHaveBeenCalledWith(journalVar.value, reportPayload);
    expect(reportStore.getReportRef('mrt').handle).toBe('report:rep-e2e-1');
  });

  it('PublishReport skips host when ReportRef payload missing', async () => {
    const publishReport = vi.fn(async () => true);
    const host = createStubScenarioRuntimeHost({ publishReport });
    const journalVar: ScenarioVariable = {
      ...createScenarioVariable('var-journal', 'journal1', 'JournalRef'),
      value: createReferenceValue('JournalRef', 'journal:device:dev-1'),
    };
    const reportVar: ScenarioVariable = {
      ...createScenarioVariable('var-report', 'report1', 'ReportRef'),
      value: createReferenceValue('ReportRef', 'report:missing'),
    };
    const variableStore = new ScenarioVariableStore([journalVar, reportVar]);
    const reportStore = new ReportRuntimeStore();

    const node = {
      id: 'pr-1',
      nodeKind: 'publish-report' as const,
      blockKind: 'custom' as const,
      label: 'PublishReport',
    };
    const subgraph: ScenarioSubgraph = {
      nodes: [
        {
          id: 'vg-journal',
          nodeKind: 'variable-get',
          blockKind: 'custom',
          label: 'Journal',
          variableId: journalVar.id,
        },
        {
          id: 'vg-report',
          nodeKind: 'variable-get',
          blockKind: 'custom',
          label: 'Report',
          variableId: reportVar.id,
        },
        node,
      ],
      edges: [
        {
          id: 'd1',
          kind: 'data',
          source: 'vg-journal',
          sourceHandle: VARIABLE_VALUE_HANDLE,
          target: 'pr-1',
          targetHandle: 'journal',
          dataType: 'JournalRef',
        },
        {
          id: 'd2',
          kind: 'data',
          source: 'vg-report',
          sourceHandle: VARIABLE_VALUE_HANDLE,
          target: 'pr-1',
          targetHandle: 'report',
          dataType: 'ReportRef',
        },
      ],
    };

    await executeScenarioBlock({
      host,
      signal: new AbortController().signal,
      branch: 'main',
      subgraph,
      node,
      lastDetection: null,
      defaultChunkDurationMs: 5000,
      functions: [],
      variableStore,
      reportStore,
      resolveContext: {},
    });

    expect(publishReport).not.toHaveBeenCalled();
  });
});
