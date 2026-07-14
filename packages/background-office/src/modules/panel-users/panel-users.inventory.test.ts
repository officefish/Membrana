import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';

import { isPanelRole } from '../panel-auth/panel-auth-core';
import { PANEL_DENY_AS_404_KEY, PANEL_MIN_ROLE_KEY } from '../panel-auth/panel-auth.decorators';
import { PanelUsersController } from './panel-users.controller';

/**
 * Инвентарный КОНТРАКТ-ТЕСТ ручек PU1 (консилиум panel-promo-access Р7):
 * PU2/PU3 пишутся против этого списка путей/методов/уровней. Изменение
 * контракта = осознанная правка этого теста, не сюрприз панели.
 */
describe('panel-users: инвентаризация контракта ручек', () => {
  const reflector = new Reflector();
  const proto = PanelUsersController.prototype as Record<string, unknown>;
  const handlers = Object.getOwnPropertyNames(proto).filter(
    (name) =>
      name !== 'constructor' &&
      typeof proto[name] === 'function' &&
      Reflect.getMetadata(PATH_METADATA, proto[name] as object) !== undefined,
  );

  function route(name: string): { method: RequestMethod; path: string } {
    return {
      method: Reflect.getMetadata(METHOD_METADATA, proto[name] as object) as RequestMethod,
      path: String(Reflect.getMetadata(PATH_METADATA, proto[name] as object)),
    };
  }

  it('контракт: полный список ручек, методов и уровней (PU2/PU3 пишутся против него)', () => {
    const contract = handlers
      .map((name) => {
        const { method, path } = route(name);
        return {
          path,
          method: RequestMethod[method],
          minRole: reflector.get(PANEL_MIN_ROLE_KEY, proto[name] as never) as string,
          denyAs404: reflector.get(PANEL_DENY_AS_404_KEY, proto[name] as never) === true,
        };
      })
      // Разделитель-пробел: '/' сортировался бы ПОСЛЕ конца строки-префикса.
      .sort((a, b) => (`${a.path} ${a.method}` < `${b.path} ${b.method}` ? -1 : 1));

    expect(contract).toEqual([
      { path: 'admin/promo-codes', method: 'GET', minRole: 'owner', denyAs404: true },
      { path: 'admin/promo-codes', method: 'POST', minRole: 'owner', denyAs404: true },
      { path: 'admin/promo-codes/:id/revoke', method: 'POST', minRole: 'owner', denyAs404: true },
      { path: 'admin/users', method: 'GET', minRole: 'owner', denyAs404: true },
      { path: 'admin/users/:id/grants', method: 'PATCH', minRole: 'owner', denyAs404: true },
      { path: 'admin/users/:id/revoke', method: 'POST', minRole: 'owner', denyAs404: true },
      { path: 'register', method: 'POST', minRole: 'public', denyAs404: false },
    ]);
  });

  it('default-deny: каждая ручка аннотирована уровнем; admin — только owner и 404', () => {
    const missing = handlers.filter(
      (name) => !isPanelRole(reflector.get(PANEL_MIN_ROLE_KEY, proto[name] as never)),
    );
    expect(missing, `ручки без явного уровня: ${missing.join(', ')}`).toEqual([]);

    for (const name of handlers) {
      const { path } = route(name);
      if (path.startsWith('admin/')) {
        expect(reflector.get(PANEL_MIN_ROLE_KEY, proto[name] as never), path).toBe('owner');
        expect(reflector.get(PANEL_DENY_AS_404_KEY, proto[name] as never), path).toBe(true);
      }
    }
  });
});
