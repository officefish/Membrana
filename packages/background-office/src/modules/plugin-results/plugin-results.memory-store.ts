import { Injectable } from '@nestjs/common';

import type { PluginResultsStore, ReadRunsFilter, RunRecord, StateRecord } from './plugin-results.types';

type RunKey = Pick<RunRecord['address'], 'pluginId' | 'version' | 'collectionId' | 'runId'>;

function keyOf(key: RunKey): string {
  return `${key.pluginId}|${key.version}|${key.collectionId}|${key.runId}`;
}

function runKeyOf(run: RunRecord): string {
  return keyOf(run.address);
}

@Injectable()
export class MemoryPluginResultsStore implements PluginResultsStore {
  private readonly runs = new Map<string, RunRecord>();
  private readonly states = new Map<string, StateRecord>();

  async writeRun(run: RunRecord, state?: StateRecord): Promise<void> {
    this.runs.set(runKeyOf(run), { ...run });
    if (!state) return;
    this.states.set(
      keyOf({
        pluginId: state.pluginId,
        version: state.version,
        collectionId: state.collectionId,
        runId: run.address.runId,
      }),
      { ...state },
    );
  }

  async readRuns(filter: ReadRunsFilter): Promise<RunRecord[]> {
    const limit = filter.limit ?? 50;
    return [...this.runs.values()]
      .filter((run) => run.address.collectionId === filter.collectionId)
      .filter((run) => !filter.pluginId || run.address.pluginId === filter.pluginId)
      .filter((run) => !filter.version || run.address.version === filter.version)
      .filter((run) => !filter.kind || run.kind === filter.kind)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
      .slice(0, limit)
      .map((run) => ({ ...run }));
  }
}
