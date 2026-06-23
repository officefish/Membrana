import type { NodeConnectionMode, PairedNodeCredentials } from '@/lib/nodeConnectionMode';

/** Mirrors cabinet/media `free-v1` workspace slot quota (autonomous + pair fallback). */
export const FREE_V1_WORKSPACE_TARIFF = {
  sku: 'free-v1',
  maxUserWorkspaces: 3,
} as const;

export interface WorkspaceTariff {
  readonly sku: string;
  readonly maxUserWorkspaces: number;
  /** `paired` — from cabinet pair/status; `local` — offline autonomous mirror of free-v1. */
  readonly source: 'paired' | 'local';
}

/** Resolves editable workspace quota: server tariff when paired, else local free-v1 mirror. */
export function resolveWorkspaceTariff(
  mode: NodeConnectionMode | null,
  pairing: PairedNodeCredentials | null,
): WorkspaceTariff {
  if (mode !== 'paired' || pairing === null) {
    return { ...FREE_V1_WORKSPACE_TARIFF, source: 'local' };
  }
  const fromPair = pairing.maxUserWorkspaces;
  if (typeof fromPair === 'number' && Number.isFinite(fromPair) && fromPair >= 1) {
    return {
      sku: FREE_V1_WORKSPACE_TARIFF.sku,
      maxUserWorkspaces: Math.floor(fromPair),
      source: 'paired',
    };
  }
  return { ...FREE_V1_WORKSPACE_TARIFF, source: 'local' };
}

export function formatWorkspaceQuotaMessage(used: number, max: number): string {
  return `Достигнут лимит тарифа: ${used}/${max} user workspace. Удалите сценарий, чтобы освободить слот.`;
}
