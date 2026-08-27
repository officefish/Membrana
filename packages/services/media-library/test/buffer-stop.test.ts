/**
 * Зубы остановки записи по заполнению буфера (#2204, режим 1).
 *
 * Предмет — ГОВОРЯЩЕЕ СЛОВО. Обрыв записи существовал и раньше; чего не было, так это
 * внятного «что остановилось, почему и сколько осталось». Эти зубы стерегут именно слово и
 * три постулата, названных владельцу: доля как порог, минуты как остаток, возобновляемость,
 * непричастность сторожа диска.
 */
import { describe, expect, it } from 'vitest';

import {
  BUFFER_STOP_RATIO,
  BUFFER_STOP_WARN_RATIO,
  stopDecision,
  stopDecisionOf,
} from '../src/buffer-stop.js';
import type { StorageQuota } from '../src/types.js';

const MB = 1048576;

/** Пара чисел — основной вход судьи. */
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

describe('порог', () => {
  it('пусто — запись идёт', () => {
    expect(stopDecision(fill(100, 1024)).action).toBe('run');
  });

  it('живой замер прода 27.08 (806 из 1024, 79%) — ещё не порог, но и не тишина в числах', () => {
    const v = stopDecision(fill(806, 1024));
    expect(v.action).toBe('run');
    expect(Math.round((v.filled ?? 0) * 100)).toBe(79);
  });

  it('за порогом предупреждения — предупреждение, но запись НЕ обрывается', () => {
    const v = stopDecision(fill(Math.ceil(1024 * BUFFER_STOP_WARN_RATIO), 1024));
    expect(v.action).toBe('warn');
  });

  it('за порогом остановки — остановка', () => {
    const v = stopDecision(fill(Math.ceil(1024 * BUFFER_STOP_RATIO), 1024));
    expect(v.action).toBe('stop');
  });

  it('предела нет — судить нечем, и это сказано полем, а не выдано за «всё в порядке»', () => {
    const v = stopDecision({ ...quota(100, 0), bufferLimitBytes: 0, limitBytes: 0 });
    expect(v.action).toBe('run');
    expect(v.filled).toBeNull();
    expect(v.say).toMatch(/судить о заполнении нечем/);
  });
});

describe('слово', () => {
  it('остановка называет ЧТО остановилось — своим именем, и род имени её не ломает', () => {
    const v = stopDecision(fill(1020, 1024), { what: 'сценарий дежурства' });
    expect(v.say).toMatch(/^Остановлено: сценарий дежурства\./u);
    // «Сценарий дежурства остановлена» — брак согласования; имя стоит после глагола именно
    // затем, чтобы фраза была верна для любого рода подставленного имени.
    expect(v.say).not.toMatch(/сценарий дежурства остановлена/u);
  });

  it('остановка называет ПОЧЕМУ и СКОЛЬКО ОСТАЛОСЬ', () => {
    const v = stopDecision(fill(1020, 1024), { bytesPerMinute: 2 * MB });
    expect(v.say).toMatch(/Буфер заполнен на 100%|Буфер заполнен на 99%/u);
    expect(v.say).toMatch(/свободно 4\.0 МБ/u);
    expect(v.say).toMatch(/около 2 мин записи/u);
  });

  it('остановка называет ВЫХОД: уборка буфера, а не «обратитесь к администратору»', () => {
    expect(stopDecision(fill(1020, 1024)).say).toMatch(/Управлении буфером/u);
  });

  it('темп неизвестен — минут в слове нет: врать числом нельзя', () => {
    const v = stopDecision(fill(1020, 1024));
    expect(v.minutesLeft).toBeNull();
    expect(v.say).not.toMatch(/мин записи/u);
    expect(v.say).toMatch(/свободно /u);
  });

  it('минуты считаются по наблюдаемому темпу, а не по догадке о формате звука', () => {
    // 224 МБ свободно при 5.3 МБ/мин — тот самый темп прода 27.08.
    const v = stopDecision(fill(800, 1024), { bytesPerMinute: 5.3 * MB });
    expect(v.minutesLeft).toBe(42);
  });

  it('нулевой и отрицательный темп минут не рождают', () => {
    expect(stopDecision(fill(800, 1024), { bytesPerMinute: 0 }).minutesLeft).toBeNull();
    expect(stopDecision(fill(800, 1024), { bytesPerMinute: -5 }).minutesLeft).toBeNull();
  });
});

describe('две двери судьи', () => {
  it('владелец квоты судит через stopDecisionOf и получает тот же вердикт', () => {
    expect(stopDecisionOf(quota(1020, 1024))).toEqual(stopDecision(fill(1020, 1024)));
  });

  it('буферная часть квоты берётся, а не общая: у сервера они разные', () => {
    const q: StorageQuota = {
      usedBytes: 10 * MB,
      limitBytes: 10240 * MB,
      backend: 'server',
      serverReachable: true,
      bufferUsedBytes: 1020 * MB,
      bufferLimitBytes: 1024 * MB,
    };
    // По общей квоте было бы 'run', по буферной — 'stop'. Судить обязаны буфер.
    expect(stopDecisionOf(q).action).toBe('stop');
  });
});

describe('три постулата названы полями, а не спрятаны в коде', () => {
  it('вопрос 2 — остановка ДО ОСВОБОЖДЕНИЯ: вердикт говорит это полем и словом', () => {
    const v = stopDecision(fill(1020, 1024));
    expect(v.resumable).toBe(true);
    expect(v.say).toMatch(/продолжится сама, когда место освободится/u);
  });

  it('вопрос 3 — сторож диска НЕ извещается: буфер есть квота приложения, не диск', () => {
    expect(stopDecision(fill(1020, 1024)).notifyDiskWatchdog).toBe(false);
  });

  it('вопрос 1 — порог долей, остаток минутами: доля есть всегда, минуты только при темпе', () => {
    const noRate = stopDecision(fill(1020, 1024));
    expect(noRate.filled).not.toBeNull();
    expect(noRate.minutesLeft).toBeNull();
  });
});
