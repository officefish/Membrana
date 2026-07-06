/**
 * Ресайз правого сайдбара доски: ширина тянется drag-ручкой на левой кромке,
 * ограничена минимумом (панель не схлопывается) и половиной viewport.
 */

export const RIGHT_SIDEBAR_MIN_WIDTH_PX = 240;

/** Максимум — половина экрана. */
export const RIGHT_SIDEBAR_MAX_WIDTH_RATIO = 0.5;

export const RIGHT_SIDEBAR_WIDTH_STORAGE_KEY = 'membrana.device-board.right-sidebar-width-px';

/** Ширина в границах [min, viewport/2]; при узком viewport минимум приоритетнее. */
export function clampRightSidebarWidth(widthPx: number, viewportWidthPx: number): number {
  const max = Math.max(
    RIGHT_SIDEBAR_MIN_WIDTH_PX,
    Math.floor(viewportWidthPx * RIGHT_SIDEBAR_MAX_WIDTH_RATIO),
  );
  return Math.min(Math.max(Math.round(widthPx), RIGHT_SIDEBAR_MIN_WIDTH_PX), max);
}

/** Парсинг сохранённой ширины из localStorage; мусор → null (дефолтная ширина). */
export function parseStoredRightSidebarWidth(raw: string | null): number | null {
  if (raw === null) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return Math.round(parsed);
}
