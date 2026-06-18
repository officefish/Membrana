import { describe, expect, it } from 'vitest';
import type { Node, NodeChange } from '@xyflow/react';

import {
  buildDemoFunctionInput,
  buildDeviceScenarioDocument,
  createEventBoardNode,
  deserializeScenarioSubgraph,
  ensureEventEntry,
  hydrateBoardFromDocument,
  isEventNode,
  rejectSystemNodeRemovals,
  serializeScenarioSubgraph,
  validatePreRun,
  EVENT_DEVICE_HANDLE,
  INITIAL_SCENARIO_INITIAL_EDGES,
  INITIAL_SCENARIO_INITIAL_NODES,
  INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
  INITIAL_SCENARIO_ON_DISCONNECT_NODES,
  INITIAL_SCENARIO_ON_STOP_EDGES,
  INITIAL_SCENARIO_ON_STOP_NODES,
  INITIAL_SIGNAL_EDGES,
  INITIAL_SIGNAL_NODES,
  SCENARIO_INITIAL_ENTRY,
  SCENARIO_ON_CONNECT_ENTRY,
  SCENARIO_ON_DISCONNECT_ENTRY,
  SCENARIO_ON_STOP_ENTRY,
} from './index.js';

function plainScenarioNode(id: string): Node {
  return {
    id,
    type: 'board',
    position: { x: 0, y: 0 },
    data: {
      label: 'placeholder',
      layer: 'scenario',
      status: 'active',
      blockKind: 'write-journal',
      inputs: [{ name: 'exec-in', kind: 'exec' }],
      outputs: [{ name: 'exec-out', kind: 'exec' }],
    },
  };
}

