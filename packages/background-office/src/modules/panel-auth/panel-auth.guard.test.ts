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

function makeContext(handlerName: keyof Handlers, cookie?: string): ExecutionContext {
  const handler = Handlers.prototype[handlerName];
  return {
    getHandler: () => handler,
    getClass: () => Handlers,
    switchToHttp: () => ({ getRequest: () => ({ headers: { cookie } }) }),
  } as unknown as ExecutionContext;
}

function makeGuard() {
  return new PanelAuthGuard(new Reflector(), { PANEL_SESSION_SECRET: SECRET } as AppConfig);
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
});
