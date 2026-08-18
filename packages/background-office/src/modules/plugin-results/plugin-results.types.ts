export type PluginResultKind = 'state' | 'report' | 'artifact';

export interface RunRecord {
  pluginId: string;
  version: string;
  collectionId: string;
  runId: string;
  kind: PluginResultKind;
  completedAt: string;
  inputHash: string;
  payload: unknown;
}

export interface StateRecord {
  pluginId: string;
  version: string;
  collectionId: string;
  runId: string;
  kind: PluginResultKind;
  completedAt: string;
  inputHash: string;
  state: unknown;
}

export interface RunRecordView extends RunRecord {
  stale: boolean;
}

export interface ReadRunsFilter {
  pluginId?: string;
  version?: string;
  collectionId: string;
  kind?: PluginResultKind;
  currentInputHash?: string;
  limit?: number;
}

export interface PluginResultsStore {
  writeRun(run: RunRecord, state: StateRecord): Promise<void>;
  readRuns(filter: ReadRunsFilter): Promise<RunRecord[]>;
}
