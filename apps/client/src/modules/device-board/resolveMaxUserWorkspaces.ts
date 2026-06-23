import type { NodeConnectionMode, PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import { FREE_V1_WORKSPACE_TARIFF, resolveWorkspaceTariff } from './workspace-tariff.js';

/** @deprecated Use FREE_V1_WORKSPACE_TARIFF.maxUserWorkspaces */
export const DEFAULT_MAX_USER_WORKSPACES = FREE_V1_WORKSPACE_TARIFF.maxUserWorkspaces;

/** Resolves editable workspace slot quota from pairing tariff or local free-v1 mirror. */
export function resolveMaxUserWorkspaces(
  mode: NodeConnectionMode | null,
  pairing: PairedNodeCredentials | null,
): number {
  return resolveWorkspaceTariff(mode, pairing).maxUserWorkspaces;
}
