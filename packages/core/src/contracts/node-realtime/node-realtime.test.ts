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
});
