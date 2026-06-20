import { describe, expect, it } from 'vitest';
import { parseDeviceScenarioDocument } from '@membrana/core';

import {
  buildDeviceScenarioDocument,
  buildDemoFunctionInput,
  exportDeviceScenarioDocument,
  hydrateBoardFromDocument,
  hydratedFunctionInput,
  importDeviceScenarioFromJson,
  INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
  INITIAL_SCENARIO_ON_DISCONNECT_NODES,
  INITIAL_SCENARIO_ON_STOP_EDGES,
  INITIAL_SCENARIO_ON_STOP_NODES,
  INITIAL_SCENARIO_ALARM_EDGES,
  INITIAL_SCENARIO_ALARM_NODES,
  INITIAL_SCENARIO_INITIAL_EDGES,
  INITIAL_SCENARIO_INITIAL_NODES,
  INITIAL_SCENARIO_MAIN_EDGES,
  INITIAL_SCENARIO_MAIN_NODES,
  INITIAL_SIGNAL_EDGES,
  INITIAL_SIGNAL_NODES,
  isPreRunValid,
  isValidBoardConnection,
  serializeSignalGraph,
  validatePreRun,
} from './index.js';

describe('device-board graph serialize', () => {
  it('rejects incompatible signal socket connection', () => {
    const valid = isValidBoardConnection(
      {
        source: 'signal-capture',
        target: 'signal-analyzer',
        sourceHandle: 'audio-out',
        targetHandle: 'audio-in',
      },
      INITIAL_SIGNAL_NODES,
      'signal',
    );
    expect(valid).toBe(true);

    const invalid = isValidBoardConnection(
      {
        source: 'signal-analyzer',
        target: 'signal-capture',
        sourceHandle: 'spectrum-out',
        targetHandle: 'audio-in',
      },
      INITIAL_SIGNAL_NODES,
      'signal',
    );
    expect(invalid).toBe(false);
  });

  it('serializes signal graph nodes and edges', () => {
    const graph = serializeSignalGraph(INITIAL_SIGNAL_NODES, INITIAL_SIGNAL_EDGES);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges[0]).toMatchObject({
      sourceHandle: 'audio-out',
      targetHandle: 'audio-in',
    });
  });

  it('builds parseable device-scenario document', () => {
    const doc = buildDeviceScenarioDocument({
      deviceKind: 'microphone',
      signalNodes: INITIAL_SIGNAL_NODES,
      signalEdges: INITIAL_SIGNAL_EDGES,
      scenarioInitialNodes: INITIAL_SCENARIO_INITIAL_NODES,
      scenarioInitialEdges: INITIAL_SCENARIO_INITIAL_EDGES,
      scenarioMainNodes: INITIAL_SCENARIO_MAIN_NODES,
      scenarioMainEdges: INITIAL_SCENARIO_MAIN_EDGES,
      scenarioAlarmNodes: INITIAL_SCENARIO_ALARM_NODES,
      scenarioAlarmEdges: INITIAL_SCENARIO_ALARM_EDGES,
      scenarioOnStopNodes: INITIAL_SCENARIO_ON_STOP_NODES,
      scenarioOnStopEdges: INITIAL_SCENARIO_ON_STOP_EDGES,
      scenarioOnDisconnectNodes: INITIAL_SCENARIO_ON_DISCONNECT_NODES,
      scenarioOnDisconnectEdges: INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
      scenarioFunctions: [buildDemoFunctionInput()],
    });
    const parsed = parseDeviceScenarioDocument(doc);
    expect(parsed.ok).toBe(true);
  });

  it('validatePreRun passes for initial demo graph', () => {
    const issues = validatePreRun({
      deviceKind: 'microphone',
      signalNodes: INITIAL_SIGNAL_NODES,
      signalEdges: INITIAL_SIGNAL_EDGES,
      scenarioInitialNodes: INITIAL_SCENARIO_INITIAL_NODES,
      scenarioInitialEdges: INITIAL_SCENARIO_INITIAL_EDGES,
      scenarioMainNodes: INITIAL_SCENARIO_MAIN_NODES,
      scenarioMainEdges: INITIAL_SCENARIO_MAIN_EDGES,
      scenarioAlarmNodes: INITIAL_SCENARIO_ALARM_NODES,
      scenarioAlarmEdges: INITIAL_SCENARIO_ALARM_EDGES,
      scenarioOnStopNodes: INITIAL_SCENARIO_ON_STOP_NODES,
      scenarioOnStopEdges: INITIAL_SCENARIO_ON_STOP_EDGES,
      scenarioOnDisconnectNodes: INITIAL_SCENARIO_ON_DISCONNECT_NODES,
      scenarioOnDisconnectEdges: INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
      scenarioFunctions: [buildDemoFunctionInput()],
    });
    expect(issues).toEqual([]);
  });

  it('export adds hash and exportedAt', async () => {
    const doc = buildDeviceScenarioDocument({
      deviceKind: 'microphone',
      signalNodes: INITIAL_SIGNAL_NODES,
      signalEdges: INITIAL_SIGNAL_EDGES,
      scenarioInitialNodes: INITIAL_SCENARIO_INITIAL_NODES,
      scenarioInitialEdges: INITIAL_SCENARIO_INITIAL_EDGES,
      scenarioMainNodes: INITIAL_SCENARIO_MAIN_NODES,
      scenarioMainEdges: INITIAL_SCENARIO_MAIN_EDGES,
      scenarioAlarmNodes: INITIAL_SCENARIO_ALARM_NODES,
      scenarioAlarmEdges: INITIAL_SCENARIO_ALARM_EDGES,
      scenarioOnStopNodes: INITIAL_SCENARIO_ON_STOP_NODES,
      scenarioOnStopEdges: INITIAL_SCENARIO_ON_STOP_EDGES,
      scenarioOnDisconnectNodes: INITIAL_SCENARIO_ON_DISCONNECT_NODES,
      scenarioOnDisconnectEdges: INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
      scenarioFunctions: [buildDemoFunctionInput()],
      title: 'Drone watch',
    });
    const exported = await exportDeviceScenarioDocument(doc);
    expect(exported.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(exported.document.meta?.exportedAt).toBeDefined();
    expect(exported.document.meta?.hash).toBe(exported.hash);
  });

  it('round-trips export → import and passes pre-run validation', async () => {
    const doc = buildDeviceScenarioDocument({
      deviceKind: 'microphone',
      signalNodes: INITIAL_SIGNAL_NODES,
      signalEdges: INITIAL_SIGNAL_EDGES,
      scenarioInitialNodes: INITIAL_SCENARIO_INITIAL_NODES,
      scenarioInitialEdges: INITIAL_SCENARIO_INITIAL_EDGES,
      scenarioMainNodes: INITIAL_SCENARIO_MAIN_NODES,
      scenarioMainEdges: INITIAL_SCENARIO_MAIN_EDGES,
      scenarioAlarmNodes: INITIAL_SCENARIO_ALARM_NODES,
      scenarioAlarmEdges: INITIAL_SCENARIO_ALARM_EDGES,
      scenarioOnStopNodes: INITIAL_SCENARIO_ON_STOP_NODES,
      scenarioOnStopEdges: INITIAL_SCENARIO_ON_STOP_EDGES,
      scenarioOnDisconnectNodes: INITIAL_SCENARIO_ON_DISCONNECT_NODES,
      scenarioOnDisconnectEdges: INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
      scenarioFunctions: [buildDemoFunctionInput()],
    });
    const exported = await exportDeviceScenarioDocument(doc);
    const imported = importDeviceScenarioFromJson(exported.json);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const state = hydrateBoardFromDocument(imported.document);
    const issues = validatePreRun({
      deviceKind: state.deviceKind,
      signalNodes: state.signalNodes,
      signalEdges: state.signalEdges,
      scenarioInitialNodes: state.scenarioInitialNodes,
      scenarioInitialEdges: state.scenarioInitialEdges,
      scenarioMainNodes: state.scenarioMainNodes,
      scenarioMainEdges: state.scenarioMainEdges,
      scenarioAlarmNodes: state.scenarioAlarmNodes,
      scenarioAlarmEdges: state.scenarioAlarmEdges,
      scenarioOnStopNodes: state.scenarioOnStopNodes,
      scenarioOnStopEdges: state.scenarioOnStopEdges,
      scenarioOnDisconnectNodes: state.scenarioOnDisconnectNodes,
      scenarioOnDisconnectEdges: state.scenarioOnDisconnectEdges,
      scenarioFunctions: [hydratedFunctionInput(state)],
    });
    expect(isPreRunValid(issues)).toBe(true);
  });

  it('rejects newer device-scenario version on import', () => {
    const doc = buildDeviceScenarioDocument({
      deviceKind: 'microphone',
      signalNodes: INITIAL_SIGNAL_NODES,
      signalEdges: INITIAL_SIGNAL_EDGES,
      scenarioInitialNodes: INITIAL_SCENARIO_INITIAL_NODES,
      scenarioInitialEdges: INITIAL_SCENARIO_INITIAL_EDGES,
      scenarioMainNodes: INITIAL_SCENARIO_MAIN_NODES,
      scenarioMainEdges: INITIAL_SCENARIO_MAIN_EDGES,
      scenarioAlarmNodes: INITIAL_SCENARIO_ALARM_NODES,
      scenarioAlarmEdges: INITIAL_SCENARIO_ALARM_EDGES,
      scenarioOnStopNodes: INITIAL_SCENARIO_ON_STOP_NODES,
      scenarioOnStopEdges: INITIAL_SCENARIO_ON_STOP_EDGES,
      scenarioOnDisconnectNodes: INITIAL_SCENARIO_ON_DISCONNECT_NODES,
      scenarioOnDisconnectEdges: INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
      scenarioFunctions: [buildDemoFunctionInput()],
    });
    const newer = { ...doc, version: 999 };
    const imported = importDeviceScenarioFromJson(JSON.stringify(newer));
    expect(imported.ok).toBe(false);
  });
});
