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
    tariffId: result.tariff?.id,
  };
}

/**
 * Merges tariff (id + workspace quota) from pair status poll into existing credentials.
 *
 * #2538: id тарифа сливается наравне с квотой рабочих пространств. Новая ссылка означает «тариф
 * сменился» — монитор сопряжения применяет её, и цикл опроса перезапускается сразу, перечитывая
 * предел прибора (`tryUpgradeMediaLibraryToRemote` → `refreshQuota`). Поле, которого в ответе нет,
 * не трогает сохранённое; равные значения → тот же объект (identity по Object.is).
 */
export function mergePairStatusTariff(
  pairing: PairedNodeCredentials,
  status: PairStatusLinked,
): PairedNodeCredentials {
  const nextQuota = status.tariff?.maxUserWorkspaces;
  const nextTariffId = status.tariff?.id;
  const quotaChanged = nextQuota !== undefined && nextQuota !== pairing.maxUserWorkspaces;
  const tariffChanged = nextTariffId !== undefined && nextTariffId !== pairing.tariffId;
  if (!quotaChanged && !tariffChanged) {
    return pairing;
  }
  return {
    ...pairing,
    ...(quotaChanged ? { maxUserWorkspaces: nextQuota } : {}),
    ...(tariffChanged ? { tariffId: nextTariffId } : {}),
  };
}
