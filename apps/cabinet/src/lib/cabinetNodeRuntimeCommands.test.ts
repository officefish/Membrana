import { describe, expect, it } from 'vitest';

import {
  CABINET_STOP_FADE_OUT_MS,
  buildCabinetRunScenarioCommand,
  buildCabinetStopScenarioCommand,
} from './cabinetNodeRuntimeCommands';

// CT7: тесты v1-билдеров удалены вместе с билдерами.
// Tariff v3: вернуть pause/resume/setMode + их тесты.
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
});
