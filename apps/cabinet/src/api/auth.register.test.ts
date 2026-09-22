import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AuthApiError,
  mapRegisterErrorStatus,
  registerRequest,
} from './auth';

const SESSION = {
  token: 'session-token',
  expiresAt: '2026-09-22T21:00:00.000Z',
  user: { id: 'user-1', login: 'owner', role: 'user' as const },
};

function response(status: number, message = 'server detail'): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('registerRequest', () => {
  it('отправляет код вместе с логином и паролем и возвращает сессию', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(SESSION), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(registerRequest('owner', 'secret123', 'invite-code')).resolves.toEqual(SESSION);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'owner', password: 'secret123', code: 'invite-code' }),
    });
  });

  it.each([
    [401, 'Регистрация сейчас закрыта.'],
    [403, 'Регистрация не принята.'],
    [429, 'Слишком много попыток. Подождите 10 минут.'],
    [503, 'Сервис временно недоступен. Попробуйте ещё раз.'],
    [500, 'Не удалось выполнить регистрацию. Попробуйте ещё раз.'],
  ])('сопоставляет статус %s с одной фразой', async (status, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(status)));

    const error = await registerRequest('owner', 'secret123', 'invite-code').catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(AuthApiError);
    expect(error).toMatchObject({ status, message });
    expect(mapRegisterErrorStatus(status)).toBe(message);
  });

  it.each(['not_found', 'already_used'])('не показывает причину отказа 403: %s', async (reason) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403, reason)));

    await expect(registerRequest('owner', 'secret123', 'invite-code')).rejects.toMatchObject({
      status: 403,
      message: 'Регистрация не принята.',
    });
  });

  it('даёт отдельную фразу при сетевом сбое', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));

    await expect(registerRequest('owner', 'secret123', 'invite-code')).rejects.toMatchObject({
      status: null,
      message: 'Нет связи с сервером. Проверьте интернет и попробуйте снова.',
    });
  });
});
