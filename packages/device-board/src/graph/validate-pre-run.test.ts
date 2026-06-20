import { describe, expect, it } from 'vitest';

import { isPreRunValid, validatePreRun } from './validate-pre-run.js';

describe('validatePreRun', () => {
  it('reports signal-empty when signal graph has no nodes', () => {
    const issues = validatePreRun({
      deviceKind: 'microphone',
      signalNodes: [],
      signalEdges: [],
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
    });

    expect(issues.some((issue) => issue.code === 'signal-empty')).toBe(true);
    expect(isPreRunValid(issues)).toBe(false);
  });

  it('isPreRunValid returns true for empty issue list', () => {
    expect(isPreRunValid([])).toBe(true);
  });
});
