import type { PluginId, ReportManifest } from '@membrana/plugin-contracts';

export const DETECTOR_BATCH_MANIFEST: ReportManifest = {
  id: 'membrana.report.detector-batch' as PluginId,
  version: '0.1.0',
  kind: 'report',
  mountTarget: 'background-media/collections',
  triggers: ['collections.collection_created'],
};

export const DETECTOR_BATCH_ID = DETECTOR_BATCH_MANIFEST.id;
