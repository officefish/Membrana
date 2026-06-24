import React from 'react';

import type { PreRunValidationIssue } from '../graph/index.js';

export interface BoardValidationBannerProps {
  readonly issues: readonly PreRunValidationIssue[];
  readonly successMessage: string | null;
}

/** Плашка pre-run validation под шапкой доски. */
export const BoardValidationBanner: React.FC<BoardValidationBannerProps> = ({
  issues,
  successMessage,
}) => {
  if (successMessage !== null) {
    return (
      <div className="border-b border-success/30 bg-success/10 px-4 py-2 text-xs text-success">
        {successMessage}
      </div>
    );
  }

  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-warning/30 bg-warning/10 px-4 py-2">
      <p className="text-xs font-semibold text-warning">Pre-run validation</p>
      <ul className="mt-1 list-inside list-disc text-xs text-base-content/80">
        {issues.map((issue) => (
          <li
            key={`${issue.code}-${issue.path ?? issue.message}`}
            title={issue.path ?? undefined}
          >
            {issue.message}
          </li>
        ))}
      </ul>
    </div>
  );
};
