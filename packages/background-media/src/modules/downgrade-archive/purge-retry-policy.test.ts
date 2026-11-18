/**
 * Зубы политики повторов уборщика (#2632 g3a, DoD плана `docs/sprint/cut/archive-gc-journal-2588.json`):
 * attempt ≥ 5 → dead_letter; backoff монотонен; сворачивание исходов в счётчики прогона.
 *
 * Порчи: предел `>` вместо `>=` → красный (5-я неудача даёт retry); backoff без потолка → красный
 * (потолок); already_absent считать неудачей → красный (повтор не идемпотентен); jobsFailed считать
 * вместе с dead_letter → красный (счётчики).
 */
import { describe, expect, it } from 'vitest';

import {
  backoffMs,
  decideAfterAttempt,
  EMPTY_RUN_COUNTERS,
  foldRunCounters,
  isDue,
  isExhausted,
  mergeRunCounters,
  PURGE_BACKOFF_BASE_MS,
  PURGE_BACKOFF_CAP_MS,
  PURGE_MAX_ATTEMPTS,
  RETRY_POLICY_JOB_STATUSES,
  RETRY_POLICY_PATH_ACTIONS,
  type RetryPolicyPathOutcome,
  type RetryTransition,
} from './purge-retry-policy';

const NOW = new Date('2026-11-18T10:00:00.000Z');
const HOUR = 60 * 60 * 1000;

const removed = (bytes: number): RetryPolicyPathOutcome => ({ action: 'removed', bytesFreed: bytes });
const absent: RetryPolicyPathOutcome = { action: 'already_absent' };
const failed = (error = 'rm:EBUSY'): RetryPolicyPathOutcome => ({ action: 'failed', error });

describe('словарь — литералы g1a/g2', () => {
  it('статусы задания и исходы пути совпадают с вердиктами 3–4', () => {
    expect([...RETRY_POLICY_JOB_STATUSES]).toEqual(['pending', 'claimed', 'succeeded', 'retry', 'dead_letter']);
    expect([...RETRY_POLICY_PATH_ACTIONS]).toEqual(['removed', 'already_absent', 'failed']);
    expect(PURGE_MAX_ATTEMPTS).toBe(5); // Т2
  });
});

describe('backoffMs', () => {
  it('первая попытка без паузы, далее base·2^(n−1)', () => {
    expect(backoffMs(0)).toBe(0);
    expect(backoffMs(1)).toBe(PURGE_BACKOFF_BASE_MS);
    expect(backoffMs(2)).toBe(2 * PURGE_BACKOFF_BASE_MS);
    expect(backoffMs(4)).toBe(8 * PURGE_BACKOFF_BASE_MS);
  });

  it('монотонен (не убывает) и не выше потолка на широком диапазоне', () => {
    let prev = -1;
    for (let n = 0; n <= 200; n += 1) {
      const v = backoffMs(n);
      expect(v).toBeGreaterThanOrEqual(prev);
      expect(v).toBeLessThanOrEqual(PURGE_BACKOFF_CAP_MS);
      expect(Number.isFinite(v)).toBe(true);
      prev = v;
    }
    expect(backoffMs(200)).toBe(PURGE_BACKOFF_CAP_MS);
  });

  it('недопустимый attempt — RangeError', () => {
    expect(() => backoffMs(-1)).toThrow(RangeError);
    expect(() => backoffMs(1.5)).toThrow(RangeError);
    expect(() => backoffMs(Number.NaN)).toThrow(RangeError);
  });
});

describe('isExhausted', () => {
  it('граница ровно на 5', () => {
    expect(isExhausted(4)).toBe(false);
    expect(isExhausted(5)).toBe(true);
    expect(isExhausted(6)).toBe(true);
  });
});

