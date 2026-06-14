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
}
