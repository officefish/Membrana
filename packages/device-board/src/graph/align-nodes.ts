import type { Node } from '@xyflow/react';

import { BOARD_NODE_MARQUEE_HEIGHT, BOARD_NODE_MARQUEE_WIDTH, nodeFlowBounds } from './marquee-selection.js';

/** Команды выравнивания MVP (Rodchenko A0). */
export type BoardAlignMode =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'center-h'
  | 'center-v'
  | 'distribute-h'
  | 'distribute-v';

export const BOARD_ALIGN_GAP_PX = 24;

/** Модульная сетка канваса (DESIGN.md § «Сетка и отступы»). */
export const BOARD_LAYOUT_GRID_PX = 8;

/** Подписи режимов выравнивания (A0 modal). */
export const BOARD_ALIGN_MODE_LABELS: Record<BoardAlignMode, string> = {
  left: 'По левому краю',
  right: 'По правому краю',
  top: 'По верху',
  bottom: 'По низу',
  'center-h': 'По центру (гор.)',
  'center-v': 'По центру (верт.)',
  'distribute-h': 'Распределить гор.',
  'distribute-v': 'Распределить верт.',
};

/** Порядок кнопок в modal submenu. */
export const BOARD_ALIGN_MODES_BASIC: readonly BoardAlignMode[] = [
  'left',
  'right',
  'top',
  'bottom',
  'center-h',
  'center-v',
];

export const BOARD_ALIGN_MODES_DISTRIBUTE: readonly BoardAlignMode[] = [
  'distribute-h',
  'distribute-v',
];

function requiresThreeNodes(mode: BoardAlignMode): boolean {
  return mode === 'distribute-h' || mode === 'distribute-v';
}

/** Можно ли применить режим к selection count. */
export function isBoardAlignModeEnabled(mode: BoardAlignMode, selectedCount: number): boolean {
  if (selectedCount < 2) {
    return false;
  }
  if (requiresThreeNodes(mode)) {
    return selectedCount >= 3;
  }
  return true;
}

function snapToLayoutGrid(value: number): number {
  return Math.round(value / BOARD_LAYOUT_GRID_PX) * BOARD_LAYOUT_GRID_PX;
}

/** Привязка координаты канваса к модульной сетке (DESIGN.md). */
export function snapBoardLayoutCoordinate(value: number): number {
  return snapToLayoutGrid(value);
}

function selectedNodes(nodes: readonly Node[], selectedIds: ReadonlySet<string>): Node[] {
  return nodes.filter((node) => selectedIds.has(node.id));
}

/** Новые top-left позиции для выбранных узлов (остальные не трогаем). */
export function computeAlignPositions(
  nodes: readonly Node[],
  selectedIds: ReadonlySet<string>,
  mode: BoardAlignMode,
): Map<string, { readonly x: number; readonly y: number }> {
  const picked = selectedNodes(nodes, selectedIds);
  const out = new Map<string, { readonly x: number; readonly y: number }>();
  if (picked.length === 0) {
    return out;
  }

  const bounds = picked.map((node) => ({ node, box: nodeFlowBounds(node) }));

  const minX = Math.min(...bounds.map((item) => item.box.x));
  const maxX = Math.max(...bounds.map((item) => item.box.x + item.box.width));
  const minY = Math.min(...bounds.map((item) => item.box.y));
  const maxY = Math.max(...bounds.map((item) => item.box.y + item.box.height));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  if (mode === 'distribute-h') {
    if (picked.length < 3) {
      return out;
    }
    const sorted = [...bounds].sort((a, b) => a.box.x - b.box.x);
    const totalWidth = sorted.reduce((sum, item) => sum + item.box.width, 0);
    const span = maxX - minX - totalWidth;
    const gap = span / (sorted.length - 1);
    let cursor = minX;
    for (const item of sorted) {
      out.set(item.node.id, { x: cursor, y: item.node.position.y });
      cursor += item.box.width + gap;
    }
    return out;
  }

  if (mode === 'distribute-v') {
    if (picked.length < 3) {
      return out;
    }
    const sorted = [...bounds].sort((a, b) => a.box.y - b.box.y);
    const totalHeight = sorted.reduce((sum, item) => sum + item.box.height, 0);
    const span = maxY - minY - totalHeight;
    const gap = span / (sorted.length - 1);
    let cursor = minY;
    for (const item of sorted) {
      out.set(item.node.id, { x: item.node.position.x, y: cursor });
      cursor += item.box.height + gap;
    }
    return out;
  }

  for (const { node, box } of bounds) {
    let x = node.position.x;
    let y = node.position.y;
    switch (mode) {
      case 'left':
        x = minX;
        break;
      case 'right':
        x = maxX - box.width;
        break;
      case 'top':
        y = minY;
        break;
      case 'bottom':
        y = maxY - box.height;
        break;
      case 'center-h':
        x = centerX - box.width / 2;
        break;
      case 'center-v':
        y = centerY - box.height / 2;
        break;
      default:
        break;
    }
    out.set(node.id, { x, y });
  }

  return out;
}

