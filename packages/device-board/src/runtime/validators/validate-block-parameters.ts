import type { ScenarioGraphNode, ScenarioSubgraph } from '@membrana/core';

import type { UserCaseValidationError } from './types.js';

const RECORDING_WINDOW_SEC = new Set([3, 5, 7, 10, 15, 30]);
const RECORDING_FORMATS = new Set(['wav', 'webm', 'mp4']);

function validateNodeParameters(
  node: ScenarioGraphNode,
  pathPrefix: string,
): readonly UserCaseValidationError[] {
  const issues: UserCaseValidationError[] = [];
  const policy = node.recordingPolicy;
  if (policy !== undefined) {
    if (!RECORDING_WINDOW_SEC.has(policy.windowSec)) {
      issues.push({
        code: 'recording-policy-window',
        message: `Узел «${node.id}»: недопустимый windowSec ${policy.windowSec}`,
        blockId: node.id,
        path: `${pathPrefix}/nodes/${node.id}/recordingPolicy.windowSec`,
      });
    }
    if (!RECORDING_FORMATS.has(policy.captureFormat)) {
      issues.push({
        code: 'recording-policy-format',
        message: `Узел «${node.id}»: недопустимый captureFormat «${policy.captureFormat}»`,
        blockId: node.id,
        path: `${pathPrefix}/nodes/${node.id}/recordingPolicy.captureFormat`,
      });
    }
  }
  return issues;
}

/**
 * Parameter bounds for policy constructors (DSP chain rules — Phase 4 extension point).
 */
export function validateBlockParameters(
  subgraph: ScenarioSubgraph,
  pathPrefix: string,
): readonly UserCaseValidationError[] {
  return subgraph.nodes.flatMap((node) => validateNodeParameters(node, pathPrefix));
}
