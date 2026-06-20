import type { Edge, Node, NodeChange } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/** Ветви-обработчики с системным Event-узлом. */
export type EventHandlerBranch = 'onConnect' | 'initial' | 'onStop' | 'onDisconnect';

/** Вид системного узла-обработчика события. */
export const EVENT_NODE_KIND = 'event' as const;

/** Имя exec-выхода узла Event (точка входа ветви-обработчика). */
export const EVENT_EXEC_HANDLE = 'exec-out' as const;

/** Имя data-выхода узла Event — ссылка на устройство (или `null` в onDisconnect). */
export const EVENT_DEVICE_HANDLE = 'device' as const;

/** Имя data-выхода узла Event onConnect — ссылка на сервер (cabinet/media). */
export const EVENT_SERVER_HANDLE = 'server' as const;

/** Имя data-выхода узла Event — момент срабатывания триггера (`DateTime` value). */
export const EVENT_DATETIME_HANDLE = 'datetime' as const;

/** Имя data-выхода onTick в лупе — elapsed с начала сценария (`DateTime` value). */
export const EVENT_DELTATIME_HANDLE = 'deltatime' as const;

/** Имя data-выхода onTick в лупе — миллисекунды с предыдущего тика (`Integer` value). */
export const EVENT_TICK_MS_HANDLE = 'tickMs' as const;

/** Вариант системного Event-узла. */
export type EventVariant = 'handler' | 'loopTick';

const EXEC_OUT: BoardSocketPin = { name: EVENT_EXEC_HANDLE, kind: 'exec' };

const DATETIME_OUT: BoardSocketPin = {
  name: EVENT_DATETIME_HANDLE,
  kind: 'data',
  socketType: 'DateTime',
};

const DELTATIME_OUT: BoardSocketPin = {
  name: EVENT_DELTATIME_HANDLE,
  kind: 'data',
  socketType: 'DateTime',
};

const TICK_MS_OUT: BoardSocketPin = {
  name: EVENT_TICK_MS_HANDLE,
  kind: 'data',
  socketType: 'Integer',
};

const SERVER_OUT: BoardSocketPin = {
  name: EVENT_SERVER_HANDLE,
  kind: 'data',
  socketType: 'ServerRef',
};

export interface EventNodePinOptions {
  readonly nullableDeviceOutput?: boolean;
  readonly includeServerOutput?: boolean;
}

/**
 * Пины узла Event: exec + device (+ nullable) + optional server (onConnect) + datetime.
 */
export function eventNodePins(options: EventNodePinOptions = {}): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  const nullableDevice = options.nullableDeviceOutput === true;
  const includeServer = options.includeServerOutput === true;
  return {
    inputs: [],
    outputs: [
      EXEC_OUT,
      {
        name: EVENT_DEVICE_HANDLE,
        kind: 'data',
        socketType: 'DeviceRef',
        ...(nullableDevice ? { nullable: true } : {}),
      },
      ...(includeServer ? [SERVER_OUT] : []),
      DATETIME_OUT,
    ],
  };
}

/**
 * Пины onTick Event в main/alarm loop: exec + deltatime + tickMs.
 */
export function loopTickEventNodePins(): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [],
    outputs: [EXEC_OUT, DELTATIME_OUT, TICK_MS_OUT],
  };
}

export interface CreateEventBoardNodeOptions {
  readonly id: string;
  readonly label?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly nullableDeviceOutput?: boolean;
  readonly includeServerOutput?: boolean;
}

/**
 * Фабрика системного узла Event — entry ветви-обработчика
 * (`onConnect/onStart/onStop/onDisconnect`). Узел неудаляем (`deletable:false`),
 * `blockKind:'custom'` — legacy-носитель формы; смысл несёт `nodeKind:'event'`.
 */
export function createEventBoardNode(options: CreateEventBoardNodeOptions): Node {
  const { inputs, outputs } = eventNodePins({
    nullableDeviceOutput: options.nullableDeviceOutput === true,
    includeServerOutput: options.includeServerOutput === true,
  });
  const data: BoardFlowNodeData = {
    label: options.label ?? 'Event',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: EVENT_NODE_KIND,
    eventVariant: 'handler',
    system: true,
    inputs,
    outputs,
  };
  return {
    id: options.id,
    type: 'board',
    position: options.position ?? { x: 40, y: 80 },
    deletable: false,
    data,
  };
}

export interface CreateLoopTickEventBoardNodeOptions {
  readonly id: string;
  readonly label?: string;
  readonly position?: { readonly x: number; readonly y: number };
}

/**
 * Фабрика onTick Event — entry main/alarm loop.
 */
export function createLoopTickEventBoardNode(options: CreateLoopTickEventBoardNodeOptions): Node {
  const { inputs, outputs } = loopTickEventNodePins();
  const data: BoardFlowNodeData = {
    label: options.label ?? 'onTick',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: EVENT_NODE_KIND,
    eventVariant: 'loopTick',
    system: true,
    inputs,
    outputs,
  };
  return {
    id: options.id,
    type: 'board',
    position: options.position ?? { x: 40, y: 80 },
    deletable: false,
    data,
  };
}

