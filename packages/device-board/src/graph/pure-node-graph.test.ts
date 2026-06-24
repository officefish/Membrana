import { describe, expect, it } from 'vitest';
import { createScenarioVariable } from '@membrana/core';
import type { Edge } from '@xyflow/react';

import { createMakeRecordingPolicyBoardNode } from './make-recording-policy-node.js';
import { createGetJournalBoardNode } from './get-journal-node.js';
import { createGetRecorderBoardNode } from './get-recorder-node.js';
import { createGetReporterBoardNode, getReporterNodePins } from './get-reporter-node.js';
import { createVariableBoardNode } from './variable-node.js';
import {
  applyPureGraphHygiene,
  isScenarioExecEdge,
  isScenarioExecFlowEdge,
  stripExecEdgesForNodes,
  stripOrphanExecEdges,
  syncPureNodePins,
} from './pure-node-graph.js';

describe('pure-node-graph (G2)', () => {
  const deviceVar = createScenarioVariable('v1', 'device1', 'DeviceRef');

  it('isScenarioExecEdge detects linear exec handles', () => {
    expect(
      isScenarioExecEdge({ sourceHandle: 'exec-out', targetHandle: 'exec-in' }),
    ).toBe(true);
    expect(
      isScenarioExecEdge({ sourceHandle: 'exec-false-out', targetHandle: 'exec-in' }),
    ).toBe(false);
    expect(
      isScenarioExecEdge({ sourceHandle: 'value', targetHandle: 'value' }),
    ).toBe(false);
  });

  it('isScenarioExecFlowEdge detects branch exec handles', () => {
    expect(
      isScenarioExecFlowEdge({ sourceHandle: 'exec-false-out', targetHandle: 'exec-in' }),
    ).toBe(true);
    expect(
      isScenarioExecFlowEdge({ sourceHandle: 'exec-true-out', targetHandle: 'exec-in' }),
    ).toBe(true);
    expect(
      isScenarioExecFlowEdge({ sourceHandle: 'value', targetHandle: 'exec-in' }),
    ).toBe(false);
  });

  it('stripExecEdgesForNodes removes branch exec edges incident to pure node', () => {
    const edges: Edge[] = [
      {
        id: 'branch',
        source: 'a',
        target: 'b',
        sourceHandle: 'exec-false-out',
        targetHandle: 'exec-in',
      },
      { id: 'data', source: 'x', target: 'y', sourceHandle: 'value', targetHandle: 'value' },
    ];
    const stripped = stripExecEdgesForNodes(edges, new Set(['b']));
    expect(stripped.map((edge) => edge.id)).toEqual(['data']);
  });

  it('stripExecEdgesForNodes removes incident exec edges', () => {
    const edges: Edge[] = [
      { id: 'e1', source: 'a', target: 'b', sourceHandle: 'exec-out', targetHandle: 'exec-in' },
      { id: 'e2', source: 'b', target: 'c', sourceHandle: 'exec-out', targetHandle: 'exec-in' },
      { id: 'd1', source: 'x', target: 'y', sourceHandle: 'value', targetHandle: 'value' },
    ];
    const stripped = stripExecEdgesForNodes(edges, new Set(['b']));
    expect(stripped.map((edge) => edge.id)).toEqual(['d1']);
  });

  it('syncPureNodePins removes exec pins from policy constructor', () => {
    const policy = createMakeRecordingPolicyBoardNode({ id: 'pol' });
    const [synced] = syncPureNodePins([policy], []);
    expect(synced?.data.inputs).toEqual([]);
    expect(synced?.data.outputs?.some((pin) => pin.kind === 'exec')).toBe(false);
    expect(synced?.data.pure).toBe(true);
  });

  it('syncPureNodePins adds exec pins for impure variable-get', () => {
    const getter = createVariableBoardNode('variable-get', deviceVar, { id: 'vg' });
    getter.data = { ...getter.data, pure: false };
    const [synced] = syncPureNodePins([getter], [deviceVar]);
    expect(synced?.data.inputs?.some((pin) => pin.name === 'exec-in')).toBe(true);
    expect(synced?.data.outputs?.some((pin) => pin.name === 'exec-out')).toBe(true);
    expect(synced?.data.pure).toBe(false);
  });

  it('applyPureGraphHygiene strips exec edges for pure getter', () => {
    const getter = createVariableBoardNode('variable-get', deviceVar, { id: 'vg' });
    const edges: Edge[] = [
      { id: 'e1', source: 'evt', target: 'vg', sourceHandle: 'exec-out', targetHandle: 'exec-in' },
    ];
    const { edges: cleaned } = applyPureGraphHygiene([getter], edges, [deviceVar]);
    expect(cleaned).toHaveLength(0);
  });

  it('applyPureGraphHygiene strips exec-false-out to pure get-journal', () => {
    const journal = createGetJournalBoardNode({ id: 'gj' });
    const variableSet = createVariableBoardNode('variable-set', deviceVar, {
      id: 'vs',
      variableId: deviceVar.id,
    });
    const edges: Edge[] = [
      {
        id: 'branch',
        source: 'is-valid',
        target: 'gj',
        sourceHandle: 'exec-false-out',
        targetHandle: 'exec-in',
      },
      {
        id: 'data',
        source: 'gj',
        target: 'vs',
        sourceHandle: 'journal',
        targetHandle: 'value',
      },
    ];
    const { edges: cleaned } = applyPureGraphHygiene([journal, variableSet], edges, [deviceVar]);
    expect(cleaned.map((edge) => edge.id)).toEqual(['data']);
  });

  it('stripOrphanExecEdges removes exec wire when target lacks exec-in pin', () => {
    const journal = createGetJournalBoardNode({ id: 'gj' });
    const [syncedJournal] = syncPureNodePins([journal], []);
    const edges: Edge[] = [
      {
        id: 'orphan',
        source: 'is-valid',
        target: 'gj',
        sourceHandle: 'exec-false-out',
        targetHandle: 'exec-in',
      },
    ];
    const cleaned = stripOrphanExecEdges([syncedJournal], edges);
    expect(cleaned).toHaveLength(0);
  });

  it('syncPureNodePins removes exec pins from pure get-journal', () => {
    const journal = createGetJournalBoardNode({ id: 'gj' });
    const [synced] = syncPureNodePins([journal], []);
    expect(synced?.data.inputs?.some((pin) => pin.name === 'exec-in')).toBe(false);
    expect(synced?.data.outputs?.some((pin) => pin.name === 'exec-out')).toBe(false);
  });

  it('syncPureNodePins adds exec pins for impure get-reporter', () => {
    const reporter = createGetReporterBoardNode({ id: 'gr' });
    reporter.data = { ...reporter.data, pure: false };
    const [synced] = syncPureNodePins([reporter], []);
    expect(getReporterNodePins(false).inputs.some((pin) => pin.name === 'exec-in')).toBe(true);
    expect(synced?.data.inputs?.some((pin) => pin.name === 'exec-in')).toBe(true);
    expect(synced?.data.pure).toBe(false);
  });

  it('syncPureNodePins removes exec pins from pure get-recorder', () => {
    const recorder = createGetRecorderBoardNode({ id: 'grc' });
    const [synced] = syncPureNodePins([recorder], []);
    expect(synced?.data.inputs?.some((pin) => pin.name === 'exec-in')).toBe(false);
    expect(synced?.data.outputs?.some((pin) => pin.name === 'exec-out')).toBe(false);
  });
});
