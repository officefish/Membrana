import type { Edge } from '@xyflow/react';

import type { PreRunValidationIssue } from '../../graph/validate-pre-run.js';

import type { UserCaseValidationError } from './types.js';

const QUOTED_ID = /«([^»]+)»/u;

/** Maps runtime validator errors to graph pre-run issues (banner + Run gating). */
export function userCaseErrorsToPreRunIssues(
  errors: readonly UserCaseValidationError[],
): readonly PreRunValidationIssue[] {
  return errors.map((error) => ({
    code: error.code,
    message: error.message,
    path: error.path ?? error.blockId,
    severity: error.severity,
  }));
}

function mergeUniqueIssues(
  primary: readonly PreRunValidationIssue[],
  extra: readonly PreRunValidationIssue[],
): readonly PreRunValidationIssue[] {
  const seen = new Set(primary.map((issue) => `${issue.code}|${issue.path ?? ''}|${issue.message}`));
  const merged = [...primary];
  for (const issue of extra) {
    const key = `${issue.code}|${issue.path ?? ''}|${issue.message}`;
    if (!seen.has(key)) {
      merged.push(issue);
      seen.add(key);
    }
  }
  return merged;
}

/** Merges graph pre-run issues with document-level runtime validators. */
export function mergePreRunWithUserCaseDocumentIssues(
  preRunIssues: readonly PreRunValidationIssue[],
  documentErrors: readonly UserCaseValidationError[],
): readonly PreRunValidationIssue[] {
  return mergeUniqueIssues(preRunIssues, userCaseErrorsToPreRunIssues(documentErrors));
}

/** Node ids to highlight on canvas from validation issues (errors only). */
export function collectValidationErrorNodeIds(
  issues: readonly PreRunValidationIssue[],
  edges: readonly Edge[],
): ReadonlySet<string> {
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const ids = new Set<string>();

  for (const issue of issues) {
    if (issue.severity === 'warning') {
      continue;
    }
    const quoted = QUOTED_ID.exec(issue.message);
    if (quoted?.[1] !== undefined) {
      ids.add(quoted[1]);
    }
    if (issue.path?.includes('/edges/') === true) {
      const edgeKey = issue.path.split('/edges/')[1]?.split('/')[0];
      if (edgeKey !== undefined) {
        const matched = edges.find(
          (edge) =>
            edgeKey === edge.id ||
            edgeKey === `${edge.source}-${edge.target}-exec` ||
            edgeKey === `${edge.source}-${edge.target}-data` ||
            edgeKey.startsWith(`${edge.source}-${edge.target}-`),
        );
        if (matched !== undefined) {
          ids.add(matched.source);
          ids.add(matched.target);
        }
      }
      const byId = edgeById.get(edgeKey ?? '');
      if (byId !== undefined) {
        ids.add(byId.source);
        ids.add(byId.target);
      }
    }
  }

  return ids;
}
