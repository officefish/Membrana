/**
 * Зубы сессии C — дверь `POST /v1/auth/register` на уровне контроллера (решение M3):
 * выключено → 401 раньше ограничителя; ограничитель 10 / 600000 мс по адресу → 429;
 * поле `code` доезжает до сервиса. Сервис — подменный, сети и базы нет.
 */
import { HttpException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthController, REGISTRATION_TOO_MANY_REQUESTS_MESSAGE } from './auth.controller';
import { REGISTRATION_DISABLED_MESSAGE } from './auth.service';

function makeService(enabled = true) {
  return {
    registrationEnabled: vi.fn(() => enabled),
    register: vi.fn(async (login: string, _password: string, code: string) => ({
      token: 'tok',
      expiresAt: new Date(0).toISOString(),
      user: { id: 'u-1', login, role: 'user' as const, codeSeen: code },
    })),
  };
}

const req = (ip: string) => ({ ip, headers: {} }) as never;
const body = { login: 'newcomer', password: 'password-8+', code: 'ABCD' };

async function expectStatus(promise: Promise<unknown>, status: number, message: string) {
  let caught: unknown;
  try {
    await promise;
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(HttpException);
  const err = caught as HttpException;
  expect(err.getStatus()).toBe(status);
  const res = err.getResponse();
  expect(typeof res === 'string' ? res : (res as { message?: unknown }).message).toBe(message);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-22T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AuthController.register — ограничитель и порядок шагов 1–2', () => {
  it('передаёт в сервис логин, пароль и код из тела', async () => {
    const service = makeService();
    const controller = new AuthController(service as never);
    await controller.register(body, req('203.0.113.7'));
    expect(service.register).toHaveBeenCalledWith('newcomer', 'password-8+', 'ABCD');
  });

  it('десять попыток с одного адреса проходят, одиннадцатая → 429 «Too many requests», сервис не вызван', async () => {
    const service = makeService();
    const controller = new AuthController(service as never);
    for (let i = 0; i < 10; i++) {
      await controller.register(body, req('203.0.113.7'));
    }
    expect(service.register).toHaveBeenCalledTimes(10);
    await expectStatus(controller.register(body, req('203.0.113.7')), 429, REGISTRATION_TOO_MANY_REQUESTS_MESSAGE);
    expect(service.register).toHaveBeenCalledTimes(10);
  });

  it('другой адрес не делит окно с первым', async () => {
    const service = makeService();
    const controller = new AuthController(service as never);
    for (let i = 0; i < 10; i++) {
      await controller.register(body, req('203.0.113.7'));
    }
    await expect(controller.register(body, req('203.0.113.8'))).resolves.toBeTruthy();
  });

  it('окно 600000 мс: через 10 минут адрес снова получает попытку', async () => {
    const service = makeService();
    const controller = new AuthController(service as never);
    for (let i = 0; i < 10; i++) {
      await controller.register(body, req('203.0.113.7'));
    }
    await expectStatus(controller.register(body, req('203.0.113.7')), 429, REGISTRATION_TOO_MANY_REQUESTS_MESSAGE);
    vi.advanceTimersByTime(600_000 + 1);
    await expect(controller.register(body, req('203.0.113.7'))).resolves.toBeTruthy();
  });

  it('регистрация выключена → 401 «Registration is disabled» до ограничителя: попытки не учитываются', async () => {
    const service = makeService(false);
    const controller = new AuthController(service as never);
    for (let i = 0; i < 12; i++) {
      await expectStatus(controller.register(body, req('203.0.113.7')), 401, REGISTRATION_DISABLED_MESSAGE);
    }
    expect(service.register).not.toHaveBeenCalled();
    // окно не тронуто: после включения первая же попытка проходит
    service.registrationEnabled.mockReturnValue(true);
    await expect(controller.register(body, req('203.0.113.7'))).resolves.toBeTruthy();
  });

  it('адрес не пришёл → ключ «unknown», дверь не падает', async () => {
    const service = makeService();
    const controller = new AuthController(service as never);
    await expect(controller.register(body, req(''))).resolves.toBeTruthy();
    await expect(controller.register(body, { headers: {} } as never)).resolves.toBeTruthy();
  });
});
