import { describe, expect, it } from 'vitest';
import type { ScenarioFunctionSubgraph, ScenarioSubgraph } from '@membrana/core';

import { DEVICE_GLOBAL_DEVICE_HANDLE } from '../graph/device-global-node.js';
import { GET_RECORDER_OUT_HANDLE } from '../graph/get-recorder-node.js';
import { PALETTE_VALUE_HANDLE } from '../graph/palette-node.js';
import { EVENT_SERVER_HANDLE } from '../graph/event-node.js';
import { MAKE_RECORDING_POLICY_OUT_HANDLE } from '../graph/make-recording-policy-node.js';
import { augmentResolveContextForFunctionCall } from './function-call-resolve.js';
import { resolveInput, resolveNodeOutput } from './resolve-input.js';

describe('function-call-resolve', () => {
  it('bridges parent Event.server into function-input value pin', () => {
    const parentSubgraph: ScenarioSubgraph = {
      entry: 'on-connect-event',
      nodes: [
        {
          id: 'on-connect-event',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'event',
          system: true,
        },
        {
          id: 'fn-bootstrap-block',
          blockKind: 'subgraph',
          position: { x: 200, y: 0 },
          label: 'Bootstrap::fn-bootstrap::fn-bootstrap',
        },
      ],
      edges: [
        {
          kind: 'data',
          source: 'on-connect-event',
          sourceHandle: EVENT_SERVER_HANDLE,
          target: 'fn-bootstrap-block',
          targetHandle: PALETTE_VALUE_HANDLE,
          dataType: 'ServerRef',
        },
      ],
    };

    const functionBody: ScenarioSubgraph = {
      entry: 'fn-bootstrap-input',
      nodes: [
        {
          id: 'fn-bootstrap-input',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'function-input',
          system: true,
        },
        {
          id: 'node-is-valid',
          blockKind: 'custom',
          position: { x: 200, y: 0 },
          nodeKind: 'is-valid',
        },
      ],
      edges: [
        {
          kind: 'data',
          source: 'fn-bootstrap-input',
          sourceHandle: PALETTE_VALUE_HANDLE,
          target: 'node-is-valid',
          targetHandle: PALETTE_VALUE_HANDLE,
          dataType: 'ServerRef',
        },
      ],
    };

    const callContext = augmentResolveContextForFunctionCall({
      parentSubgraph,
      blockNodeId: 'fn-bootstrap-block',
      variables: [],
      baseContext: {
        handlerBranch: 'onConnect',
        deviceHandle: 'device-1',
        serverHandle: 'server-abc',
        triggeredAt: '2026-06-21T00:00:00.000Z',
      },
    });

    const value = resolveInput(functionBody, [], 'node-is-valid', PALETTE_VALUE_HANDLE, callContext);
    expect(value).toMatchObject({ kind: 'ServerRef', handle: 'server-abc' });
  });

  it('resolves pure policy-build block output for downstream function call', () => {
    const policyFunction: ScenarioFunctionSubgraph = {
      id: 'fn-beta-policy-build',
      name: 'Build policies',
      entry: 'fn-beta-policy-build-input',
      nodes: [
        {
          id: 'fn-beta-policy-build-input',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'function-input',
          system: true,
        },
        {
          id: 'fn-beta-policy-build-output',
          blockKind: 'custom',
          position: { x: 520, y: 0 },
          nodeKind: 'function-output',
          system: true,
        },
        {
          id: 'node-make-recording-policy',
          blockKind: 'custom',
          position: { x: 200, y: 0 },
          nodeKind: 'make-recording-policy',
          pure: true,
          recordingPolicy: { windowSec: 5, captureFormat: 'wav' },
        },
      ],
      edges: [
        {
          kind: 'data',
          source: 'node-make-recording-policy',
          sourceHandle: MAKE_RECORDING_POLICY_OUT_HANDLE,
          target: 'fn-beta-policy-build-output',
          targetHandle: 'policy',
          dataType: 'RecordingPolicy',
        },
      ],
    };

    const parentSubgraph: ScenarioSubgraph = {
      entry: 'gate-block',
      nodes: [
        {
          id: 'policy-block',
          blockKind: 'subgraph',
          position: { x: 0, y: 0 },
          label: 'Build policies::fn-beta-policy-build::fn-beta-policy-build',
        },
        {
          id: 'gate-block',
          blockKind: 'subgraph',
          position: { x: 240, y: 0 },
          label: 'Recording gate::fn-beta-recording-gate::fn-beta-recording-gate',
        },
      ],
      edges: [
        {
          kind: 'data',
          source: 'policy-block',
          sourceHandle: 'policy',
          target: 'gate-block',
          targetHandle: 'policy',
          dataType: 'RecordingPolicy',
        },
      ],
    };

    const policyValue = resolveNodeOutput(
      parentSubgraph,
      [],
      parentSubgraph.nodes[0]!,
      'policy',
      { scenarioFunctions: [policyFunction] },
    );
    expect(policyValue).toMatchObject({ kind: 'RecordingPolicy', windowSec: 5 });

    const gateCallContext = augmentResolveContextForFunctionCall({
      parentSubgraph,
      blockNodeId: 'gate-block',
      variables: [],
      baseContext: { scenarioFunctions: [policyFunction] },
    });
    expect(gateCallContext.resolveFunctionInputPin?.('policy')).toMatchObject({
      kind: 'RecordingPolicy',
      windowSec: 5,
    });
  });

  it('resolves collapsed gate recorder output via parent device pin (L21)', () => {
    const gateFunction: ScenarioFunctionSubgraph = {
      id: 'fn-alpha-recording-gate',
      name: 'Recording gate',
      entry: 'fn-alpha-recording-gate-input',
      nodes: [
        {
          id: 'fn-alpha-recording-gate-input',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'function-input',
          system: true,
        },
        {
          id: 'fn-alpha-recording-gate-output',
          blockKind: 'custom',
          position: { x: 520, y: 0 },
          nodeKind: 'function-output',
          system: true,
        },
        {
          id: 'node-get-recorder',
          blockKind: 'custom',
          position: { x: 200, y: 0 },
          nodeKind: 'get-recorder',
        },
      ],
      edges: [
        {
          kind: 'data',
          source: 'fn-alpha-recording-gate-input',
          sourceHandle: 'device',
          target: 'node-get-recorder',
          targetHandle: 'device',
          dataType: 'DeviceRef',
        },
        {
          kind: 'data',
          source: 'node-get-recorder',
          sourceHandle: GET_RECORDER_OUT_HANDLE,
          target: 'fn-alpha-recording-gate-output',
          targetHandle: 'recorder',
          dataType: 'RecorderRef',
        },
      ],
    };

    const parentSubgraph: ScenarioSubgraph = {
      entry: 'main-on-tick',
      nodes: [
        {
          id: 'node-device-global',
          blockKind: 'custom',
          position: { x: 0, y: 0 },
          nodeKind: 'device-global',
        },
        {
          id: 'gate-block',
          blockKind: 'subgraph',
          position: { x: 240, y: 0 },
          label: 'Recording gate::fn-alpha-recording-gate',
        },
      ],
      edges: [
        {
          kind: 'data',
          source: 'node-device-global',
          sourceHandle: DEVICE_GLOBAL_DEVICE_HANDLE,
          target: 'gate-block',
          targetHandle: 'device',
          dataType: 'DeviceRef',
        },
      ],
    };

    const recorder = resolveNodeOutput(
      parentSubgraph,
      [],
      parentSubgraph.nodes[1]!,
      'recorder',
      {
        scenarioFunctions: [gateFunction],
        deviceHandle: 'device-1',
        getRecorderSessionRef: (deviceHandle) => ({
          kind: 'RecorderRef',
          handle: `recorder:${deviceHandle}`,
          valid: true,
        }),
      },
    );

    expect(recorder).toMatchObject({
      kind: 'RecorderRef',
      handle: 'recorder:device-1',
      valid: true,
    });
  });
});
