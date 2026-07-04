import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
} from '@membrana/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Изолируем от persist-middleware реального agenda-стора (в node-тестах нет
// localStorage → setItem падает). Мок хранит только selectedModuleId.
vi.mock('@membrana/agenda', () => {
  const store = { selectedModuleId: null as string | null };
  return {
    useMembranaStore: {
      getState: () => ({
        selectedModuleId: store.selectedModuleId,
        selectModule: (id: string | null) => {
          store.selectedModuleId = id;
        },
      }),
      setState: (patch: { selectedModuleId?: string | null }) => {
        if ('selectedModuleId' in patch) {
          store.selectedModuleId = patch.selectedModuleId ?? null;
        }
      },
    },
  };
});

import { useMembranaStore } from '@membrana/agenda';

import {
  applyBoardEnvelopeForTests,
  resetBoardLeaseBridgeForTests,
} from '@/lib/boardLeaseBridge';
import { DEVICE_BOARD_MODULE_ID } from '@/modules/device-board/device-board-module-config';
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

describe('boardLeaseBridge capture v2 (CT4)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-02T10:00:00.000Z'));
    resetBoardLeaseBridgeForTests();
    resetServerFirstStoreForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const capturePayload = {
    deviceId,
    mode: 'hard' as const,
    sessionId: 'sess-1',
    acquiredAt: '2026-07-02T10:00:00.000Z',
    expiresAt: '2026-07-02T10:05:00.000Z',
  };

  it('board.capture заполняет ось capture v2', () => {
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, capturePayload),
      deviceId,
    );

    const state = useServerFirstStore.getState();
    expect(state.capture).toEqual({
      mode: 'hard',
      sessionId: 'sess-1',
      expiresAt: '2026-07-02T10:05:00.000Z',
    });
    expect(state.lastCaptureRelease).toBeNull();
  });

  it('TTL: 5 мин без heartbeat → auto-release ttl-expired (автономия)', () => {
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, capturePayload),
      deviceId,
    );

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    const state = useServerFirstStore.getState();
    expect(state.capture).toBeNull();
    expect(state.lastCaptureRelease).toBe('ttl-expired');
  });

  it('heartbeat продлевает TTL и переармирует таймер', () => {
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, capturePayload),
      deviceId,
    );

    vi.advanceTimersByTime(2 * 60 * 1000);
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.heartbeat, {
        deviceId,
        sessionId: 'sess-1',
        expiresAt: '2026-07-02T10:07:00.000Z',
      }),
      deviceId,
    );

    // Старый дедлайн (10:05) прошёл — захват жив благодаря heartbeat.
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(useServerFirstStore.getState().capture).not.toBeNull();

    // Новый дедлайн (10:07) прошёл — auto-release.
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(useServerFirstStore.getState().capture).toBeNull();
    expect(useServerFirstStore.getState().lastCaptureRelease).toBe('ttl-expired');
  });

  it('heartbeat чужой сессии игнорируется', () => {
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, capturePayload),
      deviceId,
    );

    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.heartbeat, {
        deviceId,
        sessionId: 'sess-other',
        expiresAt: '2026-07-02T11:00:00.000Z',
      }),
      deviceId,
    );

    expect(useServerFirstStore.getState().capture?.expiresAt).toBe('2026-07-02T10:05:00.000Z');
  });

  it('board.release отпускает захват с причиной, не трогая сценарий', () => {
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, capturePayload),
      deviceId,
    );

    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.release, {
        deviceId,
        sessionId: 'sess-1',
        reason: 'operator',
      }),
      deviceId,
    );

    const state = useServerFirstStore.getState();
    expect(state.capture).toBeNull();
    expect(state.lastCaptureRelease).toBe('operator');

    // Отменённый TTL-таймер не перезаписывает причину release.
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(useServerFirstStore.getState().lastCaptureRelease).toBe('operator');
  });

  it('capture для чужого устройства игнорируется', () => {
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, {
        ...capturePayload,
        deviceId: 'other',
      }),
      deviceId,
    );

    expect(useServerFirstStore.getState().capture).toBeNull();
  });

  it('TTL-разряд отпускает ровно один раз; heartbeat после release не воскрешает (SC1)', () => {
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, capturePayload),
      deviceId,
    );

    // Далеко за TTL: release не должен дублироваться отменёнными таймерами.
    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(useServerFirstStore.getState().capture).toBeNull();
    expect(useServerFirstStore.getState().lastCaptureRelease).toBe('ttl-expired');

    // Запоздалый heartbeat мёртвой сессии — захват не воскресает.
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.heartbeat, {
        deviceId,
        sessionId: 'sess-1',
        expiresAt: '2026-07-02T11:00:00.000Z',
      }),
      deviceId,
    );
    expect(useServerFirstStore.getState().capture).toBeNull();
    expect(useServerFirstStore.getState().lastCaptureRelease).toBe('ttl-expired');
  });

  it('Studio-shell focus: один раз на acquire, не на смену режима той же сессии (SC1)', () => {
    const notify = vi.fn();
    // Тесты идут в node-окружении: минимальный window-стаб для electron-порта.
    vi.stubGlobal('window', { electronAPI: { studioShell: { notifyCaptureAcquired: notify } } });
    try {
      applyBoardEnvelopeForTests(
        createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, capturePayload),
        deviceId,
      );
      expect(notify).toHaveBeenCalledTimes(1);

      // Та же сессия, смена режима — окно не дёргаем повторно.
      applyBoardEnvelopeForTests(
        createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, {
          ...capturePayload,
          mode: 'soft' as const,
        }),
        deviceId,
      );
      expect(notify).toHaveBeenCalledTimes(1);

      // Новая сессия захвата — снова focus.
      applyBoardEnvelopeForTests(
        createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.release, {
          deviceId,
          sessionId: 'sess-1',
          reason: 'operator',
        }),
        deviceId,
      );
      applyBoardEnvelopeForTests(
        createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, {
          ...capturePayload,
          sessionId: 'sess-2',
        }),
        deviceId,
      );
      expect(notify).toHaveBeenCalledTimes(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('boardLeaseBridge force-open view-only (PCB5)', () => {
  const capturePayload = {
    deviceId,
    mode: 'hard' as const,
    sessionId: 'sess-1',
    acquiredAt: '2026-07-04T10:00:00.000Z',
    expiresAt: '2026-07-04T10:05:00.000Z',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-04T10:00:00.000Z'));
    resetBoardLeaseBridgeForTests();
    resetServerFirstStoreForTests();
    useMembranaStore.setState({ selectedModuleId: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('board.capture форс-открывает device-board и ставит флаг view-only', () => {
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, capturePayload),
      deviceId,
    );

    expect(useMembranaStore.getState().selectedModuleId).toBe(DEVICE_BOARD_MODULE_ID);
    expect(useServerFirstStore.getState().isViewOnlyFromCapture).toBe(true);
  });

  it('оператор на другом модуле → захват переключает на device-board', () => {
    useMembranaStore.setState({ selectedModuleId: 'microphone' });

    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, capturePayload),
      deviceId,
    );

    expect(useMembranaStore.getState().selectedModuleId).toBe(DEVICE_BOARD_MODULE_ID);
  });

  it('оператор уже на device-board → навигация не дёргается (остаёмся)', () => {
    useMembranaStore.setState({ selectedModuleId: DEVICE_BOARD_MODULE_ID });

    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, capturePayload),
      deviceId,
    );

    expect(useMembranaStore.getState().selectedModuleId).toBe(DEVICE_BOARD_MODULE_ID);
    expect(useServerFirstStore.getState().isViewOnlyFromCapture).toBe(true);
  });

  it('board.release снимает флаг view-only, не уводя с доски', () => {
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.capture, capturePayload),
      deviceId,
    );
    applyBoardEnvelopeForTests(
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.release, {
        deviceId,
        sessionId: 'sess-1',
        reason: 'operator',
      }),
      deviceId,
    );

    expect(useServerFirstStore.getState().isViewOnlyFromCapture).toBe(false);
    // Доску не покидаем автоматически — оператор остаётся в контексте.
    expect(useMembranaStore.getState().selectedModuleId).toBe(DEVICE_BOARD_MODULE_ID);
  });
});
