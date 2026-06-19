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
  SYSTEM_SCENARIO_NODE_KINDS,
  type ScenarioNodeKind,
  isScenarioNodeKind,
  isSystemScenarioNodeKind,
} from './scenario-node-kind.js';

export {
  type ScenarioReferenceVariableType,
  type ScenarioValueVariableType,
  type ScenarioVariableType,
  type ScenarioReferenceValue,
  type ScenarioDateTimeValue,
  type ScenarioIntegerValue,
  type ScenarioVariableValue,
  type ScenarioVariable,
  createReferenceValue,
  createDateTimeValue,
  createIntegerValue,
  invalidateReference,
  createScenarioVariable,
  isScenarioVariableType,
  isScenarioReferenceValue,
  isScenarioDateTimeValue,
  isScenarioIntegerValue,
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
