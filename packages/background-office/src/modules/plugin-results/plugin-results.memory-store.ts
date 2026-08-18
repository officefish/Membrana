import { Injectable } from '@nestjs/common';

import type { PluginResultsStore, ReadRunsFilter, RunRecord, StateRecord } from './plugin-results.types';

function keyOf(run: Pick<RunRecord, 'pluginId' | 'version' | 'collectionId' | 'runId'>): string {
  return `${run.pluginId}\u0000${run.version}\u0000${run.collectionId}\u0000${run.runId}`;
}

@Injectable()
export class MemoryPluginResultsStore implements PluginResultsStore {
  private readonly runs = new Map<string, RunRecord>();
  private readonly states = new Map<string, StateRecord>();

  async writeRun(run: RunRecord, state: StateRecord): Promise<void> {
    this.runs.set(keyOf(run), { ...run });
    this.states.set(keyOf(state), { ...state });
  }

  async readRuns(filter: ReadRunsFilter): Promise<RunRecord[]> {
    const limit = filter.limit ?? 50;
    return [...this.runs.values()]
      .filter((run) => run.collectionId === filter.collectionId)
      .filter((run) => !filter.pluginId || run.pluginId === filter.pluginId)
      .filter((run) => !filter.version || run.version === filter.version)
      .filter((run) => !filter.kind || run.kind === filter.kind)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
      .slice(0, limit)
      .map((run) => ({ ...run }));
  }
}
