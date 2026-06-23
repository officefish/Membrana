import { describe, expect, it } from 'vitest';

import {
  isDeviceBoardSessionReadOnly,
  type DeviceBoardSession,
} from '@membrana/device-board';

describe('device-board-session', () => {
  it('isDeviceBoardSessionReadOnly is true only for system-preview', () => {
    const user: DeviceBoardSession = {
      kind: 'user-edit',
      workspaceId: 'ws-1',
      title: 'Mine',
    };
    const system: DeviceBoardSession = {
      kind: 'system-preview',
      userCaseId: 'mvp-microphone',
      title: 'MVP',
    };
    expect(isDeviceBoardSessionReadOnly(user)).toBe(false);
    expect(isDeviceBoardSessionReadOnly(system)).toBe(true);
    expect(isDeviceBoardSessionReadOnly(null)).toBe(false);
  });
});
