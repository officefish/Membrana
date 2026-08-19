import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import type { PluginResultsStore, ReadRunsFilter, RunRecord, RunRecordView, StateRecord } from './plugin-results.types';

export const PLUGIN_RESULTS_STORE = Symbol('PLUGIN_RESULTS_STORE');
export type PluginContracts = { isPluginId(value: unknown): boolean };

@Injectable()
export class PluginResultsService {
  /**
   * Обещание импорта — поле экземпляра, не модульный `let` (тот же узор, что был в хосте
   * collections; снят одним приёмом в обоих домах, спринт contour-sanity #1972). Ошибка импорта
   * сбрасывает кеш: раньше отказ залипал на весь процесс.
   */
  private contractsPromise: Promise<PluginContracts> | null = null;

  constructor(@Inject(PLUGIN_RESULTS_STORE) private readonly store: PluginResultsStore) {}

  /** Шов загрузки контрактов: тест подменяет наследником. */
  protected loadContracts(): Promise<PluginContracts> {
    return import('@membrana/plugin-contracts');
  }

  private pluginContracts(): Promise<PluginContracts> {
    this.contractsPromise ??= this.loadContracts().catch((error: unknown) => {
      this.contractsPromise = null;
      throw error;
    });
    return this.contractsPromise;
  }

  async writeRun(run: RunRecord, state?: StateRecord): Promise<void> {
    const { isPluginId } = await this.pluginContracts();
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
