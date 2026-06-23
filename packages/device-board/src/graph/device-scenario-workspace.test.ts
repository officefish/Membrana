import { describe, expect, it } from 'vitest';

import { getDefaultMvpMicrophoneDocument } from './default-usercase-mvp-microphone.js';
import {
  isUserOwnedDeviceScenarioDocument,
  shouldMigrateMicrophoneScenarioToBundledMvp,
  stampUserWorkspaceDocument,
} from './device-scenario-workspace.js';

describe('device-scenario-workspace', () => {
  it('isUserOwnedDeviceScenarioDocument is true only for workspaceKind user', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    expect(isUserOwnedDeviceScenarioDocument(doc)).toBe(false);
    expect(isUserOwnedDeviceScenarioDocument(stampUserWorkspaceDocument(doc))).toBe(true);
  });

  it('shouldMigrateMicrophoneScenarioToBundledMvp skips user-owned docs', () => {
    const legacy = {
      ...getDefaultMvpMicrophoneDocument(),
      scenario: {
        ...getDefaultMvpMicrophoneDocument().scenario,
        initial: {
          entry: 'legacy-entry',
          nodes: [
            {
              id: 'legacy-1',
              blockKind: 'select-microphone',
              position: { x: 0, y: 0 },
            },
          ],
          edges: [],
        },
      },
    };
    expect(shouldMigrateMicrophoneScenarioToBundledMvp(legacy)).toBe(true);
    expect(shouldMigrateMicrophoneScenarioToBundledMvp(stampUserWorkspaceDocument(legacy))).toBe(
      false,
    );
  });

  it('stampUserWorkspaceDocument sets workspaceKind user', () => {
    const doc = getDefaultMvpMicrophoneDocument();
    const stamped = stampUserWorkspaceDocument(doc);
    expect(stamped.meta?.workspaceKind).toBe('user');
    expect(stamped.scenario).toEqual(doc.scenario);
  });
});
