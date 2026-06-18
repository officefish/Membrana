import { describe, expect, it } from 'vitest';

import {
  DEVICE_OFFLINE_RUN_HINT,
  resolveRunDisabledReason,
} from './run-gating.js';

describe('resolveRunDisabledReason', () => {
  const validBase = {
    validationIssues: [],
    hasRuntimeHost: true,
    isRunning: false,
  } as const;

  it('allows run when all checks pass', () => {
    expect(resolveRunDisabledReason(validBase)).toBeNull();
    expect(resolveRunDisabledReason({ ...validBase, deviceLive: true })).toBeNull();
  });

  it('blocks when device is offline', () => {
    expect(
      resolveRunDisabledReason({ ...validBase, deviceLive: false }),
    ).toBe(DEVICE_OFFLINE_RUN_HINT);
  });

  it('ignores deviceLive when undefined (autonomous client)', () => {
    expect(resolveRunDisabledReason({ ...validBase, deviceLive: undefined })).toBeNull();
  });

  it('blocks when scenario is running', () => {
    expect(resolveRunDisabledReason({ ...validBase, isRunning: true })).toMatch(/остановки/);
  });

  it('blocks without runtime host', () => {
    expect(
      resolveRunDisabledReason({ ...validBase, hasRuntimeHost: false }),
    ).toMatch(/Runtime host/);
  });

  it('blocks on validation errors', () => {
    expect(
      resolveRunDisabledReason({
        ...validBase,
        validationIssues: [{ code: 'empty-main', message: 'Main branch is empty' }],
      }),
    ).toMatch(/валидации/);
  });
});
