/**
 * Scenario graph — visual scripting (control + data между блоками).
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §7.4
 */

import type { GraphNodeId, GraphPosition } from './graph-primitives.js';
import type { SocketType } from './socket-type.js';
import type { ScenarioNodeKind } from './scenario-node-kind.js';
import type { ScenarioVariable } from './scenario-variables.js';

/**
 * Системные ветки сценария (фиксированы на устройстве).
 *
 * v0.4: 4 обработчика событий `onConnect/onStart/onStop/onDisconnect` + лупы
 * `main/alarm`. `onStart` — канонический лейбл подграфа `initial`
 * (сериализация ветки сохраняется как `initial` ради совместимости; см. §15).
 */
export const SCENARIO_SYSTEM_BRANCHES = [
  'initial',
  'onConnect',
  'onStart',
  'main',
  'alarm',
  'onStop',
  'onDisconnect',
] as const;

/** Имя системной ветки сценария. */
export type ScenarioSystemBranch = (typeof SCENARIO_SYSTEM_BRANCHES)[number];

/**
 * Каталог блоков scenario graph v1 (stub — расширяется узлами без смены schema).
 * Эталонный сценарий хакатона 1: mic → stream → journal → FFT → alarm.
 */
export const SCENARIO_BLOCK_KINDS = [
  'select-microphone',
  'start-stream',
  'write-journal',
  'record-chunk',
  'trends-fft-detect',
  'evaluate-sound-level',
  'branch-on-detection',
  'stop-scenario',
  'handle-disconnect',
  'subgraph',
  'custom',
] as const;

/** Тип блока scenario graph. */
export type ScenarioBlockKind = (typeof SCENARIO_BLOCK_KINDS)[number];

/** Семантика ребра scenario graph. */
export type ScenarioEdgeKind = 'exec' | 'data';

/** Нода scenario graph. Параметры блока — в persisted-state плагина, не в JSON. */
export interface ScenarioGraphNode {
  readonly id: GraphNodeId;
  readonly blockKind: ScenarioBlockKind;
  readonly position: GraphPosition;
  readonly label?: string;
  /**
   * v0.4: вид узла новой таксономии (`event`/`variable-get`/…), по которому
   * идёт рендер и dataflow-резолюция. Legacy D0-узлы поле не задают.
   */
  readonly nodeKind?: ScenarioNodeKind;
  /** v0.4: системный узел (например `event`) — нельзя удалить с борда. */
  readonly system?: boolean;
  /** v0.4: для `variable-get`/`variable-set` — id связанной переменной. */
  readonly variableId?: string;
}

/** Ребро scenario graph. */
export interface ScenarioGraphEdge {
  readonly source: GraphNodeId;
  readonly sourceHandle: string;
  readonly target: GraphNodeId;
  readonly targetHandle: string;
  readonly kind: ScenarioEdgeKind;
  /** Для `kind: 'data'` — тип payload; capability проверяется узлом. */
  readonly dataType?: SocketType;
}

/** Подграф сценария (initial, loop, trigger, function). */
export interface ScenarioSubgraph {
  readonly entry: GraphNodeId;
  readonly nodes: readonly ScenarioGraphNode[];
  readonly edges: readonly ScenarioGraphEdge[];
}

/** Переиспользуемая функция / subgraph с граничными pins (depth ≤ 1 в v1). */
export interface ScenarioFunctionSubgraph extends ScenarioSubgraph {
  readonly id: string;
  readonly name: string;
  readonly inputPins: readonly string[];
  readonly outputPins: readonly string[];
}

/** Заглушка scheduled job (cron в сценарии). */
export interface ScheduledJobStub {
  readonly id: string;
  readonly cron: string;
  readonly subgraph: ScenarioSubgraph;
}

/** Циклы сценария. */
export interface ScenarioLoops {
  readonly main: ScenarioSubgraph;
  readonly alarm: ScenarioSubgraph;
}

/** Триггеры сценария. */
export interface ScenarioTriggers {
  readonly onStop: ScenarioSubgraph;
  readonly onDisconnect: ScenarioSubgraph;
  readonly custom: readonly ScenarioSubgraph[];
}

/**
 * Корневая структура scenario graph внутри device-scenario JSON.
 *
 * Раскладка обработчиков событий v0.4 на поля схемы:
 * - `onStart`  ≡ `initial` (сохраняется как `initial`);
 * - `onConnect` — отдельное поле (добавлено в v0.4);
 * - `onStop` / `onDisconnect` ≡ `triggers.onStop` / `triggers.onDisconnect`.
 */
export interface ScenarioGraph {
  readonly initial: ScenarioSubgraph;
  /** v0.4: обработчик подключения устройства (даёт постоянную DeviceRef). */
  readonly onConnect: ScenarioSubgraph;
  readonly loops: ScenarioLoops;
  readonly triggers: ScenarioTriggers;
  readonly functions: readonly ScenarioFunctionSubgraph[];
  readonly scheduled: readonly ScheduledJobStub[];
  /** v0.4: переменные сценария (document-scope, ссылочные). */
  readonly variables: readonly ScenarioVariable[];
}

/** Пустой подграф (placeholder). */
export function createEmptyScenarioSubgraph(entry: GraphNodeId = 'entry'): ScenarioSubgraph {
  return { entry, nodes: [], edges: [] };
}

/** Пустой scenario graph со всеми обязательными ветками. */
export function createEmptyScenarioGraph(): ScenarioGraph {
  return {
    initial: createEmptyScenarioSubgraph('initial-entry'),
    onConnect: createEmptyScenarioSubgraph('on-connect-entry'),
    loops: {
      main: createEmptyScenarioSubgraph('main-entry'),
      alarm: createEmptyScenarioSubgraph('alarm-entry'),
    },
    triggers: {
      onStop: createEmptyScenarioSubgraph('on-stop-entry'),
      onDisconnect: createEmptyScenarioSubgraph('on-disconnect-entry'),
      custom: [],
    },
    functions: [],
    scheduled: [],
    variables: [],
  };
}

/** Type guard для `ScenarioBlockKind`. */
export function isScenarioBlockKind(value: string): value is ScenarioBlockKind {
  return (SCENARIO_BLOCK_KINDS as readonly string[]).includes(value);
}

/** Type guard для `ScenarioSystemBranch`. */
export function isScenarioSystemBranch(value: string): value is ScenarioSystemBranch {
  return (SCENARIO_SYSTEM_BRANCHES as readonly string[]).includes(value);
}
