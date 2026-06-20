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
} from './scenario-node-kind.js';

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
  type ScenarioReferenceVariableType,
  type ScenarioValueVariableType,
  type ScenarioVariableType,
  type ScenarioReferenceValue,
  type ScenarioDateTimeValue,
  type ScenarioIntegerValue,
  type ScenarioStringValue,
  type ScenarioVariableValue,
  type ScenarioVariable,
  createReferenceValue,
  createDateTimeValue,
  createIntegerValue,
  createStringValue,
  invalidateReference,
  createScenarioVariable,
  isScenarioVariableType,
  isScenarioReferenceValue,
  isScenarioDateTimeValue,
  isScenarioIntegerValue,
  isScenarioStringValue,
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
  DEVICE_SCENARIO_DOCUMENT_KIND,
  DEVICE_SCENARIO_DOCUMENT_VERSION,
  DEVICE_SCENARIO_MIN_DOCUMENT_VERSION,
  type DeviceScenarioMeta,
  type DeviceScenarioDocument,
  createEmptyDeviceScenarioDocument,
  parseDeviceScenarioDocument,
} from './device-scenario.js';