/** True, если нода — onTick Event в лупе. */
export function isLoopTickEventNode(node: Node): boolean {
  if (!isEventNode(node)) {
    return false;
  }
  return (node.data as BoardFlowNodeData).eventVariant === 'loopTick';
}

/** True, если нода — системный узел Event. */
export function isEventNode(node: Node): boolean {
  return isBoardFlowNodeData(node.data) && node.data.nodeKind === EVENT_NODE_KIND;
}

/** True, если узел системный (нельзя удалить с борда). */
export function isSystemNode(node: Node): boolean {
  return (node.data as { system?: boolean } | undefined)?.system === true;
}

/** True, если узел заблокирован от удаления (Event и прочие system / deletable:false). */
export function isLockedBoardNode(node: Node): boolean {
  if (node.deletable === false) {
    return true;
  }
  return isSystemNode(node);
}

function pinOptionsForBranch(handlerBranch: EventHandlerBranch): EventNodePinOptions {
  return {
    nullableDeviceOutput: handlerBranch === 'onDisconnect',
    includeServerOutput: handlerBranch === 'onConnect',
  };
}

/**
 * Синхронизирует пины Event-узлов с актуальной схемой ветви.
 * Идемпотентно для legacy-документов после десериализации.
 */
export function syncEventNodePins(
  nodes: readonly Node[],
  handlerBranch: EventHandlerBranch,
): Node[] {
  const { inputs, outputs } = eventNodePins(pinOptionsForBranch(handlerBranch));
  return nodes.map((node) => {
    if (!isEventNode(node) || isLoopTickEventNode(node)) {
      return node;
    }
    return {
      ...node,
      data: {
        ...(node.data as BoardFlowNodeData),
        inputs,
        outputs,
      },
    };
  });
}

/**
 * v0.4 (DBR3): отбрасывает `type:'remove'` для системных узлов (Event).
 */
export function rejectSystemNodeRemovals(
  changes: NodeChange[],
  nodes: readonly Node[],
): NodeChange[] {
  const lockedIds = new Set(nodes.filter(isLockedBoardNode).map((node) => node.id));
  if (lockedIds.size === 0) {
    return changes;
  }
  return changes.filter((change) => !(change.type === 'remove' && lockedIds.has(change.id)));
}

/**
 * Гарантирует наличие узла Event как entry ветви-обработчика.
 */
export function ensureEventEntry(
  entryId: string,
  nodes: readonly Node[],
  label?: string,
  options: EventNodePinOptions = {},
): Node[] {
  if (nodes.some((node) => isEventNode(node) && !isLoopTickEventNode(node))) {
    return [...nodes];
  }
  return [
    createEventBoardNode({
      id: entryId,
      label,
      nullableDeviceOutput: options.nullableDeviceOutput === true,
      includeServerOutput: options.includeServerOutput === true,
    }),
    ...nodes,
  ];
}

/**
 * Гарантирует onTick Event как entry main/alarm loop (миграция legacy entry).
 */
export function ensureLoopTickEntry(
  tickEntryId: string,
  bodyEntryId: string,
  nodes: readonly Node[],
  edges: readonly Edge[],
  label = 'onTick',
): { readonly nodes: Node[]; readonly edges: Edge[]; readonly entry: string } {
  const existingTick = nodes.find(isLoopTickEventNode);
  if (existingTick !== undefined) {
    const { inputs, outputs } = loopTickEventNodePins();
    const syncedNodes = nodes.map((node) => {
      if (!isLoopTickEventNode(node)) {
        return node;
      }
      return {
        ...node,
        data: { ...(node.data as BoardFlowNodeData), inputs, outputs },
      };
    });
    return { nodes: syncedNodes, edges: [...edges], entry: existingTick.id };
  }

  const tickNode = createLoopTickEventBoardNode({
    id: tickEntryId,
    label,
    position: { x: 40, y: 160 },
  });

  const redirectedEdges = edges.map((edge) => {
    if (edge.target === bodyEntryId && edge.targetHandle === 'exec-in') {
      return { ...edge, target: tickEntryId };
    }
    return edge;
  });

  const hasTickToBody = redirectedEdges.some(
    (edge) => edge.source === tickEntryId && edge.target === bodyEntryId,
  );
  const nextEdges = hasTickToBody
    ? redirectedEdges
    : [
        ...redirectedEdges,
        {
          id: `${tickEntryId}-to-${bodyEntryId}`,
          source: tickEntryId,
          sourceHandle: EVENT_EXEC_HANDLE,
          target: bodyEntryId,
          targetHandle: 'exec-in',
        },
      ];

  return {
    nodes: [tickNode, ...nodes],
    edges: nextEdges,
    entry: tickEntryId,
  };
}
