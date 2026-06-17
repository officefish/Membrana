import type { ScenarioBlockKind, SocketType } from '@membrana/core';

/** Семантика pin на ноде доски. */
export type BoardPinKind = 'exec' | 'data';

/** Описание входа/выхода ноды на канвасе. */
export interface BoardSocketPin {
  readonly name: string;
  readonly kind: BoardPinKind;
  readonly socketType?: SocketType;
}

/** Data payload ноды XYFlow на доске. */
export interface BoardFlowNodeData extends Record<string, unknown> {
  readonly label: string;
  readonly layer: 'signal' | 'scenario';
  readonly status?: 'active' | 'inactive' | 'missing' | 'invalid';
  /** Signal graph: id плагина из MembranaRegistry. */
  readonly pluginId?: string;
  /** Scenario graph: тип блока runtime. */
  readonly blockKind?: ScenarioBlockKind;
  /** Subgraph-блок: id функции из `scenario.functions`. */
  readonly functionId?: string;
  readonly inputs?: readonly BoardSocketPin[];
  readonly outputs?: readonly BoardSocketPin[];
}

export function isBoardFlowNodeData(data: Record<string, unknown>): data is BoardFlowNodeData {
  return (
    typeof data.label === 'string' &&
    (data.layer === 'signal' || data.layer === 'scenario')
  );
}
