import { describe, expect, it } from 'vitest';
import {
  createReferenceValue,
  createScenarioVariable,
  invalidateReference,
  type ScenarioGraphEdge,
  type ScenarioGraphNode,
  type ScenarioSubgraph,
} from '@membrana/core';

import { EVENT_DEVICE_HANDLE } from '../graph/event-node.js';
import { VARIABLE_VALUE_HANDLE } from '../graph/variable-node.js';
import {
  applyVariableSetValue,
  isReferenceValid,
  resolveEventReference,
} from './reference-validity.js';
import { ResolveInputError, resolveInput, type ResolveInputContext } from './resolve-input.js';
import { ScenarioVariableStore } from './variable-store.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import { createStubScenarioRuntimeHost } from './host.js';

const DEVICE_HANDLE = 'device-abc';

function eventNode(id: string): ScenarioGraphNode {
  return {
    id,
    blockKind: 'custom',
    position: { x: 0, y: 0 },
    nodeKind: 'event',
    system: true,
  };
}

function variableGetNode(id: string, variableId: string): ScenarioGraphNode {
  return {
    id,
    blockKind: 'custom',
    position: { x: 0, y: 0 },
    nodeKind: 'variable-get',
    variableId,
  };
}

function variableSetNode(id: string, variableId: string): ScenarioGraphNode {
  return {
    id,
    blockKind: 'custom',
    position: { x: 0, y: 0 },
    nodeKind: 'variable-set',
    variableId,
  };
}

function dataEdge(
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
  dataType: 'DeviceRef' | 'MicrophoneRef' = 'DeviceRef',
): ScenarioGraphEdge {
  return {
    source,
    sourceHandle,
    target,
    targetHandle,
    kind: 'data',
    dataType,
  };
}

function execEdge(source: string, target: string): ScenarioGraphEdge {
  return {
    source,
    sourceHandle: 'exec-out',
    target,
    targetHandle: 'exec-in',
    kind: 'exec',
  };
}

function subgraph(
  entry: string,
  nodes: ScenarioGraphNode[],
  edges: ScenarioGraphEdge[],
): ScenarioSubgraph {
  return { entry, nodes, edges };
}

const onConnectContext: ResolveInputContext = {
  handlerBranch: 'onConnect',
  deviceHandle: DEVICE_HANDLE,
};

const onDisconnectContext: ResolveInputContext = {
  handlerBranch: 'onDisconnect',
  deviceHandle: null,
};

describe('reference-validity (DBR4)', () => {
  const deviceVar = createScenarioVariable('var-dev', 'device1', 'DeviceRef');

  it('isReferenceValid is true only for valid references', () => {
    expect(isReferenceValid(null)).toBe(false);
    expect(isReferenceValid(createReferenceValue('DeviceRef', 'x'))).toBe(true);
    expect(isReferenceValid(invalidateReference(createReferenceValue('DeviceRef', 'x')))).toBe(false);
  });

  it('onConnect set assigns valid DeviceRef', () => {
    const incoming = createReferenceValue('DeviceRef', DEVICE_HANDLE);
    const next = applyVariableSetValue(deviceVar, incoming);
    expect(next.value).toEqual(incoming);
    expect(isReferenceValid(next.value)).toBe(true);
  });

  it('onDisconnect null invalidates existing reference', () => {
    const withValue = applyVariableSetValue(
      deviceVar,
      createReferenceValue('DeviceRef', DEVICE_HANDLE),
    );
    const next = applyVariableSetValue(withValue, null);
    expect(next.value?.valid).toBe(false);
    expect(next.value?.handle).toBe(DEVICE_HANDLE);
  });

  it('onDisconnect null on empty variable is idempotent', () => {
    const once = applyVariableSetValue(deviceVar, null);
    const twice = applyVariableSetValue(once, null);
    expect(twice).toBe(once);
    expect(twice.value).toBeNull();
  });

  it('set is idempotent when value unchanged', () => {
    const ref = createReferenceValue('DeviceRef', DEVICE_HANDLE);
    const once = applyVariableSetValue(deviceVar, ref);
    const twice = applyVariableSetValue(once, ref);
    expect(twice).toBe(once);
  });

  it('type mismatch throws', () => {
    const micIncoming = createReferenceValue('MicrophoneRef', 'mic-1');
    expect(() => applyVariableSetValue(deviceVar, micIncoming)).toThrow(/DeviceRef/);
  });

  it('resolveEventReference: onConnect/onStart valid, onDisconnect null', () => {
    expect(resolveEventReference('onConnect', DEVICE_HANDLE)).toEqual(
      createReferenceValue('DeviceRef', DEVICE_HANDLE),
    );
    expect(resolveEventReference('initial', DEVICE_HANDLE)?.valid).toBe(true);
    expect(resolveEventReference('onDisconnect', DEVICE_HANDLE)).toBeNull();
    expect(resolveEventReference('onConnect', null)).toEqual({
      kind: 'DeviceRef',
      handle: null,
      valid: false,
    });
  });
});

