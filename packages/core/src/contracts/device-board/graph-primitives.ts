/**
 * Общие примитивы сериализованного графа (XYFlow-compatible positions).
 */

/** Позиция ноды на канвасе. */
export interface GraphPosition {
  readonly x: number;
  readonly y: number;
}

/** Базовый идентификатор ноды в JSON графа. */
export type GraphNodeId = string;