/**
 * Умное выравнивание без выбора режима: по композиции selection bbox
 * (горизонтальный поток → distribute-h + top; вертикальный → distribute-v + left;
 * пара узлов → общий ряд/колонка) + привязка к сетке 8 px.
 */
export function computeSmartAlignPositions(
  nodes: readonly Node[],
  selectedIds: ReadonlySet<string>,
): Map<string, { readonly x: number; readonly y: number }> {
  const picked = selectedNodes(nodes, selectedIds);
  if (picked.length < 2) {
    return new Map();
  }

  const bounds = picked.map((node) => ({ node, box: nodeFlowBounds(node) }));
  const minX = Math.min(...bounds.map((item) => item.box.x));
  const maxX = Math.max(...bounds.map((item) => item.box.x + item.box.width));
  const minY = Math.min(...bounds.map((item) => item.box.y));
  const maxY = Math.max(...bounds.map((item) => item.box.y + item.box.height));
  const widthSpan = maxX - minX;
  const heightSpan = maxY - minY;
  const horizontal = widthSpan >= heightSpan;

  if (picked.length === 2) {
    const rowOrCol = computeAlignPositions(
      nodes,
      selectedIds,
      horizontal ? 'top' : 'left',
    );
    const out = new Map<string, { readonly x: number; readonly y: number }>();
    for (const { node } of bounds) {
      const aligned = rowOrCol.get(node.id);
      if (aligned === undefined) {
        continue;
      }
      out.set(node.id, {
        x: snapToLayoutGrid(horizontal ? node.position.x : aligned.x),
        y: snapToLayoutGrid(horizontal ? aligned.y : node.position.y),
      });
    }
    return out;
  }

  const primaryMode: BoardAlignMode = horizontal ? 'distribute-h' : 'distribute-v';
  const secondaryMode: BoardAlignMode = horizontal ? 'top' : 'left';

  const primary = computeAlignPositions(nodes, selectedIds, primaryMode);
  const secondary = computeAlignPositions(nodes, selectedIds, secondaryMode);

  const out = new Map<string, { readonly x: number; readonly y: number }>();
  for (const id of selectedIds) {
    const primaryPos = primary.get(id);
    if (primaryPos === undefined) {
      continue;
    }
    const secondaryPos = secondary.get(id);
    const x = snapToLayoutGrid(horizontal ? primaryPos.x : (secondaryPos?.x ?? primaryPos.x));
    const y = snapToLayoutGrid(horizontal ? (secondaryPos?.y ?? primaryPos.y) : primaryPos.y);
    out.set(id, { x, y });
  }

  return out;
}

/** Fallback размеры для тестов без measured. */
export function estimateNodeSize(node: Node): { readonly width: number; readonly height: number } {
  return {
    width: node.measured?.width ?? BOARD_NODE_MARQUEE_WIDTH,
    height: node.measured?.height ?? BOARD_NODE_MARQUEE_HEIGHT,
  };
}
