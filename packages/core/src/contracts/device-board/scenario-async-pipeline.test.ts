import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SCENARIO_SEQUENCE_CONFIG,
  formatPromiseRefHandle,
  isScenarioAsyncJobKind,
  isScenarioSequenceModeConflict,
  isTerminalScenarioAsyncJobState,
  parsePromiseRefHandle,
  resolveScenarioSequenceConfig,
  resolveScenarioAsyncJobNodeConfig,
  DEFAULT_SCENARIO_ASYNC_JOB_NODE_CONFIG,
} from './index.js';

describe('scenario async pipeline contracts', () => {
  it('formatPromiseRefHandle round-trips via parsePromiseRefHandle', () => {
    const handle = formatPromiseRefHandle('track-upload', 'job-abc-123');
    expect(handle).toBe('promise:track-upload:job-abc-123');
    expect(parsePromiseRefHandle(handle)).toEqual({
      kind: 'track-upload',
      promiseId: 'job-abc-123',
    });
  });

  it('parsePromiseRefHandle rejects invalid handles', () => {
    expect(parsePromiseRefHandle('track:upload:1')).toBeNull();
    expect(parsePromiseRefHandle('promise:unknown:1')).toBeNull();
    expect(parsePromiseRefHandle('promise:track-upload:')).toBeNull();
  });

  it('resolveScenarioSequenceConfig defaults latentThen to false', () => {
    expect(resolveScenarioSequenceConfig(undefined)).toEqual(DEFAULT_SCENARIO_SEQUENCE_CONFIG);
    expect(resolveScenarioSequenceConfig({ thenCount: 3, latentThen: true })).toEqual({
      thenCount: 3,
      parallelAsync: false,
      latentThen: true,
    });
  });

  it('isScenarioSequenceModeConflict detects parallelAsync + latentThen', () => {
    expect(
      isScenarioSequenceModeConflict({
        thenCount: 2,
        parallelAsync: true,
        latentThen: false,
      }),
    ).toBe(false);
    expect(
      isScenarioSequenceModeConflict({
        thenCount: 2,
        parallelAsync: true,
        latentThen: true,
      }),
    ).toBe(true);
  });

  it('async job kind and terminal state guards', () => {
    expect(isScenarioAsyncJobKind('track-upload')).toBe(true);
    expect(isScenarioAsyncJobKind('upload')).toBe(false);
    expect(isTerminalScenarioAsyncJobState('pending')).toBe(false);
    expect(isTerminalScenarioAsyncJobState('resolved')).toBe(true);
  });

  it('resolveScenarioAsyncJobNodeConfig normalizes jobKind and timeout', () => {
    expect(resolveScenarioAsyncJobNodeConfig(undefined)).toEqual(
      DEFAULT_SCENARIO_ASYNC_JOB_NODE_CONFIG,
    );
    expect(
      resolveScenarioAsyncJobNodeConfig({ jobKind: 'report-build', awaitTimeoutMs: 5000 }),
    ).toEqual({
      jobKind: 'report-build',
      awaitTimeoutMs: 5000,
    });
  });
});
