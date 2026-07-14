import { describe, expect, it } from 'vitest';
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { AppConfig } from '../../config/env.schema';
import { mintSessionToken, PANEL_SESSION_COOKIE, type PanelRole } from './panel-auth-core';
import { MinRole, PanelPublic } from './panel-auth.decorators';
import { PanelAuthGuard } from './panel-auth.guard';

const NOW_SEC = Math.floor(Date.now() / 1000);
const SECRET = 'guard-secret';

class Handlers {
  @PanelPublic()
  publicRoute() {}

  @MinRole('ally')
  allyRoute() {}

  @MinRole('operator')
  operatorRoute() {}

  bareRoute() {}
}

function makeContext(
  handlerName: keyof Handlers,
  cookie?: string,
  over: { ip?: string; headers?: Record<string, string>; onHeader?: (k: string, v: string) => void } = {},
): ExecutionContext {
  const handler = Handlers.prototype[handlerName];
  return {
    getHandler: () => handler,
    getClass: () => Handlers,
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { cookie, ...(over.headers ?? {}) },
        ip: over.ip ?? '127.0.0.1',
        path: '/v1/panel/test',
      }),
      getResponse: () => ({
        setHeader: over.onHeader ?? (() => undefined),
      }),
    }),
  } as unknown as ExecutionContext;
}

function makeGuard(config: Partial<AppConfig> = { PANEL_SESSION_SECRET: SECRET }) {
  return new PanelAuthGuard(new Reflector(), config as AppConfig);
}

function cookieFor(role: PanelRole): string {
  return `${PANEL_SESSION_COOKIE}=${mintSessionToken(SECRET, role, 't', NOW_SEC + 300)}`;
}

describe('PanelAuthGuard (default-deny, консилиум OP2)', () => {
  it('ручка БЕЗ аннотации → Forbidden даже для owner (default-deny)', () => {
    const guard = makeGuard();
    expect(() => guard.canActivate(makeContext('bareRoute', cookieFor('owner')))).toThrow(
      ForbiddenException,
    );
  });

  it('@PanelPublic: пропускает без cookie', () => {
    expect(makeGuard().canActivate(makeContext('publicRoute'))).toBe(true);
  });

  it('ally-ручка: public → 401, ally-cookie → ok, operator-cookie → ok', () => {
    const guard = makeGuard();
    expect(() => guard.canActivate(makeContext('allyRoute'))).toThrow(UnauthorizedException);
    expect(guard.canActivate(makeContext('allyRoute', cookieFor('ally')))).toBe(true);
    expect(guard.canActivate(makeContext('allyRoute', cookieFor('operator')))).toBe(true);
  });

  it('operator-ручка: ally → 403 (аутентифицирован, но уровень ниже)', () => {
    expect(() => makeGuard().canActivate(makeContext('operatorRoute', cookieFor('ally')))).toThrow(
      ForbiddenException,
    );
  });

  it('битая cookie = public: 401 на ally-ручке, ok на public', () => {
    const guard = makeGuard();
    const bad = `${PANEL_SESSION_COOKIE}=tampered`;
    expect(() => guard.canActivate(makeContext('allyRoute', bad))).toThrow(UnauthorizedException);
    expect(guard.canActivate(makeContext('publicRoute', bad))).toBe(true);
  });

  it('без PANEL_SESSION_SECRET любая cookie = public (вход невозможен, public-ручки живы)', () => {
    const guard = new PanelAuthGuard(new Reflector(), {} as AppConfig);
    expect(guard.canActivate(makeContext('publicRoute', cookieFor('owner')))).toBe(true);
    expect(() => guard.canActivate(makeContext('allyRoute', cookieFor('owner')))).toThrow(
      UnauthorizedException,
    );
  });

  it('OP5: каждый панельный ответ получает Cache-Control: no-store (включая отказ)', () => {
    const headers: Record<string, string> = {};
    const onHeader = (k: string, v: string) => {
      headers[k] = v;
    };
    makeGuard().canActivate(makeContext('publicRoute', undefined, { onHeader }));
    expect(headers['Cache-Control']).toBe('no-store');

    const denied: Record<string, string> = {};
    expect(() =>
      makeGuard().canActivate(
        makeContext('bareRoute', undefined, { onHeader: (k, v) => (denied[k] = v) }),
      ),
    ).toThrow(ForbiddenException);
    expect(denied['Cache-Control']).toBe('no-store');
  });

  it('OP5: rate-limit — 429 при превышении окна, ключи клиентов независимы (XFF)', () => {
    const guard = makeGuard({ PANEL_SESSION_SECRET: SECRET, PANEL_RATE_LIMIT_PER_MIN: '2' });
    const ctx = (ip: string) =>
      makeContext('publicRoute', undefined, { headers: { 'x-forwarded-for': ip } });
    expect(guard.canActivate(ctx('203.0.113.7'))).toBe(true);
    expect(guard.canActivate(ctx('203.0.113.7'))).toBe(true);
    let status = 0;
    try {
      guard.canActivate(ctx('203.0.113.7'));
    } catch (e) {
      status = (e as { getStatus: () => number }).getStatus();
    }
    expect(status).toBe(429);
    // другой клиент не задет
    expect(guard.canActivate(ctx('198.51.100.1'))).toBe(true);
  });
});
