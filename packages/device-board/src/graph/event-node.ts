import type { Node, NodeChange } from '@xyflow/react';

import type { BoardFlowNodeData, BoardSocketPin } from './board-node-data.js';
import { isBoardFlowNodeData } from './board-node-data.js';

/** Вид системного узла-обработчика события. */
export const EVENT_NODE_KIND = 'event' as const;

/** Имя exec-выхода узла Event (точка входа ветви-обработчика). */
export const EVENT_EXEC_HANDLE = 'exec-out' as const;

/** Имя data-выхода узла Event — ссылка на устройство (или `null` в onDisconnect). */
export const EVENT_DEVICE_HANDLE = 'device' as const;

const EXEC_OUT: BoardSocketPin = { name: EVENT_EXEC_HANDLE, kind: 'exec' };

/**
 * Пины узла Event: exec-выход (ведёт поток исполнения) + data-выход `DeviceRef`.
 *
 * Тип data-выхода — `DeviceRef` во всех четырёх обработчиках (единая типизация
 * для соединения с `set Device`). Значение `null` в `onDisconnect` различается на
 * уровне рантайма (DBR4), а не типом порта.
 */
export function eventNodePins(nullableDeviceOutput = false): {
  inputs: readonly BoardSocketPin[];
  outputs: readonly BoardSocketPin[];
} {
  return {
    inputs: [],
    outputs: [
      EXEC_OUT,
      {
        name: EVENT_DEVICE_HANDLE,
        kind: 'data',
        socketType: 'DeviceRef',
        ...(nullableDeviceOutput ? { nullable: true } : {}),
      },
    ],
  };
}

export interface CreateEventBoardNodeOptions {
  readonly id: string;
  readonly label?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly nullableDeviceOutput?: boolean;
}

/**
 * Фабрика системного узла Event — entry ветви-обработчика
 * (`onConnect/onStart/onStop/onDisconnect`). Узел неудаляем (`deletable:false`),
 * `blockKind:'custom'` — legacy-носитель формы; смысл несёт `nodeKind:'event'`.
 */
export function createEventBoardNode(options: CreateEventBoardNodeOptions): Node {
  const { inputs, outputs } = eventNodePins(options.nullableDeviceOutput === true);
  const data: BoardFlowNodeData = {
    label: options.label ?? 'Event',
    layer: 'scenario',
    status: 'active',
    blockKind: 'custom',
    nodeKind: EVENT_NODE_KIND,
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

/**
 * v0.4 (DBR3): отбрасывает `type:'remove'` для системных узлов (Event).
 * Применяется в обработчиках `onNodesChange` обработчиков событий, чтобы entry
 * нельзя было удалить через UI-изменения XYFlow.
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
 * Гарантирует наличие узла Event как entry ветви-обработчика: если событийного
 * узла нет (legacy/мигрированный документ), добавляет его в начало с фикс-id `entryId`.
 * Идемпотентно: при наличии Event-узла список не меняется.
 */
export function ensureEventEntry(
  entryId: string,
  nodes: readonly Node[],
  label?: string,
  nullableDeviceOutput = false,
): Node[] {
  if (nodes.some((node) => isEventNode(node))) {
    return [...nodes];
  }
  return [createEventBoardNode({ id: entryId, label, nullableDeviceOutput }), ...nodes];
}
