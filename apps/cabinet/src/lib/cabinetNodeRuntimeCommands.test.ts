import { describe, expect, it } from 'vitest';

import {
  CABINET_STOP_FADE_OUT_MS,
  buildCabinetPauseCommand,
  buildCabinetResumeCommand,
  buildCabinetRunCommand,
  buildCabinetRunScenarioCommand,
  buildCabinetSetModeCommand,
  buildCabinetStopCommand,
  buildCabinetStopScenarioCommand,
} from './cabinetNodeRuntimeCommands';

describe('cabinetNodeRuntimeCommands', () => {
  it('v2: run без authority/followerMode — захват явный, отдельным шагом (CT3)', () => {
    expect(buildCabinetRunScenarioCommand('dev-1')).toEqual({
      action: 'run',
      deviceId: 'dev-1',
    });
  });

  it('v2: stop с graceful fade-out по умолчанию; emergency = 0 явно', () => {
    expect(buildCabinetStopScenarioCommand('dev-1')).toEqual({
      action: 'stop',
      deviceId: 'dev-1',
      fadeOutMs: CABINET_STOP_FADE_OUT_MS,
    });
    expect(buildCabinetStopScenarioCommand('dev-1', 0).fadeOutMs).toBe(0);
  });

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
