import type { ScenarioBlockKind, ScenarioNodeKind, SocketType } from '@membrana/core';

/** Семантика pin на ноде доски. */
export type BoardPinKind = 'exec' | 'data';

/** Описание входа/выхода ноды на канвасе. */
export interface BoardSocketPin {
  readonly name: string;
  readonly kind: BoardPinKind;
  readonly socketType?: SocketType;
  /** Data-порт допускает `null` (например onDisconnect Event). */
  readonly nullable?: boolean;
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
  /**
   * Scenario graph v0.4: вид узла новой таксономии (`variable-get`/`variable-set`
   * /`event`/…). Legacy D0-узлы поле не задают — рендер и сериализация идут
   * по `blockKind`. @see DEVICE_BOARD_CONCEPT.md §15
   */
  readonly nodeKind?: ScenarioNodeKind;
  /**
   * v0.4: системный узел (например `event`) — нельзя удалить с борда.
   * Рендер показывает признак системности, `applyNodeChanges` отбрасывает
   * `type:'remove'` для таких узлов. @see DEVICE_BOARD_CONCEPT.md §15
   */
  readonly system?: boolean;
  /** v0.4: для `variable-get`/`variable-set` — id связанной переменной сценария. */
  readonly variableId?: string;
  /** v0.4: для `get-microphone` — выбранный deviceId микрофона (enumerate). */
  readonly microphoneId?: string;
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
