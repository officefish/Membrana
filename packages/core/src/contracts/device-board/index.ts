/**
 * Контракты device-board: signal graph + scenario graph.
 * @package @membrana/core
 */

export {
  DEVICE_KINDS,
  type DeviceKind,
  isDeviceKind,
} from './device-kind.js';

export {
  SOCKET_TYPES,
  D0_SOCKET_TYPES,
  REFERENCE_SOCKET_TYPES,
  VALUE_SOCKET_TYPES,
  type SocketType,
  type ReferenceSocketType,
  type ValueSocketType,
  type SocketSpec,
  isSocketType,
  isReferenceSocketType,
  isValueSocketType,
  isValidSocketConnection,
} from './socket-type.js';

export {
  SCENARIO_NODE_KINDS,
  COLLECTOR_SCENARIO_NODE_KINDS,
  TERMINAL_SCENARIO_NODE_KINDS,
  JOURNAL_SCENARIO_NODE_KINDS,
  REPORTER_METHOD_SCENARIO_NODE_KINDS,
  SYSTEM_SCENARIO_NODE_KINDS,
  type ScenarioNodeKind,
  type CollectorScenarioNodeKind,
  type TerminalScenarioNodeKind,
  type JournalScenarioNodeKind,
  type ReporterMethodScenarioNodeKind,
  isScenarioNodeKind,
  isSystemScenarioNodeKind,
  isCollectorScenarioNodeKind,
  isTerminalScenarioNodeKind,
  isJournalScenarioNodeKind,
  isReporterMethodScenarioNodeKind,
  RECORDING_GATE_SCENARIO_NODE_KINDS,
  isRecordingGateScenarioNodeKind,
  type RecordingGateScenarioNodeKind,
  POLICY_CONSTRUCTOR_SCENARIO_NODE_KINDS,
  REF_CONSTRUCTOR_SCENARIO_NODE_KINDS,
  CONSTRUCTOR_SCENARIO_NODE_KINDS,
  type PolicyConstructorScenarioNodeKind,
  type RefConstructorScenarioNodeKind,
  type ConstructorScenarioNodeKind,
  isPolicyConstructorScenarioNodeKind,
  isRefConstructorScenarioNodeKind,
  isConstructorScenarioNodeKind,
} from './scenario-node-kind.js';

export {
  CONSTRUCTOR_ALWAYS_PURE_SCENARIO_NODE_KINDS,
  PURE_ELIGIBLE_SCENARIO_NODE_KINDS,
  PURE_LOCKED_IMPURE_SCENARIO_NODE_KINDS,
  DEFAULT_PURE_ELIGIBLE,
  type ConstructorAlwaysPureScenarioNodeKind,
  type PureEligibleScenarioNodeKind,
  type PureLockedImpureScenarioNodeKind,
  isConstructorAlwaysPureScenarioNodeKind,
  isPureEligibleScenarioNodeKind,
  isPureLockedImpureScenarioNodeKind,
  isScenarioNodePureFieldApplicable,
  resolveScenarioGraphNodePure,
  normalizeScenarioGraphNodePure,
} from './scenario-node-pure.js';

export {
  DEFAULT_ASYNC_CAPABLE_SCENARIO_NODE_KINDS,
  type DefaultAsyncCapableScenarioNodeKind,
  isDefaultAsyncCapableScenarioNodeKind,
  resolveScenarioGraphNodeSupportsAsync,
} from './scenario-node-async.js';

export {
  JOURNAL_SCOPE_KINDS,
  JOURNAL_REF_HANDLE_PREFIX,
  REPORTER_REF_HANDLE_PREFIX,
  type JournalScopeKind,
  isJournalScopeKind,
  formatJournalRefHandle,
  formatReporterRefHandle,
  parseJournalRefHandle,
  parseReporterRefJournalHandle,
} from './journal-scope.js';

export {
  SCENARIO_REPORT_SCHEMAS,
  REPORT_REF_HANDLE_PREFIX,
  TRACK_REF_HANDLE_PREFIX,
  FFT_TREND_ANALYSIS_REF_HANDLE_PREFIX,
  type ScenarioReportSchema,
  type ScenarioReportPayload,
  isKnownScenarioReportSchema,
  formatReportRefHandle,
  formatTrackRefHandle,
  formatFftTrendAnalysisRefHandle,
  createScenarioReportPayload,
  isScenarioReportPayload,
} from './scenario-report.js';

export {
  SCENARIO_PIN_KINDS,
  type ScenarioPinKind,
  isScenarioPinKind,
} from './scenario-pin-kind.js';

export {
  DEFAULT_SCENARIO_COLLECTOR_CONFIG,
  type ScenarioCollectorConfig,
  resolveScenarioCollectorConfig,
  isScenarioCollectorConfig,
} from './collector-config.js';

export {
  DEFAULT_SCENARIO_SEQUENCE_CONFIG,
  MAX_SCENARIO_SEQUENCE_THEN_COUNT,
  MIN_SCENARIO_SEQUENCE_THEN_COUNT,
  type ScenarioSequenceConfig,
  resolveScenarioSequenceConfig,
  isScenarioSequenceConfig,
} from './sequence-config.js';

