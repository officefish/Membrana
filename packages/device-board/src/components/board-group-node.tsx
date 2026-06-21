import React from 'react';
import type { NodeProps } from '@xyflow/react';

import type { BoardGroupNodeData } from '../graph/comment-group.js';
import { resolveCommentGroupFrameVisual } from '../graph/comment-group-frame-color.js';

/**
 * Comment group frame (CGF G1): dashed border, title в хедере над рамкой,
 * description в футере под рамкой — не участвует в runtime.
 */
export const BoardGroupNode: React.FC<NodeProps> = ({ data, selected }) => {
  const groupData = data as BoardGroupNodeData;
  const title = typeof groupData.title === 'string' ? groupData.title : 'Группа';
  const description =
    typeof groupData.description === 'string' && groupData.description.length > 0
      ? groupData.description
      : null;
  const visual = resolveCommentGroupFrameVisual(groupData.frameColor);

  return (
    <div className="relative h-full w-full overflow-visible">
      <header
        className={`absolute bottom-full left-0 mb-1 max-w-full rounded-md px-2 py-0.5 ${visual.headerClassName}`}
        style={visual.headerStyle}
      >
        <span className="block truncate text-xs font-semibold">{title}</span>
      </header>

      <div
        className={`box-border h-full w-full min-h-[7.5rem] min-w-[10rem] rounded-lg border-2 border-dashed ${visual.frameClassName} ${
          selected
            ? visual.ringClassName.length > 0
              ? `ring-2 ${visual.ringClassName}`
              : ''
            : ''
        }`}
        style={{
          ...visual.frameStyle,
          ...(selected ? visual.ringStyle : undefined),
        }}
      />

      {description !== null ? (
        <footer
          className={`absolute left-0 top-full mt-1 max-w-full rounded-md px-2 py-0.5 ${visual.footerClassName}`}
          style={visual.footerStyle}
        >
          <p className={`line-clamp-4 text-[10px] leading-snug ${visual.footerClassName}`} style={visual.footerStyle}>
            {description}
          </p>
        </footer>
      ) : null}
    </div>
  );
};
