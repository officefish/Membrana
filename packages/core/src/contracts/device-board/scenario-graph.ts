/**
 * Scenario graph — visual scripting (control + data между блоками).
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §7.4
 */

import type { GraphNodeId, GraphPosition } from './graph-primitives.js';
import type { SocketType } from './socket-type.js';

/** Системные ветки сценария (фиксированы на устройстве). */
export const SCENARIO_SYSTEM_BRANCHES = [
  'initial',
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

/** Корневая структура scenario graph внутри device-scenario JSON. */
export interface ScenarioGraph {
  readonly initial: ScenarioSubgraph;
  readonly loops: ScenarioLoops;
  readonly triggers: ScenarioTriggers;
  readonly functions: readonly ScenarioFunctionSubgraph[];
  readonly scheduled: readonly ScheduledJobStub[];
}

/** Пустой подграф (placeholder). */
export function createEmptyScenarioSubgraph(entry: GraphNodeId = 'entry'): ScenarioSubgraph {
  return { entry, nodes: [], edges: [] };
}

/** Пустой scenario graph со всеми обязательными ветками. */
export function createEmptyScenarioGraph(): ScenarioGraph {
  return {
    initial: createEmptyScenarioSubgraph('initial-entry'),
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
