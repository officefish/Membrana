import React from 'react';
import { useViewport } from '@xyflow/react';

import type { FlowGuideLine } from '../graph/layout-snap-guides.js';

export interface BoardSnapGuidesOverlayProps {
  readonly guides: readonly FlowGuideLine[];
}

/**
 * Figma-like alignment guides при drag (NAA L3).
 * Рендер в screen space через viewport transform.
 */
export const BoardSnapGuidesOverlay: React.FC<BoardSnapGuidesOverlayProps> = ({ guides }) => {
  const { x, y, zoom } = useViewport();

  if (guides.length === 0) {
    return null;
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible"
      aria-hidden
    >
      {guides.map((guide, index) => {
        if (guide.orientation === 'vertical') {
          const screenX = guide.value * zoom + x;
          return (
            <line
              key={`v-${index}-${guide.value}`}
              x1={screenX}
              y1={0}
              x2={screenX}
              y2="100%"
              stroke="oklch(var(--p))"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.85}
            />
          );
        }
        const screenY = guide.value * zoom + y;
        return (
          <line
            key={`h-${index}-${guide.value}`}
            x1={0}
            y1={screenY}
            x2="100%"
            y2={screenY}
            stroke="oklch(var(--p))"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
};
