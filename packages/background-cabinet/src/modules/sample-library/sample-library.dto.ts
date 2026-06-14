export interface NodeQuotaSummaryDto {
  userStorage: { usedBytes: number; limitBytes: number };
  buffer: { usedBytes: number; limitBytes: number };
  dataset: { catalogId: string; sampleCount: number };
}

export interface MembraneNodeLibraryDto {
  id: string;
  label: string;
  deviceId: string | null;
  paired: boolean;
  lastPairedAt: string | null;
  lastSeenAt: string | null;
  quota: NodeQuotaSummaryDto | null;
}

export interface MembraneCatalogSampleDto {
  id: string;
  title: string;
  class: string;
  label: string;
  durationSec: number;
  sampleRate: number;
  sizeBytes: number;
  createdAt: string;
}

export interface MembraneCatalogDto {
  catalogId: string;
  sampleCount: number;
  samples: MembraneCatalogSampleDto[];
  sourceDeviceId: string | null;
}

export interface MediaSessionDeviceDto {
  nodeId: string;
  nodeLabel: string;
  deviceId: string;
}

export interface MediaSessionDto {
  mediaApiUrl: string;
  mediaToken: string;
  membraneId: string;
  catalogId: string;
  devices: MediaSessionDeviceDto[];
}
