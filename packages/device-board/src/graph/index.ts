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
  variableNodePins,
  VARIABLE_VALUE_HANDLE,
} from './variable-node.js';
export type { CreateVariableBoardNodeOptions, VariableNodeKind } from './variable-node.js';
export {
  createEventBoardNode,
  ensureEventEntry,
  eventNodePins,
  isEventNode,
  rejectSystemNodeRemovals,
  EVENT_DEVICE_HANDLE,
  EVENT_EXEC_HANDLE,
  EVENT_NODE_KIND,
} from './event-node.js';
export type { CreateEventBoardNodeOptions } from './event-node.js';
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
  SCENARIO_ON_CONNECT_ENTRY,
  SCENARIO_ON_DISCONNECT_ENTRY,
  SCENARIO_ON_STOP_ENTRY,
} from './initial-board-state.js';
