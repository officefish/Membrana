import { describe, expect, it } from 'vitest';

import { getDefaultMvpMicrophoneDocument } from './default-usercase-mvp-microphone.js';
import {
  cloneUserCaseToWorkspaceDocument,
  deepCopyDeviceScenarioDocument,
} from './clone-user-case-to-workspace.js';

describe('clone-user-case-to-workspace', () => {
  it('deepCopyDeviceScenarioDocument produces independent copy', () => {
    const source = getDefaultMvpMicrophoneDocument();
    const copy = deepCopyDeviceScenarioDocument(source);
    copy.scenario.initial.nodes[0]!.position.x = -42;
    expect(source.scenario.initial.nodes[0]!.position.x).not.toBe(-42);
  });

  it('cloneUserCaseToWorkspaceDocument stamps user meta and provenance', () => {
    const source = getDefaultMvpMicrophoneDocument();
    const cloned = cloneUserCaseToWorkspaceDocument({
      sourceDocument: source,
      userCaseId: 'usercase-mvp-microphone',
      workspaceId: 'user-ws-test',
      title: 'MVP Mic (копия)',
    });

    expect(cloned.meta?.workspaceKind).toBe('user');
    expect(cloned.meta?.workspaceId).toBe('user-ws-test');
    expect(cloned.meta?.clonedFromUserCaseId).toBe('usercase-mvp-microphone');
    expect(cloned.meta?.title).toBe('MVP Mic (копия)');
    expect(cloned.meta?.hash).toBeUndefined();
    expect(cloned.scenario).toEqual(source.scenario);
  });
});
