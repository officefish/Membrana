import { describe, expect, it } from 'vitest';

import {
  buildBranchScenarioExport,
  branchScenarioExportFilename,
} from './export-branch-scenario.js';
import {
  INITIAL_SCENARIO_INITIAL_NODES,
  INITIAL_SCENARIO_MAIN_EDGES,
  INITIAL_SCENARIO_MAIN_NODES,
  SCENARIO_MAIN_ENTRY,
} from './initial-board-state.js';

describe('buildBranchScenarioExport', () => {
  it('exports only the active branch subgraph with entry and variables', () => {
    const exported = buildBranchScenarioExport({
      deviceKind: 'microphone-journal',
      branch: 'main',
      nodes: INITIAL_SCENARIO_MAIN_NODES,
      edges: INITIAL_SCENARIO_MAIN_EDGES,
      variables: [],
    });

    expect(exported.exportKind).toBe('branch-scenario');
    expect(exported.branch).toBe('main');
    expect(exported.subgraph.entry).toBe(SCENARIO_MAIN_ENTRY);
    expect(exported.subgraph.nodes.some((node) => node.id === 'main-on-tick')).toBe(true);
    expect(exported.subgraph.nodes.some((node) => node.id === 'initial-event')).toBe(false);
    expect(exported.referencedVariableIds).toEqual([]);
  });

  it('does not include nodes from other branches', () => {
    const exported = buildBranchScenarioExport({
      deviceKind: 'microphone-journal',
      branch: 'initial',
      nodes: INITIAL_SCENARIO_INITIAL_NODES,
      edges: [],
      variables: [],
    });

    expect(exported.subgraph.nodes.some((node) => node.id === 'main-on-tick')).toBe(false);
    expect(exported.subgraph.nodes.some((node) => node.id === 'initial-event')).toBe(true);
  });

  it('builds branch-specific download filename', () => {
    expect(branchScenarioExportFilename('microphone-journal', 'main')).toBe(
      'device-scenario-microphone-journal-main.json',
    );
  });
});
