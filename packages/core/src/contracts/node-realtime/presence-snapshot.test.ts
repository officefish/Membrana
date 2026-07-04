import { describe, expect, it } from 'vitest';

import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  parseNodeRealtimeEnvelope,
  parsePresenceSnapshotPayload,
} from './index.js';

describe('presence.snapshot payload (PL1)', () => {
  it('парсит валидный снапшот и дедуплицирует id', () => {
    expect(
      parsePresenceSnapshotPayload({
        onlineDeviceIds: ['dev-1', 'dev-2', 'dev-1'],
        timestampMs: 1_700_000_000_000,
      }),
    ).toEqual({ onlineDeviceIds: ['dev-1', 'dev-2'], timestampMs: 1_700_000_000_000 });
  });

  it('пустой массив онлайн-узлов допустим', () => {
    expect(parsePresenceSnapshotPayload({ onlineDeviceIds: [], timestampMs: 1 })).toEqual({
      onlineDeviceIds: [],
      timestampMs: 1,
    });
  });

  it('отбраковывает не-массив, не-число timestamp и не-строковые id', () => {
    expect(parsePresenceSnapshotPayload({ onlineDeviceIds: 'dev-1', timestampMs: 1 })).toBeNull();
    expect(parsePresenceSnapshotPayload({ onlineDeviceIds: ['dev-1'], timestampMs: '1' })).toBeNull();
    expect(parsePresenceSnapshotPayload({ onlineDeviceIds: ['dev-1', ''], timestampMs: 1 })).toBeNull();
    expect(parsePresenceSnapshotPayload({ onlineDeviceIds: [42], timestampMs: 1 })).toBeNull();
    expect(parsePresenceSnapshotPayload(null)).toBeNull();
  });

  it('проходит сквозь envelope presence.snapshot', () => {
    const payload = { onlineDeviceIds: ['dev-1'], timestampMs: 1_700_000_000_000 };
    const envelope = createNodeRealtimeEnvelope(
      'presence',
      NODE_REALTIME_EVENT_TYPES.presence.snapshot,
      payload,
    );
    const parsed = parseNodeRealtimeEnvelope(JSON.parse(JSON.stringify(envelope)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsePresenceSnapshotPayload(parsed.value.payload)).toEqual(payload);
    }
  });
});
