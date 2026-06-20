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
  createDeviceGlobalBoardNode,
  deviceGlobalNodePins,
  DEVICE_GLOBAL_DEVICE_HANDLE,
  DEVICE_GLOBAL_NODE_KIND,
  isDeviceGlobalNode,
  syncDeviceGlobalNodePins,
} from './device-global-node.js';
export type { CreateDeviceGlobalBoardNodeOptions } from './device-global-node.js';
export {
  createStopRuntimeBoardNode,
  stopRuntimeNodePins,
  STOP_RUNTIME_NODE_KIND,
  STOP_RUNTIME_DEVICE_HANDLE,
  isStopRuntimeNode,
} from './stop-runtime-node.js';
export type { CreateStopRuntimeBoardNodeOptions } from './stop-runtime-node.js';
export {
  createGetRecorderBoardNode,
  getRecorderNodePins,
  GET_RECORDER_NODE_KIND,
  GET_RECORDER_DEVICE_HANDLE,
  GET_RECORDER_OUT_HANDLE,
  isGetRecorderNode,
} from './get-recorder-node.js';
export type { CreateGetRecorderBoardNodeOptions } from './get-recorder-node.js';
export {
  createGetJournalBoardNode,
  getJournalNodePins,
  GET_JOURNAL_NODE_KIND,
  GET_JOURNAL_DEVICE_HANDLE,
  GET_JOURNAL_SERVER_HANDLE,
  GET_JOURNAL_OUT_HANDLE,
  isGetJournalNode,
} from './get-journal-node.js';
export type { CreateGetJournalBoardNodeOptions } from './get-journal-node.js';
export {
  createGetReporterBoardNode,
  getReporterNodePins,
  GET_REPORTER_NODE_KIND,
  GET_REPORTER_JOURNAL_HANDLE,
  GET_REPORTER_OUT_HANDLE,
  isGetReporterNode,
} from './get-reporter-node.js';
export type { CreateGetReporterBoardNodeOptions } from './get-reporter-node.js';
export {
  createMakeReportFromAnalysisBoardNode,
  makeReportFromAnalysisNodePins,
  MAKE_REPORT_FROM_ANALYSIS_NODE_KIND,
  MAKE_REPORT_FROM_ANALYSIS_REPORTER_HANDLE,
  MAKE_REPORT_FROM_ANALYSIS_ANALYSIS_HANDLE,
  MAKE_REPORT_FROM_ANALYSIS_OUT_HANDLE,
  isMakeReportFromAnalysisNode,
} from './make-report-from-analysis-node.js';
export type { CreateMakeReportFromAnalysisBoardNodeOptions } from './make-report-from-analysis-node.js';
export {
  createMakeReportFromTrackBoardNode,
  makeReportFromTrackNodePins,
  MAKE_REPORT_FROM_TRACK_NODE_KIND,
  MAKE_REPORT_FROM_TRACK_REPORTER_HANDLE,
  MAKE_REPORT_FROM_TRACK_TRACK_HANDLE,
  MAKE_REPORT_FROM_TRACK_OUT_HANDLE,
  isMakeReportFromTrackNode,
} from './make-report-from-track-node.js';
export type { CreateMakeReportFromTrackBoardNodeOptions } from './make-report-from-track-node.js';
export {
  createPublishReportBoardNode,
  publishReportNodePins,
  PUBLISH_REPORT_NODE_KIND,
  PUBLISH_REPORT_JOURNAL_HANDLE,
  PUBLISH_REPORT_REPORT_HANDLE,
  isPublishReportNode,
} from './publish-report-node.js';
export type { CreatePublishReportBoardNodeOptions } from './publish-report-node.js';
export {
  createGetSpectralAnalyserBoardNode,
  getSpectralAnalyserNodePins,
  GET_SPECTRAL_ANALYSER_NODE_KIND,
  GET_SPECTRAL_ANALYSER_DEVICE_HANDLE,
  GET_SPECTRAL_ANALYSER_OUT_HANDLE,
  isGetSpectralAnalyserNode,
} from './get-spectral-analyser-node.js';
export type { CreateGetSpectralAnalyserBoardNodeOptions } from './get-spectral-analyser-node.js';
export {
  COLLECT_BATCH_OUT_HANDLE,
  COLLECT_EVENT_OUT_HANDLE,
} from './collect-node-shared.js';
export {
  createCollectSamplesBoardNode,
  collectSamplesNodePins,
  COLLECT_SAMPLES_NODE_KIND,
  COLLECT_SAMPLES_RECORDER_HANDLE,
  COLLECT_SAMPLES_SAMPLE_HANDLE,
  isCollectSamplesNode,
} from './collect-samples-node.js';
export type { CreateCollectSamplesBoardNodeOptions } from './collect-samples-node.js';
export {
  createCollectFftFramesBoardNode,
  collectFftFramesNodePins,
  COLLECT_FFT_FRAMES_NODE_KIND,
  COLLECT_FFT_ANALYSER_HANDLE,
  COLLECT_FFT_FRAME_HANDLE,
  isCollectFftFramesNode,
} from './collect-fft-frames-node.js';
export type { CreateCollectFftFramesBoardNodeOptions } from './collect-fft-frames-node.js';
export type { CreateNewFftTrendsAnalysisBoardNodeOptions } from './new-fft-trends-analysis-node.js';
export {
  createNewTrackBoardNode,
  newTrackNodePins,
  NEW_TRACK_NODE_KIND,
  NEW_TRACK_SAMPLES_HANDLE,
  isNewTrackNode,
} from './new-track-node.js';
export type { CreateNewTrackBoardNodeOptions } from './new-track-node.js';
export {
  createNewFftTrendsAnalysisBoardNode,
  newFftTrendsAnalysisNodePins,
  NEW_FFT_TRENDS_ANALYSIS_NODE_KIND,
  NEW_FFT_TRENDS_FRAMES_HANDLE,
  isNewFftTrendsAnalysisNode,
} from './new-fft-trends-analysis-node.js';
export {
  suggestPaletteNodesForOutgoingConnection,
} from './connection-suggest.js';
export type { PaletteConnectionSuggestion } from './connection-suggest.js';
export {
  BOARD_NODE_LAYOUT_HEIGHT,
  BOARD_NODE_LAYOUT_WIDTH,
  centerNodePositionAtFlowPoint,
} from './flow-node-position.js';
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
export {
  socketHandleClass,
  REFERENCE_SOCKET_HANDLE_CLASS,
  NULL_SOCKET_HANDLE_CLASS,
  DATETIME_SOCKET_HANDLE_CLASS,
  INTEGER_SOCKET_HANDLE_CLASS,
  STRING_SOCKET_HANDLE_CLASS,
} from './socket-type-palette.js';
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
export {
  resolveBoardNodeOutputPin,
  resolveBoardNodePinLayout,
  scenarioNodePinsForKind,
} from './scenario-node-pins.js';
export type { ScenarioNodePinLayout } from './scenario-node-pins.js';
export { isValidBoardConnection, isValidBoardEdge } from './connection-validation.js';
export { serializeSignalGraph, deserializeSignalGraph } from './serialize-signal-graph.js';
export { serializeScenarioSubgraph, deserializeScenarioSubgraph } from './serialize-scenario-subgraph.js';
export { buildDeviceScenarioDocument } from './build-device-scenario.js';
export type { BuildDeviceScenarioInput } from './build-device-scenario.js';
export { exportDeviceScenarioDocument } from './export-device-scenario.js';
export type { ExportedDeviceScenario } from './export-device-scenario.js';
export {
  branchScenarioExportFilename,
  buildBranchScenarioExport,
} from './export-branch-scenario.js';
export type { BranchScenarioExport, BuildBranchScenarioExportInput } from './export-branch-scenario.js';
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
