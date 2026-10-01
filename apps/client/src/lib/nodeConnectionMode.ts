/** Режим связи полевого узла с Membrane Platform (MP3). */
export type NodeConnectionMode = 'autonomous' | 'paired';

export interface PairedNodeCredentials {
  token: string;
  expiresAt: string;
  deviceId: string;
  mediaToken: string;
  mediaApiUrl: string;
  membraneId: string;
  nodeId: string;
  nodeLabel: string;
  pairedKeyId?: string;
  /** Tariff-driven user workspace slot quota (U10 W4); fallback 3 when absent. */
  maxUserWorkspaces?: number;
  /**
   * Тариф мембраны по последнему слову кабинета (`/v1/pair` либо опрос `/v1/pair/status`, #2538).
   * Смена id — факт, который прибор обязан заметить: опрос идёт раз в 60 с, и сравнение требует
   * памяти о прошлом значении; без неё переход тарифа на приборе никем не замечался.
   */
  tariffId?: string;
}

export type PairingInvalidReason = 'revoked' | 'expired' | 'session_expired';
