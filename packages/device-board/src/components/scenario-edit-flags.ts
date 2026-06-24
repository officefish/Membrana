/** Вход для флагов редактирования scenario-слоя (user-edit vs system-preview). */
export interface ScenarioEditFlagsInput {
  readonly isSignal: boolean;
  readonly isRuntime: boolean;
  readonly isSessionReadOnly: boolean;
}

/** Флаги UI: структура vs навигация в режиме просмотра. */
export interface ScenarioEditFlags {
  readonly isScenarioViewOnly: boolean;
  readonly canEditScenario: boolean;
  readonly isCanvasStructureReadOnly: boolean;
  readonly constructorCrudDisabled: boolean;
}

/**
 * Единый источник флагов view-only для shell и сайдбаров.
 * Pan/zoom канваса не блокируются — только структурные мутации (`isCanvasStructureReadOnly`).
 */
export function resolveScenarioEditFlags(input: ScenarioEditFlagsInput): ScenarioEditFlags {
  const isScenarioViewOnly = !input.isSignal && input.isSessionReadOnly;
  return {
    isScenarioViewOnly,
    canEditScenario: !input.isSignal && !input.isSessionReadOnly,
    isCanvasStructureReadOnly: input.isRuntime || input.isSessionReadOnly,
    constructorCrudDisabled: input.isSignal || input.isRuntime || isScenarioViewOnly,
  };
}
