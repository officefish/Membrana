import {
  BRANCH_TAB_LABEL,
  type BoardLayerTab,
  type ScenarioBranchTab,
} from '../types/board-ui.js';

/** Один сегмент breadcrumb в шапке канваса. */
export interface BoardCanvasBreadcrumbSegment {
  readonly label: string;
}

export interface BuildBoardCanvasBreadcrumbInput {
  readonly layer: BoardLayerTab;
  readonly scenarioBranch: ScenarioBranchTab;
  /** Имя активной пользовательской функции (только на ветке `function`). */
  readonly functionName?: string | null;
}

const DEFAULT_FUNCTION_NAME = 'Без имени';

/**
 * Сегменты breadcrumb для шапки device-board (F1).
 * Signal — один сегмент; scenario — `Сценарий › branch`; function — `Функция › name`.
 */
export function buildBoardCanvasBreadcrumb(
  input: BuildBoardCanvasBreadcrumbInput,
): readonly BoardCanvasBreadcrumbSegment[] {
  if (input.layer === 'signal') {
    return [{ label: 'Сигнал' }];
  }
  if (input.scenarioBranch === 'function') {
    const name = input.functionName?.trim();
    return [
      { label: 'Функция' },
      { label: name !== undefined && name.length > 0 ? name : DEFAULT_FUNCTION_NAME },
    ];
  }
  return [{ label: 'Сценарий' }, { label: BRANCH_TAB_LABEL[input.scenarioBranch] }];
}
