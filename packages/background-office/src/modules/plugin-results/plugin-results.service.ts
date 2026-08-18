import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import type { PluginResultsStore, ReadRunsFilter, RunRecord, RunRecordView, StateRecord } from './plugin-results.types';

export const PLUGIN_RESULTS_STORE = Symbol('PLUGIN_RESULTS_STORE');
// Runtime mirror of @membrana/plugin-contracts/src/plugin-id.ts.
// background-office is CommonJS today, while plugin-contracts is ESM-only.
const PLUGIN_ID_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2}$/u;

function isPluginId(value: unknown): boolean {
  return typeof value === 'string' && PLUGIN_ID_PATTERN.test(value);
}

@Injectable()
export class PluginResultsService {
  constructor(@Inject(PLUGIN_RESULTS_STORE) private readonly store: PluginResultsStore) {}

  async writeRun(run: RunRecord, state: StateRecord): Promise<void> {
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
