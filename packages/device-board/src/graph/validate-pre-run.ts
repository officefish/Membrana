import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
  type ScenarioVariable,
  type ValidationError,
  MAX_SCENARIO_FUNCTION_PINS_PER_SIDE,
  isScenarioFunctionPinCountValid,
} from '@membrana/core';
import type { Edge, Node } from '@xyflow/react';

import {
  SCENARIO_ALARM_ENTRY,
  SCENARIO_INITIAL_ENTRY,
  SCENARIO_MAIN_ENTRY,
  SCENARIO_ON_CONNECT_ENTRY,
  SCENARIO_ON_DISCONNECT_ENTRY,
  SCENARIO_ON_STOP_ENTRY,
} from './initial-board-state.js';
import { isEventNode } from './event-node.js';
import type { BoardLayerTab } from '../types/board-ui.js';
import type { SerializeScenarioFunctionInput } from './serialize-scenario-function.js';
import { isValidBoardEdge } from './connection-validation.js';
import { EXEC_FAN_OUT_MESSAGE, findExecFanOutEdges } from './validate-exec-fanout.js';
import { findSequenceAsyncPreRunIssues } from './validate-sequence-async.js';
import { buildDeviceScenarioDocument } from './build-device-scenario.js';
import { validateFunctionDepth } from './validate-function-depth.js';
import { findPureExecEdgeHints } from './validate-pure-exec.js';
import { findStartRecordingUnconditionalLoopIssues } from './validate-start-recording-loop.js';
import { validateUserCaseDocument } from '../runtime/validators/validate-user-case-document.js';
import { mergePreRunWithUserCaseDocumentIssues } from '../runtime/validators/validation-bridge.js';

export interface PreRunValidationIssue {
  readonly code: string;
  readonly message: string;
  readonly path?: string;
  /** `warning` не блокирует Run (подсказки UX). */
  readonly severity?: 'error' | 'warning';
}

export interface PreRunValidationInput {
  readonly deviceKind: DeviceScenarioDocument['deviceKind'];
  readonly signalNodes: readonly Node[];
  readonly signalEdges: readonly Edge[];
  readonly scenarioInitialNodes: readonly Node[];
  readonly scenarioInitialEdges: readonly Edge[];
  /** v0.4: обработчик onConnect (необязателен для legacy-вызовов). */
  readonly scenarioOnConnectNodes?: readonly Node[];
  readonly scenarioOnConnectEdges?: readonly Edge[];
  readonly scenarioMainNodes: readonly Node[];
  readonly scenarioMainEdges: readonly Edge[];
  readonly scenarioAlarmNodes: readonly Node[];
  readonly scenarioAlarmEdges: readonly Edge[];
  readonly scenarioOnStopNodes: readonly Node[];
  readonly scenarioOnStopEdges: readonly Edge[];
  readonly scenarioOnDisconnectNodes: readonly Node[];
  readonly scenarioOnDisconnectEdges: readonly Edge[];
  readonly scenarioFunctions: readonly SerializeScenarioFunctionInput[];
  /** Document-scope variables (required for variable-get/set validation). */
  readonly variables?: readonly ScenarioVariable[];
}

function pushExecFanOutIssues(
  issues: PreRunValidationIssue[],
  nodes: readonly Node[],
  edges: readonly Edge[],
  pathPrefix: string,
): void {
  for (const edge of findExecFanOutEdges(edges, nodes)) {
    issues.push({
      code: 'exec-fan-out-forbidden',
      message: EXEC_FAN_OUT_MESSAGE,
      path: `${pathPrefix}/${edge.id}`,
      severity: 'warning',
    });
  }
}

function pushEdgeIssues(
  issues: PreRunValidationIssue[],
  nodes: readonly Node[],
  edges: readonly Edge[],
  layer: BoardLayerTab,
  pathPrefix: string,
): void {
  const nodeIds = new Set(nodes.map((node) => node.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      issues.push({
        code: 'edge-missing-source',
        message: `Ребро ссылается на отсутствующий source «${edge.source}»`,
        path: `${pathPrefix}/${edge.id}`,
      });
    }
    if (!nodeIds.has(edge.target)) {
      issues.push({
        code: 'edge-missing-target',
        message: `Ребро ссылается на отсутствующий target «${edge.target}»`,
        path: `${pathPrefix}/${edge.id}`,
      });
    }
    if (!isValidBoardEdge(edge, nodes, layer)) {
      issues.push({
        code: 'edge-invalid-socket',
        message: `Несовместимое соединение ${edge.sourceHandle ?? '?'} → ${edge.targetHandle ?? '?'}`,
        path: `${pathPrefix}/${edge.id}`,
      });
    }
  }
  if (layer === 'scenario') {
    pushExecFanOutIssues(issues, nodes, edges, pathPrefix);
    issues.push(...findSequenceAsyncPreRunIssues(nodes, edges, pathPrefix));
  }
}

