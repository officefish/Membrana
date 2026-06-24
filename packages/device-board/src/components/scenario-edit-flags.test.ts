import { describe, expect, it } from 'vitest';

import { resolveScenarioEditFlags } from './scenario-edit-flags.js';

describe('resolveScenarioEditFlags', () => {
  it('allows canvas navigation but blocks edits in system-preview', () => {
    const flags = resolveScenarioEditFlags({
      isSignal: false,
      isRuntime: false,
      isSessionReadOnly: true,
    });
    expect(flags.isScenarioViewOnly).toBe(true);
    expect(flags.canEditScenario).toBe(false);
    expect(flags.isCanvasStructureReadOnly).toBe(true);
    expect(flags.constructorCrudDisabled).toBe(true);
  });

  it('keeps full edit on user-edit scenario', () => {
    const flags = resolveScenarioEditFlags({
      isSignal: false,
      isRuntime: false,
      isSessionReadOnly: false,
    });
    expect(flags.isScenarioViewOnly).toBe(false);
    expect(flags.canEditScenario).toBe(true);
    expect(flags.isCanvasStructureReadOnly).toBe(false);
    expect(flags.constructorCrudDisabled).toBe(false);
  });

  it('blocks scenario constructor on signal layer', () => {
    const flags = resolveScenarioEditFlags({
      isSignal: true,
      isRuntime: false,
      isSessionReadOnly: false,
    });
    expect(flags.canEditScenario).toBe(false);
    expect(flags.constructorCrudDisabled).toBe(true);
  });
});
