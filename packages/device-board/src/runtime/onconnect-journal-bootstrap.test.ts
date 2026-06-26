import { describe, expect, it } from 'vitest';
import {
  createReferenceValue,
  createScenarioVariable,
  formatJournalRefHandle,
  type ScenarioFunctionSubgraph,
  type ScenarioSubgraph,
} from '@membrana/core';

import {
  GET_JOURNAL_DEVICE_HANDLE,
  GET_JOURNAL_OUT_HANDLE,
} from '../graph/get-journal-node.js';
import { VARIABLE_VALUE_HANDLE } from '../graph/variable-node.js';
import { runSubgraphOnce } from './exec-subgraph.js';
import { findExecSuccessor } from './exec-successor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { isReferenceValid } from './reference-validity.js';
import { ScenarioVariableStore } from './variable-store.js';

const DEVICE_HANDLE = 'local-studio-test-device';

function buildAlphaOnConnectBootstrapSubgraph(journalVarId: string): {
  onConnect: ScenarioSubgraph;
  bootstrapFn: ScenarioFunctionSubgraph;
} {
  const bootstrapFn: ScenarioFunctionSubgraph = {
    id: 'fn-alpha-bootstrap',
    name: 'Bootstrap journal',
    entry: 'fn-alpha-bootstrap-input',
    description: 'onConnect: server → journal1 ref',
    inputPins: [
      { id: 'exec-in', name: 'exec-in', kind: 'exec' },
      { id: 'value', name: 'value', kind: 'data', socketType: 'ServerRef' },
      { id: 'server', name: 'server', kind: 'data', socketType: 'ServerRef' },
    ],
    outputPins: [{ id: 'exec-false-out', name: 'exec-false-out', kind: 'exec' }],
    nodes: [
      {
        id: 'fn-alpha-bootstrap-input',
        blockKind: 'custom',
        position: { x: 0, y: 0 },
        label: 'Input',
        nodeKind: 'function-input',
        system: true,
      },
      {
        id: 'node-is-valid-mqm97w5v-17',
        blockKind: 'custom',
        position: { x: 0, y: 0 },
        label: 'isValid',
        nodeKind: 'is-valid',
      },
      {
        id: 'fn-alpha-bootstrap-output',
        blockKind: 'custom',
        position: { x: 0, y: 0 },
        label: 'Output',
        nodeKind: 'function-output',
        system: true,
      },
    ],
    edges: [
      {
        source: 'fn-alpha-bootstrap-input',
        sourceHandle: 'exec-in',
        target: 'node-is-valid-mqm97w5v-17',
        targetHandle: 'exec-in',
        kind: 'exec',
      },
      {
        source: 'fn-alpha-bootstrap-input',
        sourceHandle: 'value',
        target: 'node-is-valid-mqm97w5v-17',
        targetHandle: 'value',
        kind: 'data',
        dataType: 'ServerRef',
      },
      {
        source: 'node-is-valid-mqm97w5v-17',
        sourceHandle: 'exec-false-out',
        target: 'fn-alpha-bootstrap-output',
        targetHandle: 'exec-false-out',
        kind: 'exec',
      },
    ],
  };

  const onConnect: ScenarioSubgraph = {
    entry: 'on-connect-event',
    nodes: [
      {
        id: 'on-connect-event',
        blockKind: 'custom',
        position: { x: 0, y: 0 },
        label: 'On connect',
        nodeKind: 'event',
        system: true,
      },
      {
        id: 'fn-alpha-bootstrap-block',
        blockKind: 'subgraph',
        position: { x: 0, y: 0 },
        label: 'Bootstrap journal::fn-alpha-bootstrap',
      },
      {
        id: 'node-get-journal-mqrk8yrn-121',
        blockKind: 'custom',
        position: { x: 0, y: 0 },
        label: 'GetJournal',
        nodeKind: 'get-journal',
      },
      {
        id: 'board-mqrk8res-sfp1k7n9',
        blockKind: 'custom',
        position: { x: 0, y: 0 },
        label: 'journal1',
        nodeKind: 'variable-set',
        variableId: journalVarId,
      },
    ],
    edges: [
      {
        source: 'on-connect-event',
        sourceHandle: 'exec-out',
        target: 'fn-alpha-bootstrap-block',
        targetHandle: 'exec-in',
        kind: 'exec',
      },
      {
        source: 'on-connect-event',
        sourceHandle: 'server',
        target: 'fn-alpha-bootstrap-block',
        targetHandle: 'value',
        kind: 'data',
        dataType: 'ServerRef',
      },
      {
        source: 'on-connect-event',
        sourceHandle: 'device',
        target: 'node-get-journal-mqrk8yrn-121',
        targetHandle: GET_JOURNAL_DEVICE_HANDLE,
        kind: 'data',
        dataType: 'DeviceRef',
      },
      {
        source: 'fn-alpha-bootstrap-block',
        sourceHandle: 'exec-false-out',
        target: 'board-mqrk8res-sfp1k7n9',
        targetHandle: 'exec-in',
        kind: 'exec',
      },
      {
        source: 'node-get-journal-mqrk8yrn-121',
        sourceHandle: GET_JOURNAL_OUT_HANDLE,
        target: 'board-mqrk8res-sfp1k7n9',
        targetHandle: VARIABLE_VALUE_HANDLE,
        kind: 'data',
        dataType: 'JournalRef',
      },
    ],
  };

  return { onConnect, bootstrapFn };
}

describe('onConnect alpha bootstrap journal seed (ST9)', () => {
  it('sets JournalRef on autonomous exec-false-out path', async () => {
    const journalVar = createScenarioVariable('var-journal', 'journal1', 'JournalRef');
    const store = new ScenarioVariableStore([journalVar]);
    const logs: string[] = [];
    const host = createStubScenarioRuntimeHost({
      getDeviceHandle: () => DEVICE_HANDLE,
      isDeviceLinked: () => false,
      getDeviceJournalRef: (deviceHandle) =>
        createReferenceValue('JournalRef', formatJournalRefHandle('device', deviceHandle)),
      variableStore: store,
      log: (message, context) => {
        logs.push(message);
        if (message === 'variable-set') {
          logs.push(`variable-set:${String(context?.variableId)}`);
        }
      },
    });

    const { onConnect, bootstrapFn } = buildAlphaOnConnectBootstrapSubgraph(journalVar.id);

    expect(
      findExecSuccessor(onConnect, 'fn-alpha-bootstrap-block', 'exec-false-out'),
    ).toBe('board-mqrk8res-sfp1k7n9');

    const baseContext = {
      handlerBranch: 'onConnect' as const,
      deviceHandle: DEVICE_HANDLE,
      serverHandle: null,
      getDeviceJournalRef: (deviceHandle: string) =>
        createReferenceValue('JournalRef', formatJournalRefHandle('device', deviceHandle)),
    };

    const result = await runSubgraphOnce(onConnect, host, new AbortController().signal, {
      branch: 'initial',
      functions: [bootstrapFn],
      variableStore: store,
      resolveContext: baseContext,
    });

    const value = store.getValue(journalVar.id);
    expect(isReferenceValid(value)).toBe(true);
    expect(value?.handle).toBe(formatJournalRefHandle('device', DEVICE_HANDLE));
    expect(logs).toContain('variable-set:var-journal');
  });
});
