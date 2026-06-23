import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import type { PairResponse, PairStatusLinked } from './pairing';

/** Maps cabinet pair response into persisted client credentials. */
export function pairResponseToCredentials(result: PairResponse): PairedNodeCredentials {
  return {
    token: result.token,
    expiresAt: result.expiresAt,
    deviceId: result.deviceId,
    mediaToken: result.mediaToken,
    mediaApiUrl: result.mediaApiUrl,
    membraneId: result.membrane.id,
    nodeId: result.node.id,
    nodeLabel: result.node.label,
    pairedKeyId: result.pairedKeyId,
    maxUserWorkspaces: result.tariff?.maxUserWorkspaces,
  };
}

/** Merges tariff quota from pair status poll into existing credentials. */
export function mergePairStatusTariff(
  pairing: PairedNodeCredentials,
  status: PairStatusLinked,
): PairedNodeCredentials {
  const nextQuota = status.tariff?.maxUserWorkspaces;
  if (nextQuota === undefined || nextQuota === pairing.maxUserWorkspaces) {
    return pairing;
  }
  return { ...pairing, maxUserWorkspaces: nextQuota };
}