describe('resolveInput (DBR4)', () => {
  const deviceVar = createScenarioVariable('var-dev', 'device1', 'DeviceRef');

  it('resolves Event → variable-set input as valid DeviceRef on onConnect', () => {
    const sg = subgraph(
      'evt',
      [eventNode('evt'), variableSetNode('set', deviceVar.id)],
      [
        execEdge('evt', 'set'),
        dataEdge('evt', EVENT_DEVICE_HANDLE, 'set', VARIABLE_VALUE_HANDLE),
      ],
    );

    const value = resolveInput(sg, [deviceVar], 'set', VARIABLE_VALUE_HANDLE, onConnectContext);
    expect(value).toEqual(createReferenceValue('DeviceRef', DEVICE_HANDLE));
  });

  it('resolves Event as null on onDisconnect', () => {
    const sg = subgraph(
      'evt',
      [eventNode('evt'), variableSetNode('set', deviceVar.id)],
      [dataEdge('evt', EVENT_DEVICE_HANDLE, 'set', VARIABLE_VALUE_HANDLE)],
    );

    const value = resolveInput(sg, [deviceVar], 'set', VARIABLE_VALUE_HANDLE, onDisconnectContext);
    expect(value).toBeNull();
  });

  it('resolves variable-get output', () => {
    const ref = createReferenceValue('DeviceRef', DEVICE_HANDLE);
    const varWithValue = { ...deviceVar, value: ref };
    const sg = subgraph(
      'get',
      [variableGetNode('get', deviceVar.id), variableSetNode('set', deviceVar.id)],
      [dataEdge('get', VARIABLE_VALUE_HANDLE, 'set', VARIABLE_VALUE_HANDLE)],
    );

    const value = resolveInput(sg, [varWithValue], 'set', VARIABLE_VALUE_HANDLE, onConnectContext);
    expect(value).toEqual(ref);
  });

  it('returns null when port has no data edge', () => {
    const sg = subgraph('set', [variableSetNode('set', deviceVar.id)], []);
    expect(resolveInput(sg, [deviceVar], 'set', VARIABLE_VALUE_HANDLE, onConnectContext)).toBeNull();
  });

  it('throws on type mismatch along edge', () => {
    const sg = subgraph(
      'evt',
      [eventNode('evt'), variableSetNode('set', 'mic-var')],
      [
        dataEdge('evt', EVENT_DEVICE_HANDLE, 'set', VARIABLE_VALUE_HANDLE, 'MicrophoneRef'),
      ],
    );
    const micVar = createScenarioVariable('mic-var', 'mic1', 'MicrophoneRef');

    expect(() =>
      resolveInput(sg, [micVar], 'set', VARIABLE_VALUE_HANDLE, onConnectContext),
    ).toThrow(ResolveInputError);
  });

  it('throws when variable-get references missing variable', () => {
    const sg = subgraph(
      'get',
      [variableGetNode('get', 'missing'), variableSetNode('set', deviceVar.id)],
      [dataEdge('get', VARIABLE_VALUE_HANDLE, 'set', VARIABLE_VALUE_HANDLE)],
    );
    expect(() =>
      resolveInput(sg, [deviceVar], 'set', VARIABLE_VALUE_HANDLE, onConnectContext),
    ).toThrow(ResolveInputError);
  });
});

describe('variable-set runtime integration (DBR4)', () => {
  it('runSubgraphOnce writes Event data into variable store on onConnect', async () => {
    const deviceVar = createScenarioVariable('var-dev', 'device1', 'DeviceRef');
    const store = new ScenarioVariableStore([deviceVar]);
    const host = createStubScenarioRuntimeHost({
      getDeviceHandle: () => DEVICE_HANDLE,
      variableStore: store,
    });

    const sg = subgraph(
      'evt',
      [eventNode('evt'), variableSetNode('set', deviceVar.id)],
      [
        execEdge('evt', 'set'),
        dataEdge('evt', EVENT_DEVICE_HANDLE, 'set', VARIABLE_VALUE_HANDLE),
      ],
    );

    await runSubgraphOnce(sg, host, new AbortController().signal, {
      branch: 'initial',
      variableStore: store,
      resolveContext: { handlerBranch: 'onConnect', deviceHandle: DEVICE_HANDLE },
    });

    expect(store.getValue(deviceVar.id)).toEqual(createReferenceValue('DeviceRef', DEVICE_HANDLE));
  });

  it('onDisconnect exec invalidates device variable', async () => {
    const deviceVar = createScenarioVariable('var-dev', 'device1', 'DeviceRef');
    const store = new ScenarioVariableStore([
      {
        ...deviceVar,
        value: createReferenceValue('DeviceRef', DEVICE_HANDLE),
      },
    ]);
    const host = createStubScenarioRuntimeHost({ variableStore: store });

    const sg = subgraph(
      'evt',
      [eventNode('evt'), variableSetNode('set', deviceVar.id)],
      [
        execEdge('evt', 'set'),
        dataEdge('evt', EVENT_DEVICE_HANDLE, 'set', VARIABLE_VALUE_HANDLE),
      ],
    );

    await runSubgraphOnce(sg, host, new AbortController().signal, {
      branch: 'onDisconnect',
      variableStore: store,
      resolveContext: onDisconnectContext,
    });

    const value = store.getValue(deviceVar.id);
    expect(value?.valid).toBe(false);
    expect(value?.handle).toBe(DEVICE_HANDLE);
  });
});
