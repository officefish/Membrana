import { describe, expect, it } from 'vitest';
import { serializeScenarioFunction } from './serialize-scenario-function.js';
import { validateFunctionDepth } from './validate-function-depth.js';
import {
  buildDemoFunctionInput,
  DEMO_FUNCTION_CAPTURE_DETECT_NODES,
  INITIAL_SCENARIO_MAIN_NODES,
  serializeScenarioSubgraph,
  SCENARIO_MAIN_ENTRY,
} from './index.js';

describe('validateFunctionDepth H3c', () => {
  it('rejects nested subgraph in function body', () => {
    const fn = serializeScenarioFunction(
      buildDemoFunctionInput([
        ...DEMO_FUNCTION_CAPTURE_DETECT_NODES,
        {
          id: 'fn-nested',
          type: 'board',
          position: { x: 500, y: 0 },
          data: {
            label: 'Nested',
            layer: 'scenario',
            blockKind: 'subgraph',
            functionId: 'fn-other',
            inputs: [],
            outputs: [],
          },
        },
      ]),
    );
    const issues = validateFunctionDepth([fn], []);
    expect(issues.some((issue) => issue.code === 'function-nested-subgraph')).toBe(true);
  });

  it('requires subgraph block to reference known function', () => {
    const main = serializeScenarioSubgraph(SCENARIO_MAIN_ENTRY, INITIAL_SCENARIO_MAIN_NODES, []);
    const fn = serializeScenarioFunction(buildDemoFunctionInput());
    const issues = validateFunctionDepth([fn], [{ path: 'scenario.loops.main', nodes: main.nodes }]);
    expect(issues).toEqual([]);
  });
});
