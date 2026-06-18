import { describe, expect, it } from 'vitest';

import {
  NODE_REALTIME_EVENT_TYPES,
  NODE_REALTIME_PROTOCOL_V,
  createNodeRealtimeEnvelope,
  parseNodeRealtimeEnvelope,
} from './index.js';

describe('node-realtime contracts', () => {
  it('createNodeRealtimeEnvelope builds v1 envelope', () => {
    const env = createNodeRealtimeEnvelope('journal', NODE_REALTIME_EVENT_TYPES.journal.append, {
      kind: 'report',
      clientEntryId: 'ce-1',
    });
    expect(env.v).toBe(NODE_REALTIME_PROTOCOL_V);
    expect(env.channel).toBe('journal');
    expect(env.type).toBe('journal.append');
  });

  it('parseNodeRealtimeEnvelope accepts valid envelope', () => {
    const parsed = parseNodeRealtimeEnvelope({
      v: 1,
      channel: 'mic-live',
      type: 'analysis.brief',
      ts: '2026-06-17T12:00:00.000Z',
      payload: { schema: 'drone-detection-brief/v1' },
    });
    expect(parsed.ok).toBe(true);
  });

  it('parseNodeRealtimeEnvelope rejects unknown version', () => {
    const parsed = parseNodeRealtimeEnvelope({
      v: 2,
      channel: 'journal',
      type: 'journal.append',
      ts: '2026-06-17T12:00:00.000Z',
      payload: {},
    });
    expect(parsed.ok).toBe(false);
  });

  it('parseNodeRealtimeEnvelope rejects invalid channel', () => {
    const parsed = parseNodeRealtimeEnvelope({
      v: 1,
      channel: 'invalid',
      type: 'journal.append',
      ts: '2026-06-17T12:00:00.000Z',
      payload: {},
    });
    expect(parsed.ok).toBe(false);
  });

  it('createNodeRealtimeEnvelope builds runtime.command envelope (MP7b)', () => {
    const env = createNodeRealtimeEnvelope('runtime', NODE_REALTIME_EVENT_TYPES.runtime.command, {
      action: 'setMode',
      mode: 'alarm',
    });
    expect(env.channel).toBe('runtime');
    expect(env.type).toBe('runtime.command');
    expect(env.payload).toEqual({ action: 'setMode', mode: 'alarm' });
  });

  it('parseNodeRealtimeEnvelope accepts runtime.state envelope', () => {
    const parsed = parseNodeRealtimeEnvelope({
      v: 1,
      channel: 'runtime',
      type: NODE_REALTIME_EVENT_TYPES.runtime.state,
      ts: '2026-06-18T09:00:00.000Z',
      payload: { phase: 'main', isRunning: true, mode: 'normal' },
    });
    expect(parsed.ok).toBe(true);
  });
});
