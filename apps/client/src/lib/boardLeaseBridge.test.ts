import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
} from '@membrana/core';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  applyBoardEnvelopeForTests,
  resetBoardLeaseBridgeForTests,
} from '@/lib/boardLeaseBridge';
import { resetServerFirstStoreForTests, useServerFirstStore } from '@/stores/serverFirstStore';

const deviceId = 'device-1';

describe('boardLeaseBridge', () => {
  beforeEach(() => {
    resetBoardLeaseBridgeForTests();
    resetServerFirstStoreForTests();
  });

  it('applies cabinet edit lease for local device', () => {
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.editLease, {
        deviceId,
        holder: 'cabinet',
        sessionId: 'sess-1',
        revision: 2,
        expiresAt: '2026-06-26T13:00:00.000Z',
      }),
      deviceId,
    );

    expect(useServerFirstStore.getState().editLease?.holder).toBe('cabinet');
  });

  it('clears lease on holder none', () => {
    useServerFirstStore.getState().setEditLease({
      deviceId,
      holder: 'cabinet',
      sessionId: 'sess-1',
      revision: 1,
      expiresAt: null,
    });

    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.editLease, {
        deviceId,
        holder: 'none',
        sessionId: null,
        revision: 1,
        expiresAt: null,
      }),
      deviceId,
    );

    expect(useServerFirstStore.getState().editLease).toBeNull();
  });

  it('ignores board events for other devices', () => {
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.captureState, {
        deviceId: 'other',
        authority: 'cabinet',
        followerMode: 'strict',
        isRunning: true,
        isPaused: false,
      }),
      deviceId,
    );

    expect(useServerFirstStore.getState().captureState).toBeNull();
  });
});
