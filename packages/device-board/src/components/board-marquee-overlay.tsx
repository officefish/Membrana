import React from 'react';

import type { ScreenRect } from '../graph/marquee-selection.js';

export interface BoardMarqueeOverlayProps {
  readonly rect: ScreenRect | null;
}

/**
 * Полупрозрачный glass-rect marquee поверх канваса (CGF R0).
 */
export const BoardMarqueeOverlay: React.FC<BoardMarqueeOverlayProps> = ({ rect }) => {
  if (rect === null || (rect.width < 4 && rect.height < 4)) {
    return null;
  }

  return (
    <div
      className="pointer-events-none absolute z-20 rounded-md border border-primary/30 bg-primary/10 shadow-sm backdrop-blur-md"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
      aria-hidden="true"
    />
  );
};
