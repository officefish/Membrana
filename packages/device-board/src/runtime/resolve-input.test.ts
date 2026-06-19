import { describe, expect, it } from 'vitest';
import {
  createReferenceValue,
  createDateTimeValue,
  createScenarioVariable,
  createStringValue,
  invalidateReference,
  type ScenarioGraphEdge,
  type ScenarioGraphNode,
  type ScenarioSubgraph,
} from '@membrana/core';

import { EVENT_DEVICE_HANDLE, EVENT_DATETIME_HANDLE } from '../graph/event-node.js';
import {
  GET_AUDIO_STREAM_MIC_HANDLE,
  GET_AUDIO_STREAM_OUT_HANDLE,
  GET_FFT_FRAME_OUT_HANDLE,
  GET_MICROPHONE_DEVICE_HANDLE,
  GET_MICROPHONE_OUT_HANDLE,
  GET_SAMPLE_OUT_HANDLE,
  PRINT_OUT_HANDLE,
} from '../graph/palette-node.js';
import { VARIABLE_VALUE_HANDLE } from '../graph/variable-node.js';
import {
  applyVariableSetValue,
  isReferenceValid,
  resolveEventDateTime,
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
  dataType: 'DeviceRef' | 'MicrophoneRef' | 'DateTime' = 'DeviceRef',
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

  it('resolveEventDateTime returns DateTime value with ISO', () => {
    const iso = '2026-06-18T12:00:00.000Z';
    expect(resolveEventDateTime(iso)).toEqual(createDateTimeValue(iso));
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

  it('forwards variable-set value output from its data input', () => {
    const sg = subgraph(
      'evt',
      [eventNode('evt'), variableSetNode('set', deviceVar.id), variableSetNode('downstream', deviceVar.id)],
      [
        dataEdge('evt', EVENT_DEVICE_HANDLE, 'set', VARIABLE_VALUE_HANDLE),
        dataEdge('set', VARIABLE_VALUE_HANDLE, 'downstream', VARIABLE_VALUE_HANDLE),
      ],
    );

    const value = resolveInput(sg, [deviceVar], 'downstream', VARIABLE_VALUE_HANDLE, onConnectContext);
    expect(value).toEqual(createReferenceValue('DeviceRef', DEVICE_HANDLE));
  });

  it('forwards null through variable-set chain on onDisconnect', () => {
    const sg = subgraph(
      'evt',
      [eventNode('evt'), variableSetNode('set', deviceVar.id), variableSetNode('downstream', deviceVar.id)],
      [
        dataEdge('evt', EVENT_DEVICE_HANDLE, 'set', VARIABLE_VALUE_HANDLE),
        dataEdge('set', VARIABLE_VALUE_HANDLE, 'downstream', VARIABLE_VALUE_HANDLE),
      ],
    );

    const value = resolveInput(
      sg,
      [deviceVar],
      'downstream',
      VARIABLE_VALUE_HANDLE,
      onDisconnectContext,
    );
    expect(value).toBeNull();
  });

  it('resolves Event datetime output as DateTime value', () => {
    const triggeredAt = '2026-06-18T12:00:00.000Z';
    const dtVar = createScenarioVariable('var-dt', 'firedAt', 'DateTime');
    const sg = subgraph(
      'evt',
      [eventNode('evt'), variableSetNode('set', dtVar.id)],
      [dataEdge('evt', EVENT_DATETIME_HANDLE, 'set', VARIABLE_VALUE_HANDLE, 'DateTime')],
    );

    const value = resolveInput(sg, [dtVar], 'set', VARIABLE_VALUE_HANDLE, {
      ...onConnectContext,
      triggeredAt,
    });
    expect(value).toEqual(createDateTimeValue(triggeredAt));
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

  it('resolves get-microphone output as MicrophoneRef when device valid and mic selected', () => {
    const micVar = createScenarioVariable('var-mic', 'mic1', 'MicrophoneRef');
    const sg = subgraph(
      'evt',
      [
        eventNode('evt'),
        {
          id: 'gm',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'get-microphone',
          microphoneId: 'mic-selected',
        },
        variableSetNode('set', micVar.id),
      ],
      [
        dataEdge('evt', EVENT_DEVICE_HANDLE, 'gm', GET_MICROPHONE_DEVICE_HANDLE),
        dataEdge('gm', GET_MICROPHONE_OUT_HANDLE, 'set', VARIABLE_VALUE_HANDLE, 'MicrophoneRef'),
      ],
    );

    const value = resolveInput(sg, [micVar], 'set', VARIABLE_VALUE_HANDLE, onConnectContext);
    expect(value).toEqual(createReferenceValue('MicrophoneRef', 'mic-selected'));
  });

  it('resolves get-audio-stream output when microphone matches active stream', () => {
    const streamVar = createScenarioVariable('var-stream', 'stream1', 'AudioStreamRef');
    const micVar = createScenarioVariable('var-mic', 'mic1', 'MicrophoneRef');
    const activeStream = createReferenceValue('AudioStreamRef', 'stream:mic-1');
    const sg = subgraph(
      'evt',
      [
        eventNode('evt'),
        variableGetNode('get-mic', micVar.id),
        {
          id: 'gas',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'get-audio-stream',
        },
        variableSetNode('set', streamVar.id),
      ],
      [
        dataEdge('get-mic', VARIABLE_VALUE_HANDLE, 'gas', GET_AUDIO_STREAM_MIC_HANDLE, 'MicrophoneRef'),
        dataEdge('gas', GET_AUDIO_STREAM_OUT_HANDLE, 'set', VARIABLE_VALUE_HANDLE, 'AudioStreamRef'),
      ],
    );

    const value = resolveInput(sg, [streamVar, micVar], 'set', VARIABLE_VALUE_HANDLE, {
      getActiveAudioStreamRef: () => activeStream,
    });
    expect(value).toEqual(activeStream);
  });

  it('returns invalid AudioStreamRef when microphone does not match active stream', () => {
    const streamVar = createScenarioVariable('var-stream', 'stream1', 'AudioStreamRef');
    const micVar = {
      ...createScenarioVariable('var-mic', 'mic1', 'MicrophoneRef'),
      value: createReferenceValue('MicrophoneRef', 'mic-1'),
    };
    const activeStream = createReferenceValue('AudioStreamRef', 'stream:other-mic');
    const sg = subgraph(
      'evt',
      [
        eventNode('evt'),
        variableGetNode('get-mic', micVar.id),
        {
          id: 'gas',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'get-audio-stream',
        },
        variableSetNode('set', streamVar.id),
      ],
      [
        dataEdge('get-mic', VARIABLE_VALUE_HANDLE, 'gas', GET_AUDIO_STREAM_MIC_HANDLE, 'MicrophoneRef'),
        dataEdge('gas', GET_AUDIO_STREAM_OUT_HANDLE, 'set', VARIABLE_VALUE_HANDLE, 'AudioStreamRef'),
      ],
    );

    const value = resolveInput(sg, [streamVar, micVar], 'set', VARIABLE_VALUE_HANDLE, {
      getActiveAudioStreamRef: () => activeStream,
    });
    expect(value).toEqual({ kind: 'AudioStreamRef', handle: null, valid: false });
  });

  it('resolves print text output from runtime context', () => {
    const textVar = createScenarioVariable('var-text', 'log1', 'String');
    const sg = subgraph(
      'evt',
      [
        eventNode('evt'),
        {
          id: 'pr',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'print',
        },
        variableSetNode('set', textVar.id),
      ],
      [dataEdge('pr', PRINT_OUT_HANDLE, 'set', VARIABLE_VALUE_HANDLE, 'String')],
    );

    const value = resolveInput(sg, [textVar], 'set', VARIABLE_VALUE_HANDLE, {
      getPrintOutputValue: (nodeId) =>
        nodeId === 'pr' ? createStringValue('device(dev-1): ok') : null,
    });
    expect(value).toEqual(createStringValue('device(dev-1): ok'));
  });

  it('resolves get-sample output from host context', () => {
    const sampleVar = createScenarioVariable('var-sample', 'sample1', 'AudioSampleRef');
    const sampleRef = createReferenceValue('AudioSampleRef', 'sample-1');
    const sg = subgraph(
      'evt',
      [
        eventNode('evt'),
        {
          id: 'gs',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'get-sample',
        },
        variableSetNode('set', sampleVar.id),
      ],
      [
        dataEdge('gs', GET_SAMPLE_OUT_HANDLE, 'set', VARIABLE_VALUE_HANDLE, 'AudioSampleRef'),
      ],
    );

    const value = resolveInput(sg, [sampleVar], 'set', VARIABLE_VALUE_HANDLE, {
      getCapturedAudioSampleRef: (nodeId) => (nodeId === 'gs' ? sampleRef : null),
    });
    expect(value).toEqual(sampleRef);
  });

  it('resolves get-fft-frame output from host context', () => {
    const frameVar = createScenarioVariable('var-frame', 'frame1', 'FftFrameRef');
    const frameRef = createReferenceValue('FftFrameRef', 'fft-1');
    const sg = subgraph(
      'evt',
      [
        eventNode('evt'),
        {
          id: 'fft',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'get-fft-frame',
        },
        variableSetNode('set', frameVar.id),
      ],
      [
        dataEdge('fft', GET_FFT_FRAME_OUT_HANDLE, 'set', VARIABLE_VALUE_HANDLE, 'FftFrameRef'),
      ],
    );

    const value = resolveInput(sg, [frameVar], 'set', VARIABLE_VALUE_HANDLE, {
      getCapturedFftFrameRef: (nodeId) => (nodeId === 'fft' ? frameRef : null),
    });
    expect(value).toEqual(frameRef);
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
