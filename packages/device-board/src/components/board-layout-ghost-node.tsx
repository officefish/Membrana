import React from 'react';
import type { NodeProps } from '@xyflow/react';

export interface BoardLayoutGhostNodeData {
  readonly label: string;
  readonly width: number;
  readonly height: number;
}

/** Полупрозрачный preview узла при exec auto-layout (NAA L2). */
export const BoardLayoutGhostNode: React.FC<NodeProps> = ({ data }) => {
  const ghost = data as unknown as BoardLayoutGhostNodeData;
  return (
    <div
      className="pointer-events-none rounded-lg border-2 border-dashed border-primary/60 bg-primary/15 px-2 py-1 shadow-sm"
      style={{ width: ghost.width, height: ghost.height, minWidth: 120, minHeight: 48 }}
      aria-hidden
    >
      <p className="truncate text-[10px] font-medium text-primary">{ghost.label}</p>
      <p className="text-[9px] text-primary/70">preview</p>
    </div>
  );
};
