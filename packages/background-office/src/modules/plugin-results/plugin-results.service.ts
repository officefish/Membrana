import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import type { PluginResultsStore, ReadRunsFilter, RunRecord, RunRecordView, StateRecord } from './plugin-results.types';

export const PLUGIN_RESULTS_STORE = Symbol('PLUGIN_RESULTS_STORE');
type PluginContracts = { isPluginId(value: unknown): boolean };
let pluginContractsPromise: Promise<PluginContracts> | null = null;

function pluginContracts(): Promise<PluginContracts> {
  pluginContractsPromise ??= import('@membrana/plugin-contracts');
  return pluginContractsPromise;
}

@Injectable()
export class PluginResultsService {
  constructor(@Inject(PLUGIN_RESULTS_STORE) private readonly store: PluginResultsStore) {}

  async writeRun(run: RunRecord, state?: StateRecord): Promise<void> {
    const { isPluginId } = await pluginContracts();
    if (!isPluginId(run.address.pluginId) || (state && !isPluginId(state.pluginId))) {
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
