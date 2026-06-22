import React from 'react';

import type { BoardCanvasBreadcrumbSegment } from './board-context-breadcrumb.js';

export interface BoardCanvasBreadcrumbProps {
  readonly segments: readonly BoardCanvasBreadcrumbSegment[];
  /** Полный заголовок для tooltip (legacy `BRANCH_SCENARIO_TITLE`). */
  readonly detailTitle?: string;
}

/**
 * Breadcrumb контекста канваса в шапке device-board.
 */
export function BoardCanvasBreadcrumb({
  segments,
  detailTitle,
}: BoardCanvasBreadcrumbProps): React.ReactElement {
  return (
    <nav
      className="min-w-0 truncate text-[11px] leading-tight text-base-content/80"
      aria-label="Контекст канваса"
      title={detailTitle}
    >
      <ol className="flex min-w-0 items-center gap-1">
        {segments.map((segment, index) => (
          <li key={`${segment.label}-${index}`} className="flex min-w-0 items-center gap-1">
            {index > 0 ? (
              <span className="shrink-0 text-base-content/40" aria-hidden>
                ›
              </span>
            ) : null}
            <span className={index === segments.length - 1 ? 'truncate font-medium' : 'shrink-0'}>
              {segment.label}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