describe('device-board Event node (DBR3)', () => {
  it('creates a non-deletable system node with exec + DeviceRef outputs', () => {
    const node = createEventBoardNode({ id: 'evt-1' });
    expect(node.deletable).toBe(false);
    expect(isEventNode(node)).toBe(true);
    const data = node.data as { system?: boolean; outputs?: { name: string; socketType?: string }[] };
    expect(data.system).toBe(true);
    expect(data.outputs?.some((pin) => pin.name === 'exec-out')).toBe(true);
    const deviceOut = data.outputs?.find((pin) => pin.name === EVENT_DEVICE_HANDLE);
    expect(deviceOut?.socketType).toBe('DeviceRef');
  });

  it('rejects UI remove changes for system nodes but keeps others', () => {
    const event = createEventBoardNode({ id: 'evt-1' });
    const plain = plainScenarioNode('plain-1');
    const changes: NodeChange[] = [
      { type: 'remove', id: 'evt-1' },
      { type: 'remove', id: 'plain-1' },
    ];
    const filtered = rejectSystemNodeRemovals(changes, [event, plain]);
    expect(filtered).toHaveLength(1);
    expect((filtered[0] as { id: string }).id).toBe('plain-1');
  });

  it('ensureEventEntry injects a missing Event and is idempotent', () => {
    const injected = ensureEventEntry('initial-event', [plainScenarioNode('p1')], 'On start');
    expect(injected).toHaveLength(2);
    expect(isEventNode(injected[0]!)).toBe(true);
    expect(injected[0]!.id).toBe('initial-event');

    const again = ensureEventEntry('initial-event', injected, 'On start');
    expect(again.filter(isEventNode)).toHaveLength(1);
  });

  it('round-trips the Event node through serialize → deserialize', () => {
    const sub = serializeScenarioSubgraph(
      SCENARIO_INITIAL_ENTRY,
      INITIAL_SCENARIO_INITIAL_NODES,
      INITIAL_SCENARIO_INITIAL_EDGES,
    );
    const serializedEvent = sub.nodes.find((node) => node.nodeKind === 'event');
    expect(serializedEvent).toBeDefined();
    expect(serializedEvent?.system).toBe(true);
    expect(serializedEvent?.id).toBe(SCENARIO_INITIAL_ENTRY);

    const { nodes } = deserializeScenarioSubgraph(sub);
    const event = nodes.find(isEventNode);
    expect(event).toBeDefined();
    expect(event?.deletable).toBe(false);
  });

  it('auto-injects Event as entry in all four event handlers on hydrate', () => {
    const doc = buildDeviceScenarioDocument({
      deviceKind: 'microphone',
      signalNodes: INITIAL_SIGNAL_NODES,
      signalEdges: INITIAL_SIGNAL_EDGES,
      // Ветки-обработчики без Event-узла (legacy/мигрированный документ).
      scenarioInitialNodes: [plainScenarioNode('initial-legacy')],
      scenarioInitialEdges: [],
      scenarioOnConnectNodes: [plainScenarioNode('on-connect-legacy')],
      scenarioOnConnectEdges: [],
      scenarioMainNodes: [],
      scenarioMainEdges: [],
      scenarioAlarmNodes: [],
      scenarioAlarmEdges: [],
      scenarioOnStopNodes: [plainScenarioNode('on-stop-legacy')],
      scenarioOnStopEdges: [],
      scenarioOnDisconnectNodes: [plainScenarioNode('on-disconnect-legacy')],
      scenarioOnDisconnectEdges: [],
      scenarioFunctions: [],
    });

    const state = hydrateBoardFromDocument(doc);
    const entryIsEvent = (nodes: Node[], entryId: string): boolean => {
      const entry = nodes.find((node) => node.id === entryId);
      return entry !== undefined && isEventNode(entry);
    };

    expect(entryIsEvent(state.scenarioInitialNodes, SCENARIO_INITIAL_ENTRY)).toBe(true);
    expect(entryIsEvent(state.scenarioOnConnectNodes, SCENARIO_ON_CONNECT_ENTRY)).toBe(true);
    expect(entryIsEvent(state.scenarioOnStopNodes, SCENARIO_ON_STOP_ENTRY)).toBe(true);
    expect(entryIsEvent(state.scenarioOnDisconnectNodes, SCENARIO_ON_DISCONNECT_ENTRY)).toBe(true);

    // Лупы не обработчики — Event туда не инжектится.
    expect(state.scenarioMainNodes.some(isEventNode)).toBe(false);
    expect(state.scenarioAlarmNodes.some(isEventNode)).toBe(false);
  });

  it('pre-run fails when a handler entry is not a system Event node', () => {
    const issues = validatePreRun({
      deviceKind: 'microphone',
      signalNodes: INITIAL_SIGNAL_NODES,
      signalEdges: INITIAL_SIGNAL_EDGES,
      // entry id совпадает с SCENARIO_INITIAL_ENTRY, но это не Event-узел.
      scenarioInitialNodes: [plainScenarioNode(SCENARIO_INITIAL_ENTRY)],
      scenarioInitialEdges: [],
      scenarioMainNodes: [],
      scenarioMainEdges: [],
      scenarioAlarmNodes: [],
      scenarioAlarmEdges: [],
      scenarioOnStopNodes: INITIAL_SCENARIO_ON_STOP_NODES,
      scenarioOnStopEdges: INITIAL_SCENARIO_ON_STOP_EDGES,
      scenarioOnDisconnectNodes: INITIAL_SCENARIO_ON_DISCONNECT_NODES,
      scenarioOnDisconnectEdges: INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
      scenarioFunctions: [buildDemoFunctionInput()],
    });
    expect(issues.some((issue) => issue.code === 'event-entry-required')).toBe(true);
  });

  it('pre-run passes the Event-as-entry rule for the demo handlers', () => {
    const issues = validatePreRun({
      deviceKind: 'microphone',
      signalNodes: INITIAL_SIGNAL_NODES,
      signalEdges: INITIAL_SIGNAL_EDGES,
      scenarioInitialNodes: INITIAL_SCENARIO_INITIAL_NODES,
      scenarioInitialEdges: INITIAL_SCENARIO_INITIAL_EDGES,
      scenarioMainNodes: [],
      scenarioMainEdges: [],
      scenarioAlarmNodes: [],
      scenarioAlarmEdges: [],
      scenarioOnStopNodes: INITIAL_SCENARIO_ON_STOP_NODES,
      scenarioOnStopEdges: INITIAL_SCENARIO_ON_STOP_EDGES,
      scenarioOnDisconnectNodes: INITIAL_SCENARIO_ON_DISCONNECT_NODES,
      scenarioOnDisconnectEdges: INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
      scenarioFunctions: [buildDemoFunctionInput()],
    });
    expect(issues.some((issue) => issue.code === 'event-entry-required')).toBe(false);
  });
});
