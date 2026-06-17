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
  type SocketType,
  type SocketSpec,
  isSocketType,
  isValidSocketConnection,
} from './socket-type.js';

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
  type DeviceScenarioMeta,
  type DeviceScenarioDocument,
  createEmptyDeviceScenarioDocument,
  parseDeviceScenarioDocument,
} from './device-scenario.js';
