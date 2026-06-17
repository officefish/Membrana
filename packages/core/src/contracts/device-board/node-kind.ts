/**
 * Метаданные ноды плагина на signal graph.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §6.2
 */

import type { DeviceKind } from './device-kind.js';
import type { SocketSpec } from './socket-type.js';

/** Категория ноды в топологии прибора. */
export type NodeKindCategory = 'source' | 'analyzer' | 'detector' | 'transport' | 'terminal';

/**
 * Описание ноды для палитры device-board (из `MembranaRegistry`).
 * Опционально на регистрации плагина.
 */
export interface PluginNodeKind {
  readonly category: NodeKindCategory;
  readonly deviceKinds: readonly DeviceKind[];
  readonly inputs: readonly SocketSpec[];
  readonly outputs: readonly SocketSpec[];
}
