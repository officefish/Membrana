/**
 * Каталог типов сокетов signal graph.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §5.1
 */

/** Все известные типы сокетов (расширяется через PR в core). */
export const SOCKET_TYPES = [
  'AudioFrame',
  'Spectrum',
  'Detection',
  'TDOAPair',
  'IQSamples',
  'RFSignature',
  'ThermalFrame',
  'BlobMask',
  'Observation',
] as const;

/** Имя типа сокета signal graph. */
export type SocketType = (typeof SOCKET_TYPES)[number];

/** Минимальный набор для хакатона 1 / D0. */
export const D0_SOCKET_TYPES = ['AudioFrame', 'Spectrum'] as const satisfies readonly SocketType[];

/** Описание pin на ноде signal graph. */
export interface SocketSpec {
  readonly name: string;
  readonly socketType: SocketType;
}

/** Type guard для `SocketType`. */
export function isSocketType(value: string): value is SocketType {
  return (SOCKET_TYPES as readonly string[]).includes(value);
}

/**
 * Совместимость data-соединения signal graph: только одинаковые типы.
 * Exec-рёбра scenario graph валидируются отдельно.
 */
export function isValidSocketConnection(source: SocketType, target: SocketType): boolean {
  return source === target;
}
