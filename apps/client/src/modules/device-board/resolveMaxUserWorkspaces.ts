import type { NodeConnectionMode, PairedNodeCredentials } from '@/lib/nodeConnectionMode';

/** Free-tier default when autonomous or cabinet field is absent (U10 W4 fallback). */
export const DEFAULT_MAX_USER_WORKSPACES = 3;

/** Resolves editable workspace slot quota from pairing tariff or local default. */
export function resolveMaxUserWorkspaces(
  mode: NodeConnectionMode | null,
  pairing: PairedNodeCredentials | null,
): number {
  if (mode !== 'paired' || pairing === null) {
    return DEFAULT_MAX_USER_WORKSPACES;
  }
  const value = pairing.maxUserWorkspaces;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 1) {
    return Math.floor(value);
  }
  return DEFAULT_MAX_USER_WORKSPACES;
}
