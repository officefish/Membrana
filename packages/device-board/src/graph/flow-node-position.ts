/** Примерные размеры узла board-flow для центрирования в viewport. */
export const BOARD_NODE_LAYOUT_WIDTH = 160;
export const BOARD_NODE_LAYOUT_HEIGHT = 56;

/** Смещает top-left так, чтобы центр узла попал в `flowCenter`. */
export function centerNodePositionAtFlowPoint(flowCenter: {
  readonly x: number;
  readonly y: number;
}): { readonly x: number; readonly y: number } {
  return {
    x: flowCenter.x - BOARD_NODE_LAYOUT_WIDTH / 2,
    y: flowCenter.y - BOARD_NODE_LAYOUT_HEIGHT / 2,
  };
}
