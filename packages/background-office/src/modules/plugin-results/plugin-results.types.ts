import type { PluginId, RunRecord, RunRecordView, StateRecord } from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };

export type { RunRecord, RunRecordView, StateRecord };

export interface ReadRunsFilter {
  pluginId?: PluginId;
  version?: string;
  collectionId: string;
  kind?: RunRecord['kind'];
  currentInputHash?: string;
  limit?: number;
}

export interface PluginResultsStore {
  writeRun(run: RunRecord, state?: StateRecord): Promise<void>;
  readRuns(filter: ReadRunsFilter): Promise<RunRecord[]>;
}