describe('decideAfterAttempt', () => {
  it('все пути removed/already_absent → succeeded, nextAttemptAt null, байты только у removed', () => {
    const t = decideAfterAttempt({ attempt: 0 }, [removed(100), absent, removed(23)], NOW);
    expect(t).toEqual({ status: 'succeeded', attempt: 1, nextAttemptAt: null, bytesFreed: 123, lastError: null });
  });

  it('повтор, где всё уже снято (только already_absent) → succeeded: повтор идемпотентен', () => {
    expect(decideAfterAttempt({ attempt: 2 }, [absent, absent], NOW).status).toBe('succeeded');
  });

  it('пустой снимок путей → succeeded (удалять нечего)', () => {
    expect(decideAfterAttempt({ attempt: 0 }, [], NOW)).toMatchObject({ status: 'succeeded', bytesFreed: 0 });
  });

  it('хоть один failed → retry с паузой backoff(attempt+1); удалённое засчитано', () => {
    const t = decideAfterAttempt({ attempt: 0 }, [removed(50), failed('rm:EBUSY'), failed('stat_after:EIO')], NOW);
    expect(t.status).toBe('retry');
    expect(t.attempt).toBe(1);
    expect(t.nextAttemptAt?.toISOString()).toBe(new Date(NOW.getTime() + backoffMs(1)).toISOString());
    expect(t.bytesFreed).toBe(50);
    expect(t.lastError).toBe('2 of 3 paths failed; first: rm:EBUSY');
  });

  it('сводка отказа не несёт адресов файлов', () => {
    const t = decideAfterAttempt({ attempt: 0 }, [failed('after_exists')], NOW);
    expect(t.lastError).not.toMatch(/[\\/]/);
  });

  it('пять неудач подряд: retry ×4, затем dead_letter (Т2)', () => {
    const seen: RetryTransition['status'][] = [];
    let attempt = 0;
    let at = NOW;
    for (let i = 0; i < PURGE_MAX_ATTEMPTS; i += 1) {
      const t = decideAfterAttempt({ attempt }, [failed()], at);
      seen.push(t.status);
      attempt = t.attempt;
      at = t.nextAttemptAt ?? at;
    }
    expect(seen).toEqual(['retry', 'retry', 'retry', 'retry', 'dead_letter']);
    expect(attempt).toBe(5);
  });

  it('dead_letter: nextAttemptAt null, lastError сохранён', () => {
    const t = decideAfterAttempt({ attempt: 4 }, [failed('rm:EPERM')], NOW);
    expect(t).toMatchObject({ status: 'dead_letter', attempt: 5, nextAttemptAt: null, lastError: '1 of 1 paths failed; first: rm:EPERM' });
  });

  it('успех на последней попытке — succeeded, не dead_letter', () => {
    expect(decideAfterAttempt({ attempt: 4 }, [removed(1)], NOW).status).toBe('succeeded');
  });

  it('паузы между повторами растут', () => {
    const gaps = [0, 1, 2, 3].map((a) => {
      const t = decideAfterAttempt({ attempt: a }, [failed()], NOW);
      return (t.nextAttemptAt?.getTime() ?? 0) - NOW.getTime();
    });
    expect(gaps).toEqual([HOUR, 2 * HOUR, 4 * HOUR, 8 * HOUR]);
  });
});

describe('isDue', () => {
  it('pending — годно; succeeded/dead_letter/claimed — нет', () => {
    expect(isDue({ status: 'pending', attempt: 0, nextAttemptAt: null }, NOW)).toBe(true);
    expect(isDue({ status: 'succeeded', attempt: 1, nextAttemptAt: null }, NOW)).toBe(false);
    expect(isDue({ status: 'dead_letter', attempt: 5, nextAttemptAt: null }, NOW)).toBe(false);
    expect(isDue({ status: 'claimed', attempt: 1, nextAttemptAt: null }, NOW)).toBe(false);
  });

  it('retry — только когда наступил nextAttemptAt (граница включительно)', () => {
    const at = new Date(NOW.getTime() + HOUR);
    expect(isDue({ status: 'retry', attempt: 1, nextAttemptAt: at }, NOW)).toBe(false);
    expect(isDue({ status: 'retry', attempt: 1, nextAttemptAt: at }, at)).toBe(true);
    expect(isDue({ status: 'retry', attempt: 1, nextAttemptAt: null }, NOW)).toBe(true);
  });

  it('исчерпанные попытки не захватываются даже в retry/pending', () => {
    expect(isDue({ status: 'retry', attempt: 5, nextAttemptAt: null }, NOW)).toBe(false);
    expect(isDue({ status: 'pending', attempt: 5, nextAttemptAt: null }, NOW)).toBe(false);
  });
});

describe('foldRunCounters', () => {
  it('пустой прогон → нули', () => {
    expect(foldRunCounters([])).toEqual(EMPTY_RUN_COUNTERS);
    expect(EMPTY_RUN_COUNTERS).toEqual({ jobsTotal: 0, jobsSucceeded: 0, jobsFailed: 0, jobsDeadLetter: 0, bytesFreed: 0 });
  });

  it('сворачивает статусы и байты; retry → jobsFailed, dead_letter отдельно', () => {
    const c = foldRunCounters([
      { status: 'succeeded', bytesFreed: 100 },
      { status: 'succeeded', bytesFreed: 0 },
      { status: 'retry', bytesFreed: 40 },
      { status: 'dead_letter', bytesFreed: 0 },
    ]);
    expect(c).toEqual({ jobsTotal: 4, jobsSucceeded: 2, jobsFailed: 1, jobsDeadLetter: 1, bytesFreed: 140 });
    expect(c.jobsSucceeded + c.jobsFailed + c.jobsDeadLetter).toBe(c.jobsTotal);
  });

  it('прямо из решений политики: fold(a ++ b) = merge(fold(a), fold(b))', () => {
    const a = [decideAfterAttempt({ attempt: 0 }, [removed(10)], NOW), decideAfterAttempt({ attempt: 0 }, [failed()], NOW)];
    const b = [decideAfterAttempt({ attempt: 4 }, [failed()], NOW), decideAfterAttempt({ attempt: 1 }, [absent, removed(5)], NOW)];
    expect(foldRunCounters([...a, ...b])).toEqual(mergeRunCounters(foldRunCounters(a), foldRunCounters(b)));
    expect(foldRunCounters([...a, ...b])).toEqual({ jobsTotal: 4, jobsSucceeded: 2, jobsFailed: 1, jobsDeadLetter: 1, bytesFreed: 15 });
  });

  it('EMPTY_RUN_COUNTERS заморожен', () => {
    expect(Object.isFrozen(EMPTY_RUN_COUNTERS)).toBe(true);
  });
});
