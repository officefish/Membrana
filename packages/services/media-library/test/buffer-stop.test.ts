import { describe, expect, it } from 'vitest';

import {
  BUFFER_AUTO_CLEANUP_RATIO,
  BUFFER_STOP_RATIO,
  BUFFER_STOP_WARN_RATIO,
  stopDecision,
  stopDecisionOf,
} from '../src/buffer-stop.js';
import type { StorageQuota } from '../src/types.js';

const MB = 1048576;

function fill(usedMb: number, limitMb: number) {
  return { usedBytes: usedMb * MB, limitBytes: limitMb * MB };
}

function quota(usedMb: number, limitMb: number): StorageQuota {
  return {
    usedBytes: usedMb * MB,
    limitBytes: limitMb * MB,
    backend: 'server',
    serverReachable: true,
    bufferUsedBytes: usedMb * MB,
    bufferLimitBytes: limitMb * MB,
  };
}

describe('stop-вердикт режима остановки', () => {
  it('пусто — запись идёт', () => {
    expect(stopDecision(fill(100, 1024), { policy: 'stop' }).action).toBe('run');
  });

  it('живой замер прода 27.08 (806 из 1024, 79%) — ещё не порог', () => {
    const v = stopDecision(fill(806, 1024), { policy: 'stop' });
    expect(v.action).toBe('run');
    expect(Math.round((v.filled ?? 0) * 100)).toBe(79);
  });

  it('за порогом предупреждения — предупреждение, но запись ещё не обрывается', () => {
    const v = stopDecision(fill(Math.ceil(1024 * BUFFER_STOP_WARN_RATIO), 1024), { policy: 'stop' });
    expect(v.action).toBe('warn');
  });

  it('порог → stop: выбранная остановка гасит сценарий при 95%', () => {
    const v = stopDecision(fill(Math.ceil(1024 * BUFFER_STOP_RATIO), 1024), { policy: 'stop' });
    expect(v.action).toBe('stop');
    expect(v.restart).toBe('manual');
  });

  it('предела нет — судить нечем, и это сказано полем', () => {
    const v = stopDecision({ usedBytes: 100 * MB, limitBytes: 0 }, { policy: 'stop' });
    expect(v.action).toBe('run');
    expect(v.filled).toBeNull();
    expect(v.say).toMatch(/судить о заполнении нечем/);
  });
});

describe('слово stop-сигнала', () => {
  it('называет что остановлено, почему и сколько осталось', () => {
    const v = stopDecision(fill(1020, 1024), {
      policy: 'stop',
      what: 'сценарий дежурства',
      bytesPerMinute: 2 * MB,
    });
    expect(v.action).toBe('stop');
    expect(v.say).toMatch(/^Остановлено насовсем: сценарий дежурства\./u);
    expect(v.say).toMatch(/Буфер заполнен на 100%|Буфер заполнен на 99%/u);
    expect(v.say).toMatch(/свободно 4\.0 МБ/u);
    expect(v.say).toMatch(/около 2 мин записи/u);
  });

  it('называет выход и ручной restart, не обещая авто-возобновление', () => {
    const v = stopDecision(fill(1020, 1024), { policy: 'stop' });
    expect(v.say).toMatch(/Управлении буфером/u);
    expect(v.say).toMatch(/запустите сценарий рукой/u);
    expect(v.say).not.toMatch(/станет возможна снова|продолжится сама/u);
  });

  it('темп неизвестен — минут в слове нет: врать числом нельзя', () => {
    const v = stopDecision(fill(1020, 1024), { policy: 'stop' });
    expect(v.minutesLeft).toBeNull();
    expect(v.say).not.toMatch(/мин записи/u);
    expect(v.say).toMatch(/свободно /u);
  });

  it('минуты считаются по наблюдаемому темпу, а не по догадке о формате звука', () => {
    const v = stopDecision(fill(800, 1024), { policy: 'stop', bytesPerMinute: 5.3 * MB });
    expect(v.minutesLeft).toBe(42);
  });
});

describe('взаимоисключение режимов', () => {
  it('выбрана автоочистка → сценарий не получает stop даже на 95%', () => {
    const v = stopDecision(fill(Math.ceil(1024 * BUFFER_AUTO_CLEANUP_RATIO), 1024), {
      policy: 'auto-cleanup',
    });
    expect(v.autoCleanupDue).toBe(true);
    expect(v.action).not.toBe('stop');
    expect(v.say).toMatch(/сценарий записи не останавливается/u);
  });

  it('выбрана остановка → автоочистка не является действием stop-ветки', () => {
    const v = stopDecision(fill(Math.ceil(1024 * BUFFER_STOP_RATIO), 1024), { policy: 'stop' });
    expect(v.action).toBe('stop');
    expect(v.autoCleanupDue).toBe(true);
    expect(v.say).toMatch(/Автоочистка в этом режиме не запускается/u);
  });

  it('сторож диска не извещается: буфер есть квота приложения, не диск', () => {
    expect(stopDecision(fill(1020, 1024), { policy: 'stop' }).notifyDiskWatchdog).toBe(false);
  });
});

describe('две двери судьи', () => {
  it('владелец квоты судит через stopDecisionOf и получает тот же вердикт', () => {
    expect(stopDecisionOf(quota(1020, 1024), { policy: 'stop' })).toEqual(
      stopDecision(fill(1020, 1024), { policy: 'stop' }),
    );
  });

  it('буферная часть квоты берётся, а не общая', () => {
    const q: StorageQuota = {
      usedBytes: 10 * MB,
      limitBytes: 10240 * MB,
      backend: 'server',
      serverReachable: true,
      bufferUsedBytes: 1020 * MB,
      bufferLimitBytes: 1024 * MB,
    };
    expect(stopDecisionOf(q, { policy: 'stop' }).action).toBe('stop');
  });
});
