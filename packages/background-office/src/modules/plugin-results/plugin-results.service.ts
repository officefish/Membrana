import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import type { PluginResultsStore, ReadRunsFilter, RunRecord, RunRecordView, StateRecord } from './plugin-results.types';

export const PLUGIN_RESULTS_STORE = Symbol('PLUGIN_RESULTS_STORE');

@Injectable()
export class PluginResultsService {
  constructor(@Inject(PLUGIN_RESULTS_STORE) private readonly store: PluginResultsStore) {}

  async writeRun(run: RunRecord, state: StateRecord): Promise<void> {
    const { isPluginId } = await import('@membrana/plugin-contracts');
    if (!isPluginId(run.address.pluginId) || !isPluginId(state.pluginId)) {
      throw new BadRequestException('Invalid plugin id');
    }
    await this.store.writeRun(run, state);
  }

  async readRuns(filter: ReadRunsFilter): Promise<RunRecordView[]> {
    const rows = await this.store.readRuns(filter);
    return rows.map((row) => ({
      ...row,
      stale: Boolean(filter.currentInputHash && row.fingerprints.inputHash !== filter.currentInputHash),
    }));
  }
}
