export type { BoardFlowNodeData, BoardPinKind, BoardSocketPin } from './board-node-data.js';
export { isBoardFlowNodeData } from './board-node-data.js';
export {
  D0_SCENARIO_NODE_CATALOG,
  D0_SIGNAL_NODE_CATALOG,
  socketTypeForPin,
} from './d0-node-catalog.js';
export type { D0ScenarioNodeTemplate, D0SignalNodeTemplate } from './d0-node-catalog.js';
export { createScenarioBoardNode } from './board-node-factory.js';
export type { CreateScenarioBoardNodeOptions } from './board-node-factory.js';
export {
  createVariableBoardNode,
  referenceTypeLabel,
  syncVariableNodePins,
  variableNodePins,
  VARIABLE_VALUE_HANDLE,
} from './variable-node.js';
export type { CreateVariableBoardNodeOptions, VariableNodeKind } from './variable-node.js';
export { variableTypeIndicatorClass } from './variable-type-indicator.js';
export { socketTypeIndicatorClass } from './socket-type-indicator.js';
export {
  createEventBoardNode,
  createLoopTickEventBoardNode,
  ensureEventEntry,
  ensureLoopTickEntry,
  eventNodePins,
  isEventNode,
  isLoopTickEventNode,
  isLockedBoardNode,
  isSystemNode,
  loopTickEventNodePins,
  rejectSystemNodeRemovals,
  syncEventNodePins,
  EVENT_DATETIME_HANDLE,
  EVENT_DELTATIME_HANDLE,
  EVENT_DEVICE_HANDLE,
  EVENT_EXEC_HANDLE,
  EVENT_NODE_KIND,
  EVENT_SERVER_HANDLE,
  EVENT_TICK_MS_HANDLE,
} from './event-node.js';
export type { CreateEventBoardNodeOptions, CreateLoopTickEventBoardNodeOptions, EventHandlerBranch, EventVariant } from './event-node.js';
export {
  createLoopRepeatBoardNode,
  ensureLoopInfinity,
  isLoopRepeatNode,
  syncLoopRepeatNodePins,
  LOOP_REPEAT_EXEC_IN,
  LOOP_REPEAT_NODE_KIND,
} from './loop-repeat-node.js';
export type { CreateLoopRepeatBoardNodeOptions } from './loop-repeat-node.js';
export {
  clearBranchState,
  edgesAfterBranchClear,
  EVENT_HANDLER_BRANCHES,
  nodesAfterBranchClear,
  shouldPreserveLockedNodes,
} from './clear-branch.js';
export { scenarioDocumentFingerprint } from './scenario-snapshot.js';
export { syncVariableNodeLabels } from './sync-variable-node-labels.js';
export { formatSocketPortLabel } from './socket-port-label.js';
export { socketHandleClass, REFERENCE_SOCKET_HANDLE_CLASS, NULL_SOCKET_HANDLE_CLASS, VALUE_SOCKET_HANDLE_CLASS } from './socket-type-palette.js';
export {
  createPaletteBoardNode,
  isPaletteNodeKind,
  paletteNodeLabel,
  paletteNodePins,
  PALETTE_VALUE_HANDLE,
  GET_MICROPHONE_DEVICE_HANDLE,
  GET_MICROPHONE_OUT_HANDLE,
  IS_VALID_FALSE_HANDLE,
  IS_VALID_TRUE_HANDLE,
  V04_PALETTE_NODE_KINDS,
} from './palette-node.js';
export type { CreatePaletteBoardNodeOptions, V04PaletteNodeKind } from './palette-node.js';
export { resolveHandle } from './handle-catalog.js';
export type { ResolvedHandle } from './handle-catalog.js';
export { isValidBoardConnection, isValidBoardEdge } from './connection-validation.js';
export { serializeSignalGraph, deserializeSignalGraph } from './serialize-signal-graph.js';
export { serializeScenarioSubgraph, deserializeScenarioSubgraph } from './serialize-scenario-subgraph.js';
export { buildDeviceScenarioDocument } from './build-device-scenario.js';
export type { BuildDeviceScenarioInput } from './build-device-scenario.js';
export { exportDeviceScenarioDocument } from './export-device-scenario.js';
export type { ExportedDeviceScenario } from './export-device-scenario.js';
export {
  hydrateBoardFromDocument,
  hydratedFunctionInput,
  createDefaultHydratedBoardState,
} from './hydrate-board-from-document.js';
export type { HydratedBoardState, ScenarioFunctionCanvasMeta } from './hydrate-board-from-document.js';
export { importDeviceScenarioFromJson } from './import-device-scenario.js';
export type {
  ImportDeviceScenarioResult,
  ImportDeviceScenarioSuccess,
  ImportDeviceScenarioFailure,
} from './import-device-scenario.js';
export { validatePreRun, isPreRunValid } from './validate-pre-run.js';
export type { PreRunValidationIssue, PreRunValidationInput } from './validate-pre-run.js';
export {
  DEVICE_OFFLINE_RUN_HINT,
  resolveRunDisabledReason,
} from './run-gating.js';
export type { ResolveRunDisabledReasonInput } from './run-gating.js';
export { canonicalizeJson, sha256Hex } from './document-hash.js';
export { serializeScenarioFunction } from './serialize-scenario-function.js';
export type { SerializeScenarioFunctionInput } from './serialize-scenario-function.js';
export { encodeSubgraphRef, parseSubgraphDisplayLabel, parseSubgraphFunctionId } from './subgraph-ref.js';
export { validateFunctionDepth } from './validate-function-depth.js';
export type { SubgraphNodesRef } from './validate-function-depth.js';
export {
  buildDemoFunctionInput,
  DEMO_FUNCTION_CAPTURE_DETECT_EDGES,
  DEMO_FUNCTION_CAPTURE_DETECT_ENTRY,
  DEMO_FUNCTION_CAPTURE_DETECT_ID,
  DEMO_FUNCTION_CAPTURE_DETECT_NAME,
  DEMO_FUNCTION_CAPTURE_DETECT_NODES,
  INITIAL_SIGNAL_EDGES,
  INITIAL_SIGNAL_NODES,
  INITIAL_SCENARIO_ALARM_EDGES,
  INITIAL_SCENARIO_ALARM_NODES,
  INITIAL_SCENARIO_INITIAL_EDGES,
  INITIAL_SCENARIO_INITIAL_NODES,
  INITIAL_SCENARIO_MAIN_EDGES,
  INITIAL_SCENARIO_MAIN_NODES,
  INITIAL_SCENARIO_ON_CONNECT_EDGES,
  INITIAL_SCENARIO_ON_CONNECT_NODES,
  INITIAL_SCENARIO_ON_DISCONNECT_EDGES,
  INITIAL_SCENARIO_ON_DISCONNECT_NODES,
  INITIAL_SCENARIO_ON_STOP_EDGES,
  INITIAL_SCENARIO_ON_STOP_NODES,
  SCENARIO_ALARM_ENTRY,
  SCENARIO_INITIAL_ENTRY,
  SCENARIO_MAIN_ENTRY,
  SCENARIO_MAIN_INFINITY,
  SCENARIO_ALARM_INFINITY,
  SCENARIO_ON_CONNECT_ENTRY,
  SCENARIO_ON_DISCONNECT_ENTRY,
  SCENARIO_ON_STOP_ENTRY,
} from './initial-board-state.js';