function pushEntryIssue(
  issues: PreRunValidationIssue[],
  nodes: readonly Node[],
  entryId: string,
  path: string,
): void {
  if (nodes.length === 0) {
    return;
  }
  if (!nodes.some((node) => node.id === entryId)) {
    issues.push({
      code: 'scenario-entry-missing',
      message: `Точка входа «${entryId}» не найдена среди нод`,
      path,
    });
  }
}

/** v0.4 (DBR3): entry обработчика события обязан быть системным Event-узлом. */
function pushEventEntryIssue(
  issues: PreRunValidationIssue[],
  nodes: readonly Node[],
  entryId: string,
  path: string,
): void {
  if (nodes.length === 0) {
    return;
  }
  const entryNode = nodes.find((node) => node.id === entryId);
  if (entryNode === undefined) {
    return;
  }
  if (!isEventNode(entryNode)) {
    issues.push({
      code: 'event-entry-required',
      message: `Точка входа обработчика «${entryId}» должна быть системным Event-узлом`,
      path,
    });
  }
}

function pushSchemaIssue(issues: PreRunValidationIssue[], error: ValidationError): void {
  issues.push({
    code: 'schema-invalid',
    message: error.message,
    path: error.field,
  });
}

/** Pre-run validation перед исполнением сценария. */
export function validatePreRun(input: PreRunValidationInput): readonly PreRunValidationIssue[] {
  const issues: PreRunValidationIssue[] = [];

  if (input.signalNodes.length === 0) {
    issues.push({
      code: 'signal-empty',
      message: 'Signal graph пуст — добавьте хотя бы одну ноду',
      path: 'signalGraph.nodes',
    });
  }

  pushEdgeIssues(issues, input.signalNodes, input.signalEdges, 'signal', 'signalGraph.edges');

  const onConnectNodes = input.scenarioOnConnectNodes ?? [];
  const onConnectEdges = input.scenarioOnConnectEdges ?? [];

  pushEntryIssue(issues, input.scenarioInitialNodes, SCENARIO_INITIAL_ENTRY, 'scenario.initial.entry');
  pushEventEntryIssue(issues, input.scenarioInitialNodes, SCENARIO_INITIAL_ENTRY, 'scenario.initial.entry');
  pushEdgeIssues(
    issues,
    input.scenarioInitialNodes,
    input.scenarioInitialEdges,
    'scenario',
    'scenario.initial.edges',
  );

  pushEntryIssue(issues, onConnectNodes, SCENARIO_ON_CONNECT_ENTRY, 'scenario.onConnect.entry');
  pushEventEntryIssue(issues, onConnectNodes, SCENARIO_ON_CONNECT_ENTRY, 'scenario.onConnect.entry');
  pushEdgeIssues(issues, onConnectNodes, onConnectEdges, 'scenario', 'scenario.onConnect.edges');

  pushEntryIssue(issues, input.scenarioMainNodes, SCENARIO_MAIN_ENTRY, 'scenario.loops.main.entry');
  pushEdgeIssues(
    issues,
    input.scenarioMainNodes,
    input.scenarioMainEdges,
    'scenario',
    'scenario.loops.main.edges',
  );
  issues.push(
    ...findPureExecEdgeHints(
      input.scenarioMainNodes,
      input.scenarioMainEdges,
      'scenario.loops.main.edges',
    ),
  );
  issues.push(
    ...findStartRecordingUnconditionalLoopIssues(
      input.scenarioMainNodes,
      input.scenarioMainEdges,
      SCENARIO_MAIN_ENTRY,
      'scenario.loops.main',
    ),
  );

  pushEntryIssue(issues, input.scenarioAlarmNodes, SCENARIO_ALARM_ENTRY, 'scenario.loops.alarm.entry');
  pushEdgeIssues(
    issues,
    input.scenarioAlarmNodes,
    input.scenarioAlarmEdges,
    'scenario',
    'scenario.loops.alarm.edges',
  );
  issues.push(
    ...findStartRecordingUnconditionalLoopIssues(
      input.scenarioAlarmNodes,
      input.scenarioAlarmEdges,
      SCENARIO_ALARM_ENTRY,
      'scenario.loops.alarm',
    ),
  );

  pushEntryIssue(issues, input.scenarioOnStopNodes, SCENARIO_ON_STOP_ENTRY, 'scenario.triggers.onStop.entry');
  pushEventEntryIssue(
    issues,
    input.scenarioOnStopNodes,
    SCENARIO_ON_STOP_ENTRY,
    'scenario.triggers.onStop.entry',
  );
  pushEdgeIssues(
    issues,
    input.scenarioOnStopNodes,
    input.scenarioOnStopEdges,
    'scenario',
    'scenario.triggers.onStop.edges',
  );

  pushEntryIssue(
    issues,
    input.scenarioOnDisconnectNodes,
    SCENARIO_ON_DISCONNECT_ENTRY,
    'scenario.triggers.onDisconnect.entry',
  );
  pushEventEntryIssue(
    issues,
    input.scenarioOnDisconnectNodes,
    SCENARIO_ON_DISCONNECT_ENTRY,
    'scenario.triggers.onDisconnect.entry',
  );
  pushEdgeIssues(
    issues,
    input.scenarioOnDisconnectNodes,
    input.scenarioOnDisconnectEdges,
    'scenario',
    'scenario.triggers.onDisconnect.edges',
  );

  const document = buildDeviceScenarioDocument({
    deviceKind: input.deviceKind,
    signalNodes: input.signalNodes,
    signalEdges: input.signalEdges,
    scenarioInitialNodes: input.scenarioInitialNodes,
    scenarioInitialEdges: input.scenarioInitialEdges,
    scenarioOnConnectNodes: onConnectNodes,
    scenarioOnConnectEdges: onConnectEdges,
    scenarioMainNodes: input.scenarioMainNodes,
    scenarioMainEdges: input.scenarioMainEdges,
    scenarioAlarmNodes: input.scenarioAlarmNodes,
    scenarioAlarmEdges: input.scenarioAlarmEdges,
    scenarioOnStopNodes: input.scenarioOnStopNodes,
    scenarioOnStopEdges: input.scenarioOnStopEdges,
    scenarioOnDisconnectNodes: input.scenarioOnDisconnectNodes,
    scenarioOnDisconnectEdges: input.scenarioOnDisconnectEdges,
    scenarioFunctions: input.scenarioFunctions,
    variables: input.variables,
  });

  for (const fn of input.scenarioFunctions) {
    const inputCount = fn.inputPins?.length ?? 0;
    const outputCount = fn.outputPins?.length ?? 0;
    if (!isScenarioFunctionPinCountValid(inputCount) || !isScenarioFunctionPinCountValid(outputCount)) {
      issues.push({
        code: 'function-pin-limit',
        message: `Функция «${fn.name}»: не более ${MAX_SCENARIO_FUNCTION_PINS_PER_SIDE} pins на Input и Output`,
        path: `scenario.functions.${fn.id}`,
      });
    }
  }

  issues.push(
    ...validateFunctionDepth(document.scenario.functions, [
      { path: 'scenario.initial', nodes: document.scenario.initial.nodes },
      { path: 'scenario.onConnect', nodes: document.scenario.onConnect.nodes },
      { path: 'scenario.loops.main', nodes: document.scenario.loops.main.nodes },
      { path: 'scenario.loops.alarm', nodes: document.scenario.loops.alarm.nodes },
      { path: 'scenario.triggers.onStop', nodes: document.scenario.triggers.onStop.nodes },
      { path: 'scenario.triggers.onDisconnect', nodes: document.scenario.triggers.onDisconnect.nodes },
    ]),
  );

  const parsed = parseDeviceScenarioDocument(document);
  if (!parsed.ok) {
    pushSchemaIssue(issues, parsed.error);
  }

  const documentErrors = validateUserCaseDocument(document).errors.filter(
    (error) => error.code !== 'block-missing-source' && error.code !== 'block-missing-target',
  );

  return mergePreRunWithUserCaseDocumentIssues(issues, documentErrors);
}

export function isPreRunValid(issues: readonly PreRunValidationIssue[]): boolean {
  return issues.every((issue) => issue.severity === 'warning');
}
