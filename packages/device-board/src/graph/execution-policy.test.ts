import { describe, expect, it } from 'vitest';
import { createEmptyDeviceScenarioDocument } from '@membrana/core';

import {
  isCompetitionDocument,
  isCompetitionStructureLocked,
  resolveCompetitionExecutionPolicy,
  stampCompetitionDocumentMeta,
} from './execution-policy.js';

describe('execution-policy', () => {
  it('detects competition meta', () => {
    const document = stampCompetitionDocumentMeta(createEmptyDeviceScenarioDocument('microphone'));
    expect(isCompetitionDocument(document)).toBe(true);
    expect(resolveCompetitionExecutionPolicy(document.meta)?.timeoutSec).toBe(600);
    expect(isCompetitionStructureLocked(document.meta)).toBe(true);
  });

  it('free document is not competition', () => {
    const document = createEmptyDeviceScenarioDocument('microphone');
    expect(resolveCompetitionExecutionPolicy(document.meta)).toBeNull();
    expect(isCompetitionStructureLocked(document.meta)).toBe(false);
  });
});
