import type { PluginId, RunRecord, RunRecordView, StateRecord } from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };

export type { RunRecord, RunRecordView, StateRecord };

export interface ReadRunsFilter {
  pluginId?: PluginId;
  version?: string;
  collectionId: string;
  kind?: RunRecord['kind'];
  currentInputHash?: string;
  /**
   * Только положительное целое. Инвариант держит ВХОД (PluginResultsController.readRuns: `0` и
   * мусор отбрасываются до фильтра) — тип его не выражает, и это принятое решение ревью PR #1981:
   * branded-number ради одного поля не заводится. У Mongo `limit: 0` значит «без лимита».
   */
  limit?: number;
}

export interface PluginResultsStore {
  writeRun(run: RunRecord, state?: StateRecord): Promise<void>;
  readRuns(filter: ReadRunsFilter): Promise<RunRecord[]>;
}
