import { describe, expect, it } from 'vitest';

import {
  buildCabinetPauseCommand,
  buildCabinetResumeCommand,
  buildCabinetRunCommand,
  buildCabinetSetModeCommand,
  buildCabinetStopCommand,
} from './cabinetNodeRuntimeCommands';

describe('cabinetNodeRuntimeCommands', () => {
  it('buildCabinetRunCommand sets cabinet authority and followerMode', () => {
    expect(buildCabinetRunCommand('dev-1')).toEqual({
      action: 'run',
      deviceId: 'dev-1',
      authority: 'cabinet',
      followerMode: 'soft',
    });
    expect(buildCabinetRunCommand('dev-1', 'strict').followerMode).toBe('strict');
  });

  it('builds pause/resume/stop/setMode with deviceId', () => {
    expect(buildCabinetPauseCommand('d1')).toEqual({ action: 'pause', deviceId: 'd1' });
    expect(buildCabinetResumeCommand('d1')).toEqual({ action: 'resume', deviceId: 'd1' });
    expect(buildCabinetStopCommand('d1')).toEqual({ action: 'stop', deviceId: 'd1' });
    expect(buildCabinetSetModeCommand('d1', 'alarm')).toEqual({
      action: 'setMode',
      deviceId: 'd1',
      mode: 'alarm',
    });
  });
});
