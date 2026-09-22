import { describe, expect, it } from 'vitest';

import {
  REGISTER_LIMIT_MAX_PER_WINDOW,
  REGISTER_LIMIT_WINDOW_MS,
  createRegisterRateLimiter,
  registerLimiterKey,
} from './register-rate-limiter';

describe('register-rate-limiter — скользящее окно двери регистрации (M3)', () => {
  it('числа контракта: порог 10, окно 600000 мс', () => {
    expect(REGISTER_LIMIT_MAX_PER_WINDOW).toBe(10);
    expect(REGISTER_LIMIT_WINDOW_MS).toBe(600_000);
  });

  it('десять попыток с одного адреса проходят, одиннадцатая — нет', () => {
    const limiter = createRegisterRateLimiter();
    const t0 = 1_000_000;
    for (let i = 0; i < 10; i++) {
      expect(limiter.hit('10.0.0.1', t0 + i)).toBe(true);
    }
    expect(limiter.hit('10.0.0.1', t0 + 10)).toBe(false);
    expect(limiter.count('10.0.0.1', t0 + 10)).toBe(10);
  });

  it('отказанная попытка не учитывается — окно не растягивается отказами', () => {
    const limiter = createRegisterRateLimiter(2, 1_000);
    expect(limiter.hit('k', 0)).toBe(true);
    expect(limiter.hit('k', 1)).toBe(true);
    expect(limiter.hit('k', 2)).toBe(false);
    expect(limiter.hit('k', 3)).toBe(false);
    expect(limiter.count('k', 3)).toBe(2);
  });

  it('окно скользит: попытка старше окна выпадает и освобождает место', () => {
    const limiter = createRegisterRateLimiter(2, 1_000);
    expect(limiter.hit('k', 0)).toBe(true);
    expect(limiter.hit('k', 500)).toBe(true);
    expect(limiter.hit('k', 999)).toBe(false);
    // ровно на границе первая попытка (t=0) ещё в окне: floor = 1000 - 1000 = 0, берём t > 0
    expect(limiter.hit('k', 1_000)).toBe(true);
    expect(limiter.count('k', 1_000)).toBe(2);
  });

  it('ключи независимы: лимит одного адреса не трогает другой', () => {
    const limiter = createRegisterRateLimiter(1, 1_000);
    expect(limiter.hit('a', 0)).toBe(true);
    expect(limiter.hit('a', 1)).toBe(false);
    expect(limiter.hit('b', 1)).toBe(true);
  });

  it('невалидные порог и окно — отказ на входе, не тихий лимит 0', () => {
    expect(() => createRegisterRateLimiter(0, 1_000)).toThrow(/порог/);
    expect(() => createRegisterRateLimiter(1.5, 1_000)).toThrow(/порог/);
    expect(() => createRegisterRateLimiter(1, 0)).toThrow(/окно/);
  });

  it('ключ (Р6): X-Forwarded-For «1.2.3.4, 10.0.0.9» → последний адрес 10.0.0.9, не первый', () => {
    expect(registerLimiterKey('1.2.3.4, 10.0.0.9', '127.0.0.1')).toBe('10.0.0.9');
    expect(registerLimiterKey(' 1.2.3.4 ,10.0.0.9 , ', '127.0.0.1')).toBe('10.0.0.9');
    expect(registerLimiterKey(['1.2.3.4', '10.0.0.9'], '127.0.0.1')).toBe('10.0.0.9');
  });

  it('ключ (Р6): без заголовка — req.ip; пустой заголовок — тоже req.ip', () => {
    expect(registerLimiterKey(undefined, '  203.0.113.7 ')).toBe('203.0.113.7');
    expect(registerLimiterKey('', '203.0.113.7')).toBe('203.0.113.7');
    expect(registerLimiterKey(' , ', '203.0.113.7')).toBe('203.0.113.7');
  });

  it('ключ (Р6): ни заголовка, ни адреса → "unknown", дверь не падает', () => {
    expect(registerLimiterKey(undefined, undefined)).toBe('unknown');
    expect(registerLimiterKey(null, '')).toBe('unknown');
  });
});
