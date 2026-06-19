import { describe, expect, it } from 'vitest';

import { createEmptyDeviceScenarioDocument } from '@membrana/core';

import {
  DEMO_FUNCTION_CAPTURE_DETECT_ENTRY,
  DEMO_FUNCTION_CAPTURE_DETECT_ID,
} from './initial-board-state.js';
import {
  createDefaultHydratedBoardState,
  hydratedFunctionInput,
  hydrateBoardFromDocument,
} from './hydrate-board-from-document.js';

describe('hydrate function canvas recovery', () => {
  it('restores demo function when persisted function nodes are empty', () => {
    const base = createEmptyDeviceScenarioDocument('microphone');
    const document = {
      ...base,
      scenario: {
        ...base.scenario,
        functions: [
          {
            id: DEMO_FUNCTION_CAPTURE_DETECT_ID,
            name: 'Capture+Detect',
            entry: DEMO_FUNCTION_CAPTURE_DETECT_ENTRY,
            nodes: [],
            edges: [],
            inputPins: ['exec-in'],
            outputPins: ['exec-out'],
          },
        ],
      },
    };

    const state = hydrateBoardFromDocument(document);
    expect(state.scenarioFunctionNodes.some((node) => node.id === DEMO_FUNCTION_CAPTURE_DETECT_ENTRY)).toBe(
      true,
    );
  });

  it('hydratedFunctionInput uses demo when function canvas was cleared', () => {
    const state = createDefaultHydratedBoardState();
    const cleared = {
      ...state,
      scenarioFunctionNodes: [],
      scenarioFunctionEdges: [],
    };
    const input = hydratedFunctionInput(cleared);
    expect(input.entry).toBe(DEMO_FUNCTION_CAPTURE_DETECT_ENTRY);
    expect(input.nodes.some((node) => node.id === DEMO_FUNCTION_CAPTURE_DETECT_ENTRY)).toBe(true);
  });
});
