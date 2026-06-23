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
}

export type PairingInvalidReason = 'revoked' | 'expired' | 'session_expired';
