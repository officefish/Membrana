import { describe, expect, it } from 'vitest';
import { createScenarioVariable } from '@membrana/core';

import { buildDeviceScenarioDocument } from './build-device-scenario.js';
import { getDefaultMvpMicrophoneDocument } from './default-usercase-mvp-microphone.js';
import {
  applyUserCaseDocument,
  collectUserCaseReferenceSlots,
  prepareUserCaseApply,
} from './apply-user-case.js';
import { INITIAL_SIGNAL_EDGES, INITIAL_SIGNAL_NODES } from './initial-board-state.js';

describe('apply-user-case', () => {
  it('collectUserCaseReferenceSlots finds JournalRef in MVP', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    const slots = collectUserCaseReferenceSlots(doc);
    expect(slots.some((slot) => slot.type === 'JournalRef')).toBe(true);
  });

  it('prepareUserCaseApply rejects deviceKind mismatch', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    const result = prepareUserCaseApply({
      userCaseDocument: doc,
      localDeviceKind: 'playback',
      localVariables: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('microphone');
    }
  });

  it('applyUserCaseDocument preserves signal graph from current document', () => {
    const userCase = getDefaultMvpMicrophoneDocument();
    const current = buildDeviceScenarioDocument({
      deviceKind: 'microphone',
      signalNodes: INITIAL_SIGNAL_NODES,
      signalEdges: INITIAL_SIGNAL_EDGES,
      scenarioInitialNodes: [],
      scenarioInitialEdges: [],
      scenarioMainNodes: [],
      scenarioMainEdges: [],
      scenarioAlarmNodes: [],
      scenarioAlarmEdges: [],
      scenarioOnStopNodes: [],
      scenarioOnStopEdges: [],
      scenarioOnDisconnectNodes: [],
      scenarioOnDisconnectEdges: [],
      scenarioFunctions: [],
      variables: [],
    });

    const localJournal = createScenarioVariable('local-journal', 'journal1', 'JournalRef');
    const slots = collectUserCaseReferenceSlots(userCase);
    const mapping: Record<string, string> = {};
    for (const slot of slots) {
      if (slot.type === 'JournalRef') {
        mapping[slot.exportVariableId] = localJournal.id;
      }
    }

    const result = applyUserCaseDocument({
      userCaseDocument: userCase,
      currentDocument: current,
      localVariables: [localJournal],
      mapping,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.document.signalGraph).toEqual(current.signalGraph);
      expect(result.state.scenarioMainNodes.length).toBeGreaterThan(0);
    }
  });
});