export {
  RECORDING_WINDOW_SEC_PRESETS,
  SCENARIO_CAPTURE_FORMATS,
  DEFAULT_RECORDING_POLICY,
  LEGACY_COLLECTOR_WINDOW_SEC,
  type ScenarioRecordingWindowSec,
  type ScenarioCaptureFormat,
  type ScenarioRecordingPolicy,
  nearestRecordingWindowPreset,
  resolveScenarioRecordingPolicy,
  isScenarioRecordingPolicy,
} from './recording-policy.js';

export {
  FFT_TRENDS_DETECTION_MODES,
  FFT_TRENDS_MEASUREMENT_COUNT_PRESETS,
  FFT_TRENDS_INTERVAL_MS_PRESETS,
  FFT_TRENDS_BUILTIN_TEMPLATE_KEYS,
  DEFAULT_FFT_TRENDS_POLICY,
  type ScenarioFftTrendsDetectionMode,
  type ScenarioFftTrendsMeasurementCount,
  type ScenarioFftTrendsIntervalMs,
  type ScenarioFftTrendsBuiltinTemplateKey,
  type ScenarioFftTrendsPolicy,
  resolveScenarioFftTrendsPolicy,
  isScenarioFftTrendsPolicy,
  fftTrendsAnalysisDurationSec,
} from './fft-trends-policy.js';

export {
  RECORDING_SLICE_REF_HANDLE_PREFIX,
  formatRecordingSliceRefHandle,
  parseRecordingSliceRefHandle,
} from './recording-slice-ref.js';

export {
  type ScenarioReferenceVariableType,
  type ScenarioValueVariableType,
  type ScenarioVariableType,
  type ScenarioReferenceValue,
  type ScenarioDateTimeValue,
  type ScenarioIntegerValue,
  type ScenarioStringValue,
  type ScenarioRecordingPolicyValue,
  type ScenarioFftTrendsPolicyValue,
  type ScenarioVariableValue,
  type ScenarioVariable,
  createReferenceValue,
  createDateTimeValue,
  createIntegerValue,
  createStringValue,
  createRecordingPolicyValue,
  createFftTrendsPolicyValue,
  invalidateReference,
  createScenarioVariable,
  isScenarioVariableType,
  isScenarioReferenceValue,
  isScenarioDateTimeValue,
  isScenarioIntegerValue,
  isScenarioStringValue,
  isScenarioRecordingPolicyValue,
  isScenarioFftTrendsPolicyValue,
  isScenarioVariableValue,
  isScenarioVariable,
  migrateScenarioVariableLegacy,
} from './scenario-variables.js';

export {
  type NodeKindCategory,
  type PluginNodeKind,
} from './node-kind.js';

export {
  type GraphPosition,
  type GraphNodeId,
} from './graph-primitives.js';

export {
  type SignalGraphNode,
  type SignalGraphEdge,
  type SignalGraph,
  createEmptySignalGraph,
} from './signal-graph.js';

export {
  SCENARIO_SYSTEM_BRANCHES,
  SCENARIO_BLOCK_KINDS,
  type ScenarioSystemBranch,
  type ScenarioBlockKind,
  type ScenarioEdgeKind,
  type ScenarioGraphNode,
  type ScenarioGraphEdge,
  type ScenarioSubgraph,
  type ScenarioFunctionSubgraph,
  type ScheduledJobStub,
  type ScenarioLoops,
  type ScenarioTriggers,
  type ScenarioGraph,
  createEmptyScenarioSubgraph,
  createEmptyScenarioGraph,
  isScenarioBlockKind,
  isScenarioSystemBranch,
} from './scenario-graph.js';

export {
  MAX_SCENARIO_FUNCTION_PINS_PER_SIDE,
  type ScenarioFunctionPin,
  createDefaultFunctionExecInputPin,
  createDefaultFunctionExecOutputPin,
  normalizeScenarioFunctionPin,
  normalizeScenarioFunctionPins,
  canonicalizeScenarioFunctionPinOrder,
  isScenarioFunctionPinCountValid,
} from './scenario-function-pin.js';

export {
  type ScenarioCommentGroup,
  type ScenarioCommentGroupBranch,
  type ScenarioCommentGroupRect,
  type ScenarioCommentGroupFrameColor,
  type ScenarioCommentGroupFrameColorPreset,
  SCENARIO_COMMENT_GROUP_FRAME_COLOR_PRESETS,
  DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR,
  isScenarioCommentGroupBranch,
  isScenarioCommentGroupFrameColorPreset,
  resolveScenarioCommentGroupFrameColor,
} from './scenario-comment-group.js';

export {
  DEVICE_SCENARIO_DOCUMENT_KIND,
  DEVICE_SCENARIO_DOCUMENT_VERSION,
  DEVICE_SCENARIO_MIN_DOCUMENT_VERSION,
  DEFAULT_COMPETITION_TIMEOUT_SEC,
  type DeviceScenarioExecutionPolicy,
  type DeviceScenarioMeta,
  type DeviceScenarioWorkspaceKind,
  type DeviceScenarioDocument,
  createEmptyDeviceScenarioDocument,
  parseDeviceScenarioDocument,
} from './device-scenario.js';
