import type { DeviceScenarioDocument, ScenarioSubgraph } from '@membrana/core';

import type { UserCaseValidationError } from './types.js';
import { validateBlockLinks } from './validate-block-links.js';
import { validateBlockParameters } from './validate-block-parameters.js';
import { validateUserCaseStructure } from './validate-user-case-structure.js';
import { toUserCaseValidationResult, type UserCaseValidationResult } from './types.js';

function appendSubgraphValidation(
  errors: UserCaseValidationError[],
  subgraph: ScenarioSubgraph,
  pathPrefix: string,
): void {
  errors.push(...validateBlockLinks(subgraph, pathPrefix));
  errors.push(...validateBlockParameters(subgraph, pathPrefix));
}

/** Full pure validation pipeline for a persisted UserCase / device-scenario document. */
export function validateUserCaseDocument(
  document: DeviceScenarioDocument,
): UserCaseValidationResult {
  const errors = [...validateUserCaseStructure(document)];

  errors.push(...validateBlockLinks(document.signalGraph, 'signalGraph'));
  appendSubgraphValidation(errors, document.scenario.initial, 'scenario.initial');
  appendSubgraphValidation(errors, document.scenario.onConnect, 'scenario.onConnect');
  appendSubgraphValidation(errors, document.scenario.loops.main, 'scenario.loops.main');
  appendSubgraphValidation(errors, document.scenario.loops.alarm, 'scenario.loops.alarm');
  appendSubgraphValidation(errors, document.scenario.triggers.onStop, 'scenario.triggers.onStop');
  appendSubgraphValidation(
    errors,
    document.scenario.triggers.onDisconnect,
    'scenario.triggers.onDisconnect',
  );

  for (const fn of document.scenario.functions) {
    appendSubgraphValidation(errors, fn, `scenario.functions.${fn.id}`);
  }

  return toUserCaseValidationResult(errors);
}
