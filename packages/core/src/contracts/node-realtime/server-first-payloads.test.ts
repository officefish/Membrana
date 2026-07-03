import { describe, expect, it } from 'vitest';

import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  parseBoardCaptureStatePayload,
  parseBoardEditLeasePayload,
  parseNodeRealtimeEnvelope,
  parseRuntimeCommandPayload,
} from './index.js';

describe('server-first SF1 payloads', () => {
  it('CT7: pause/resume/setMode удалены из wire — парсер отбрасывает', () => {
    // Tariff v3: вернуть парсинг pause/resume/setMode.
    expect(parseRuntimeCommandPayload({ action: 'pause', deviceId: 'dev-1' })).toBeNull();
    expect(parseRuntimeCommandPayload({ action: 'resume' })).toBeNull();
    expect(parseRuntimeCommandPayload({ action: 'setMode', mode: 'alarm' })).toBeNull();
  });

  it('CT7: run игнорирует v1 authority/followerMode (захват явный, board.capture)', () => {
    expect(
      parseRuntimeCommandPayload({
        action: 'run',
        authority: 'cabinet',
        followerMode: 'strict',
      }),
    ).toEqual({ action: 'run' });
  });

  it('parseBoardEditLeasePayload validates cabinet lease', () => {
    expect(
      parseBoardEditLeasePayload({
        deviceId: 'dev-1',
        holder: 'cabinet',
        sessionId: 'sess-abc',
        revision: 3,
        expiresAt: '2026-06-26T15:00:00.000Z',
      }),
    ).toEqual({
      deviceId: 'dev-1',
      holder: 'cabinet',
      sessionId: 'sess-abc',
      revision: 3,
      expiresAt: '2026-06-26T15:00:00.000Z',
    });
  });

  it('parseBoardEditLeasePayload rejects cabinet without sessionId', () => {
    expect(
      parseBoardEditLeasePayload({
        deviceId: 'dev-1',
        holder: 'cabinet',
        sessionId: null,
        revision: 0,
        expiresAt: null,
      }),
    ).toBeNull();
  });

  it('parseBoardCaptureStatePayload defaults followerMode to soft for cabinet', () => {
    expect(
      parseBoardCaptureStatePayload({
        deviceId: 'dev-1',
        authority: 'cabinet',
        isRunning: true,
        isPaused: false,
      }),
    ).toEqual({
      deviceId: 'dev-1',
      authority: 'cabinet',
      followerMode: 'soft',
      isRunning: true,
      isPaused: false,
    });
  });

  it('parseNodeRealtimeEnvelope accepts board channel', () => {
    const parsed = parseNodeRealtimeEnvelope({
      v: 1,
      channel: 'board',
      type: NODE_REALTIME_EVENT_TYPES.board.editLease,
      ts: '2026-06-26T12:00:00.000Z',
      payload: {
        deviceId: 'dev-1',
        holder: 'none',
        sessionId: null,
        revision: 0,
        expiresAt: null,
      },
    });
    expect(parsed.ok).toBe(true);
  });

  it('createNodeRealtimeEnvelope builds board.edit-lease', () => {
    const env = createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.editLease, {
      deviceId: 'dev-1',
      holder: 'cabinet',
      sessionId: 's1',
      revision: 1,
      expiresAt: null,
    });
    expect(env.channel).toBe('board');
    expect(env.type).toBe('board.edit-lease');
  });
});
