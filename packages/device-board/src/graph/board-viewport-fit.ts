/** Префикс id ghost-нод exec-layout preview (не участвуют в fit). */
export const BOARD_LAYOUT_GHOST_NODE_ID_PREFIX = 'layout-ghost-';

export function isBoardLayoutGhostNodeId(nodeId: string): boolean {
  return nodeId.startsWith(BOARD_LAYOUT_GHOST_NODE_ID_PREFIX);
}

export const BOARD_VIEWPORT_FIT_PADDING = 0.22;
export const BOARD_VIEWPORT_FIT_MAX_ZOOM = 1.35;
export const BOARD_VIEWPORT_FIT_DURATION_MS = 220;
