/**
 * Scenario graph — visual scripting (control + data между блоками).
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §7.4
 */

import type { GraphNodeId, GraphPosition } from './graph-primitives.js';
import type { SocketType } from './socket-type.js';
import type { ScenarioNodeKind } from './scenario-node-kind.js';
import type { ScenarioVariable } from './scenario-variables.js';
import type { ScenarioCollectorConfig } from './collector-config.js';
import type { ScenarioFftTrendsPolicy } from './fft-trends-policy.js';
import type { ScenarioRecordingPolicy } from './recording-policy.js';
import type { ScenarioFunctionPin } from './scenario-function-pin.js';
import type { ScenarioCommentGroup } from './scenario-comment-group.js';
import type { ScenarioSequenceConfig } from './sequence-config.js';
import type { ScenarioAsyncJobNodeConfig } from './scenario-async-job-node-config.js';

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
export type ScenarioEdgeKind = 'exec' | 'data' | 'event';

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
  /** v0.4+: `event` в лупах — `loopTick` (onTick); обработчики — `handler` или не задано. */
  readonly eventVariant?: 'handler' | 'loopTick';
  /** v0.5: настройки Collect-узла (sidebar); policy на singleton — future. */
  readonly collectorConfig?: ScenarioCollectorConfig;
  /** v0.7+: policy окна записи (StartRecording / MakeRecordingPolicy). */
  readonly recordingPolicy?: ScenarioRecordingPolicy;
  /** v0.8: policy FFT trends (MakeFftTrendsPolicy). */
  readonly fftTrendsPolicy?: ScenarioFftTrendsPolicy;
  /** basn-2: MakeDetectionFusion — число входов анализов (2..4). */
  readonly detectionFusionInputCount?: number;
  /** basn-3: BranchOnDetection — порог combinedScore (0..1, default 0.5). */
  readonly detectionThreshold?: number;
  /**
   * PC-2 (консилиум pc2-periodic-window-gate): IsWindowElapsed — размер
   * периодического окна в мс (host-часы, БЕЗ рекордера). Рантайм читает это поле
   * (если нет провода windowMs). Владелец времени наблюдательного лупа.
   */
  readonly windowElapsedMs?: number;
  /** Sequence node: Then count + parallel async mode. */
  readonly sequenceConfig?: ScenarioSequenceConfig;
  /** AP v1: jobKind / await timeout для promise orchestration nodes. */
  readonly asyncJobConfig?: ScenarioAsyncJobNodeConfig;
  /**
   * v0.9: Blueprint-style pure getter flag.
   * - policy constructors: always `true` (locked);
   * - `variable-get`: default `true`, toggleable to impure;
   * - host I/O / exec nodes: поле не сериализуется.
   */
  readonly pure?: boolean;
  /**
   * ES4: явный override async-capable для Sequence parallel Then-веток.
   * Без поля — см. `resolveScenarioGraphNodeSupportsAsync`.
   */
  readonly supportsAsync?: boolean;
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
  readonly inputPins: readonly ScenarioFunctionPin[];
  readonly outputPins: readonly ScenarioFunctionPin[];
  readonly description?: string;
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
  /** CGF G1: comment groups (canvas-only, не runtime). */
  readonly commentGroups: readonly ScenarioCommentGroup[];
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
    commentGroups: [],
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
