import { describe, expect, it } from 'vitest';

import { buildDeviceScenarioDocument } from './build-device-scenario.js';
import { createDefaultHydratedBoardState } from './hydrate-board-from-document.js';
import { hydratedFunctionInput } from './hydrate-board-from-document.js';
import { scenarioDocumentFingerprint } from './scenario-snapshot.js';

describe('scenario-snapshot', () => {
  it('fingerprint is stable for the same document', () => {
    const state = createDefaultHydratedBoardState('microphone');
    const doc = buildDeviceScenarioDocument({
      deviceKind: state.deviceKind,
      title: 't',
      signalNodes: state.signalNodes,
      signalEdges: state.signalEdges,
      scenarioInitialNodes: state.scenarioInitialNodes,
      scenarioInitialEdges: state.scenarioInitialEdges,
      scenarioOnConnectNodes: state.scenarioOnConnectNodes,
      scenarioOnConnectEdges: state.scenarioOnConnectEdges,
      scenarioMainNodes: state.scenarioMainNodes,
      scenarioMainEdges: state.scenarioMainEdges,
      scenarioAlarmNodes: state.scenarioAlarmNodes,
      scenarioAlarmEdges: state.scenarioAlarmEdges,
      scenarioOnStopNodes: state.scenarioOnStopNodes,
      scenarioOnStopEdges: state.scenarioOnStopEdges,
      scenarioOnDisconnectNodes: state.scenarioOnDisconnectNodes,
      scenarioOnDisconnectEdges: state.scenarioOnDisconnectEdges,
      scenarioFunctions: [hydratedFunctionInput(state)],
      variables: state.variables,
    });
    expect(scenarioDocumentFingerprint(doc)).toBe(scenarioDocumentFingerprint(doc));
  });
});
