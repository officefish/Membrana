import { describe, expect, it } from 'vitest';

import {
  CAPTURE_PREEMPTION_FADE_OUT_MS,
  DEVICE_CAPTURE_HEARTBEAT_INTERVAL_MS,
  DEVICE_CAPTURE_TTL_MS,
  FIELD_ALLOWED_ACTIONS,
  NODE_REALTIME_EVENT_TYPES,
  TARIFF_CABINET_RUNTIME_COMMANDS,
  createNodeRealtimeEnvelope,
  parseBoardCaptureHeartbeatPayload,
  parseBoardCapturePayload,
  parseBoardCaptureReleasePayload,
  parseNodeRealtimeEnvelope,
  parseRuntimeCommandPayload,
} from './index.js';

describe('capture tariff v2 payloads (CT1)', () => {
  it('parseBoardCapturePayload validates full capture', () => {
    const payload = {
      deviceId: 'dev-1',
      mode: 'soft',
      sessionId: 'sess-abc',
      acquiredAt: '2026-07-02T10:00:00.000Z',
      expiresAt: '2026-07-02T10:05:00.000Z',
    };
    expect(parseBoardCapturePayload(payload)).toEqual(payload);
    expect(parseBoardCapturePayload({ ...payload, mode: 'hard' })).toEqual({
      ...payload,
      mode: 'hard',
    });
  });

  it('parseBoardCapturePayload rejects unknown mode and bad dates', () => {
    const base = {
      deviceId: 'dev-1',
      mode: 'soft',
      sessionId: 'sess-abc',
      acquiredAt: '2026-07-02T10:00:00.000Z',
      expiresAt: '2026-07-02T10:05:00.000Z',
    };
    // v1 followerMode 'strict' не является валидным capture mode v2
    expect(parseBoardCapturePayload({ ...base, mode: 'strict' })).toBeNull();
    expect(parseBoardCapturePayload({ ...base, sessionId: '' })).toBeNull();
    expect(parseBoardCapturePayload({ ...base, expiresAt: 'not-a-date' })).toBeNull();
    expect(parseBoardCapturePayload(null)).toBeNull();
  });

  it('parseBoardCaptureHeartbeatPayload validates renewal', () => {
    const payload = {
      deviceId: 'dev-1',
      sessionId: 'sess-abc',
      expiresAt: '2026-07-02T10:07:00.000Z',
    };
    expect(parseBoardCaptureHeartbeatPayload(payload)).toEqual(payload);
    expect(parseBoardCaptureHeartbeatPayload({ ...payload, sessionId: undefined })).toBeNull();
    expect(parseBoardCaptureHeartbeatPayload({ ...payload, expiresAt: 42 })).toBeNull();
  });

  it('parseBoardCaptureReleasePayload validates reasons and null sessionId', () => {
    expect(
      parseBoardCaptureReleasePayload({ deviceId: 'dev-1', sessionId: 'sess-abc', reason: 'operator' }),
    ).toEqual({ deviceId: 'dev-1', sessionId: 'sess-abc', reason: 'operator' });
    // auto-release без живой сессии
    expect(
      parseBoardCaptureReleasePayload({ deviceId: 'dev-1', sessionId: null, reason: 'ttl-expired' }),
    ).toEqual({ deviceId: 'dev-1', sessionId: null, reason: 'ttl-expired' });
    expect(
      parseBoardCaptureReleasePayload({ deviceId: 'dev-1', reason: 'server-restart' }),
    ).toEqual({ deviceId: 'dev-1', sessionId: null, reason: 'server-restart' });
    expect(parseBoardCaptureReleasePayload({ deviceId: 'dev-1', reason: 'whim' })).toBeNull();
  });

  it('runtime.command: selectScenario requires scenarioId', () => {
    expect(
      parseRuntimeCommandPayload({ action: 'selectScenario', scenarioId: 'scn-7', deviceId: 'dev-1' }),
    ).toEqual({ action: 'selectScenario', scenarioId: 'scn-7', deviceId: 'dev-1' });
    expect(parseRuntimeCommandPayload({ action: 'selectScenario' })).toBeNull();
    expect(parseRuntimeCommandPayload({ action: 'selectScenario', scenarioId: '' })).toBeNull();
  });

  it('runtime.command: run accepts optional scenarioId', () => {
    expect(parseRuntimeCommandPayload({ action: 'run', scenarioId: 'scn-7' })).toEqual({
      action: 'run',
      scenarioId: 'scn-7',
    });
    expect(parseRuntimeCommandPayload({ action: 'run', scenarioId: 42 })).toBeNull();
  });

  it('runtime.command: stop accepts fadeOutMs >= 0, rejects negative/NaN', () => {
    expect(parseRuntimeCommandPayload({ action: 'stop', fadeOutMs: 200 })).toEqual({
      action: 'stop',
      fadeOutMs: 200,
    });
    // emergency stop = hard-cut
    expect(parseRuntimeCommandPayload({ action: 'stop', fadeOutMs: 0 })).toEqual({
      action: 'stop',
      fadeOutMs: 0,
    });
    expect(parseRuntimeCommandPayload({ action: 'stop', fadeOutMs: -1 })).toBeNull();
    expect(parseRuntimeCommandPayload({ action: 'stop', fadeOutMs: Number.NaN })).toBeNull();
    expect(parseRuntimeCommandPayload({ action: 'stop', fadeOutMs: '200' })).toBeNull();
  });

  it('envelope round-trip for board.capture', () => {
    const payload = {
      deviceId: 'dev-1',
      mode: 'hard',
      sessionId: 'sess-abc',
      acquiredAt: '2026-07-02T10:00:00.000Z',
      expiresAt: '2026-07-02T10:05:00.000Z',
    };
    const envelope = createNodeRealtimeEnvelope(
      'board',
      NODE_REALTIME_EVENT_TYPES.board.capture,
      payload,
    );
    const parsed = parseNodeRealtimeEnvelope(JSON.parse(JSON.stringify(envelope)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    expect(parsed.value.type).toBe('board.capture');
    expect(parseBoardCapturePayload(parsed.value.payload)).toEqual(payload);
  });

  it('tariff v2 whitelist: только selectScenario/run/stop; пауза только в v3', () => {
    expect(TARIFF_CABINET_RUNTIME_COMMANDS.v2).toEqual(['selectScenario', 'run', 'stop']);
    expect(TARIFF_CABINET_RUNTIME_COMMANDS.v2).not.toContain('pause');
    expect(TARIFF_CABINET_RUNTIME_COMMANDS.v2).not.toContain('setMode');
    expect(TARIFF_CABINET_RUNTIME_COMMANDS.v3).toContain('pause');
  });

  it('field matrix: hard оставляет только emergency stop; soft без edit/pause', () => {
    expect(FIELD_ALLOWED_ACTIONS.hard).toEqual(['stop']);
    expect(FIELD_ALLOWED_ACTIONS.soft).toEqual(['run', 'stop']);
    expect(FIELD_ALLOWED_ACTIONS.soft).not.toContain('edit');
    expect(FIELD_ALLOWED_ACTIONS.none).toContain('edit');
  });

  it('тайминги захвата: heartbeat 2 мин, TTL 5 мин, fade-out 200 мс', () => {
    expect(DEVICE_CAPTURE_HEARTBEAT_INTERVAL_MS).toBe(120_000);
    expect(DEVICE_CAPTURE_TTL_MS).toBe(300_000);
    expect(DEVICE_CAPTURE_TTL_MS).toBeGreaterThan(DEVICE_CAPTURE_HEARTBEAT_INTERVAL_MS * 2);
    expect(CAPTURE_PREEMPTION_FADE_OUT_MS).toBe(200);
  });
});

// CX3: список сценариев узла — контракт board.scenario-list.
import {
  normalizeScenarioSelection,
  parseBoardScenarioListPayload,
  resolveScenarioItemKind,
} from './index.js';

describe('parseBoardScenarioListPayload (CX3)', () => {
  const scenarios = [
    { id: 'ws-1', title: 'Спектр' },
    { id: 'ws-2', title: 'Нейро' },
  ];

  it('валидный payload с выбранным из списка', () => {
    expect(
      parseBoardScenarioListPayload({ deviceId: 'd', scenarios, selectedScenarioId: 'ws-2' }),
    ).toEqual({ deviceId: 'd', scenarios, selectedScenarioId: 'ws-2' });
  });

  it('пустой список: selectedScenarioId только null', () => {
    expect(
      parseBoardScenarioListPayload({ deviceId: 'd', scenarios: [], selectedScenarioId: null }),
    ).toEqual({ deviceId: 'd', scenarios: [], selectedScenarioId: null });
    expect(
      parseBoardScenarioListPayload({ deviceId: 'd', scenarios: [], selectedScenarioId: 'ws-1' }),
    ).toBeNull();
  });

  it('отвергает выбранный вне списка (инвариант «один всегда выбран»)', () => {
    expect(
      parseBoardScenarioListPayload({ deviceId: 'd', scenarios, selectedScenarioId: 'ghost' }),
    ).toBeNull();
    expect(
      parseBoardScenarioListPayload({ deviceId: 'd', scenarios, selectedScenarioId: null }),
    ).toBeNull();
  });

  it('отвергает дубли id и мусорные элементы', () => {
    expect(
      parseBoardScenarioListPayload({
        deviceId: 'd',
        scenarios: [...scenarios, { id: 'ws-1', title: 'Дубль' }],
        selectedScenarioId: 'ws-1',
      }),
    ).toBeNull();
    expect(
      parseBoardScenarioListPayload({
        deviceId: 'd',
        scenarios: [{ id: '', title: 'x' }],
        selectedScenarioId: null,
      }),
    ).toBeNull();
  });

  // csp-1: обогащённые системные сценарии (kind + карточные поля).
  it('парсит системный сценарий с kind + карточными полями', () => {
    const parsed = parseBoardScenarioListPayload({
      deviceId: 'd',
      scenarios: [
        {
          id: 'sys-1',
          title: 'FREE · Спектр',
          kind: 'system',
          description: 'Системный',
          entitlement: 'bundled',
          branchCount: 6,
          functionCount: 2,
        },
      ],
      selectedScenarioId: 'sys-1',
    });
    expect(parsed?.scenarios[0]).toEqual({
      id: 'sys-1',
      title: 'FREE · Спектр',
      kind: 'system',
      description: 'Системный',
      entitlement: 'bundled',
      branchCount: 6,
      functionCount: 2,
    });
  });

  it('backward-compat: старый item без kind парсится без поля (kind не добавляется)', () => {
    const parsed = parseBoardScenarioListPayload({
      deviceId: 'd',
      scenarios: [{ id: 'ws-1', title: 'Спектр' }],
      selectedScenarioId: 'ws-1',
    });
    expect(parsed?.scenarios[0]).toEqual({ id: 'ws-1', title: 'Спектр' });
    expect(parsed?.scenarios[0]).not.toHaveProperty('kind');
  });

  it('отбрасывает невалидные kind/entitlement/counts, сохраняя id+title', () => {
    const parsed = parseBoardScenarioListPayload({
      deviceId: 'd',
      scenarios: [
        {
          id: 'ws-1',
          title: 'Спектр',
          kind: 'weird',
          entitlement: 'nope',
          branchCount: -1,
          functionCount: 1.5,
        },
      ],
      selectedScenarioId: 'ws-1',
    });
    expect(parsed?.scenarios[0]).toEqual({ id: 'ws-1', title: 'Спектр' });
  });
});

describe('resolveScenarioItemKind (csp-1)', () => {
  it('отсутствие kind → user; system → system', () => {
    expect(resolveScenarioItemKind({ id: 'a', title: 'A' })).toBe('user');
    expect(resolveScenarioItemKind({ id: 'a', title: 'A', kind: 'system' })).toBe('system');
    expect(resolveScenarioItemKind({ id: 'a', title: 'A', kind: 'user' })).toBe('user');
  });
});

describe('normalizeScenarioSelection (CX3)', () => {
  const scenarios = [
    { id: 'ws-1', title: 'Спектр' },
    { id: 'ws-2', title: 'Нейро' },
  ];

  it('сохраняет предпочтение, если оно в списке', () => {
    expect(normalizeScenarioSelection(scenarios, 'ws-2')).toBe('ws-2');
  });

  it('падает на первый при отсутствии/чужом предпочтении', () => {
    expect(normalizeScenarioSelection(scenarios, null)).toBe('ws-1');
    expect(normalizeScenarioSelection(scenarios, 'ghost')).toBe('ws-1');
    expect(normalizeScenarioSelection(scenarios, undefined)).toBe('ws-1');
  });

  it('null только для пустого списка', () => {
    expect(normalizeScenarioSelection([], 'ws-1')).toBeNull();
  });
});
