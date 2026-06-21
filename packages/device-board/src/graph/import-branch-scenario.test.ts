import { describe, expect, it } from 'vitest';
import { createScenarioVariable } from '@membrana/core';

import { buildBranchScenarioExport } from './export-branch-scenario.js';
import {
  applyBranchScenarioImport,
  parseBranchScenarioExportJson,
} from './import-branch-scenario.js';
import {
  collectReferenceVariableSlots,
  isReferenceMappingComplete,
  suggestReferenceVariableMapping,
} from './reference-variable-slots.js';
import {
  INITIAL_SCENARIO_MAIN_EDGES,
  INITIAL_SCENARIO_MAIN_NODES,
} from './initial-board-state.js';
import { createVariableBoardNode } from './variable-node.js';

describe('reference-variable-slots export', () => {
  it('strips reference variables and emits slots', () => {
    const exportDevice = createScenarioVariable('var-export-device', 'device1', 'DeviceRef');
    const dateVar = createScenarioVariable('var-dt', 'datetime1', 'DateTime');
    const deviceGet = createVariableBoardNode('variable-get', exportDevice, { id: 'vg-device' });

    const exported = buildBranchScenarioExport({
      deviceKind: 'microphone',
      branch: 'main',
      nodes: [...INITIAL_SCENARIO_MAIN_NODES, deviceGet],
      edges: INITIAL_SCENARIO_MAIN_EDGES,
      variables: [exportDevice, dateVar],
    });

    expect(exported.variables).toEqual([dateVar]);
    expect(exported.referenceVariableSlots).toEqual([
      {
        exportVariableId: 'var-export-device',
        type: 'DeviceRef',
        nameHint: 'device1',
      },
    ]);
  });
});

describe('import-branch-scenario', () => {
  it('round-trips branch export with remapped reference variables', () => {
    const exportDeviceId = 'var-export-device';
    const localDevice = createScenarioVariable('var-local-device', 'device1', 'DeviceRef');
    const exportDevice = createScenarioVariable(exportDeviceId, 'device1', 'DeviceRef');
    const deviceGet = createVariableBoardNode('variable-get', exportDevice, { id: 'vg-device' });

    const exported = buildBranchScenarioExport({
      deviceKind: 'microphone',
      branch: 'main',
      nodes: [...INITIAL_SCENARIO_MAIN_NODES, deviceGet],
      edges: INITIAL_SCENARIO_MAIN_EDGES,
      variables: [exportDevice],
    });

    const json = JSON.stringify(exported);
    const parsed = parseBranchScenarioExportJson(json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const auto = suggestReferenceVariableMapping(parsed.referenceVariableSlots, [localDevice]);
    expect(isReferenceMappingComplete(parsed.referenceVariableSlots, auto)).toBe(true);

    const applied = applyBranchScenarioImport({
      targetBranch: 'main',
      deviceKind: 'microphone',
      export: parsed.export,
      referenceVariableSlots: parsed.referenceVariableSlots,
      localVariables: [localDevice],
      mapping: auto,
    });

    expect(applied.ok).toBe(true);
    if (!applied.ok) {
      return;
    }
    expect(applied.nodes.some((node) => node.id === 'main-on-tick')).toBe(true);
    expect(
      applied.nodes.find((node) => node.id === 'vg-device')?.data?.variableId,
    ).toBe('var-local-device');
  });

  it('rejects import when branch tab does not match', () => {
    const exported = buildBranchScenarioExport({
      deviceKind: 'microphone',
      branch: 'main',
      nodes: INITIAL_SCENARIO_MAIN_NODES,
      edges: INITIAL_SCENARIO_MAIN_EDGES,
      variables: [],
    });

    const applied = applyBranchScenarioImport({
      targetBranch: 'initial',
      deviceKind: 'microphone',
      export: exported,
      referenceVariableSlots: [],
      localVariables: [],
      mapping: {},
    });

    expect(applied.ok).toBe(false);
  });
});

describe('collectReferenceVariableSlots', () => {
  it('ignores value variable ids in referenced list', () => {
    const dt = createScenarioVariable('var-dt', 'datetime1', 'DateTime');
    const slots = collectReferenceVariableSlots(['var-dt'], [dt]);
    expect(slots).toEqual([]);
  });
});
