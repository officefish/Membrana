import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Reflector } from '@nestjs/core';
import { PATH_METADATA } from '@nestjs/common/constants';

import { isPanelRole } from './panel-auth-core';
import { PANEL_MIN_ROLE_KEY } from './panel-auth.decorators';
import { PanelAuthController } from './panel-auth.controller';

/**
 * Инвентаризация default-deny (OP5, DoD эпика): у КАЖДОЙ ручки панельного
 * контроллера — явный @MinRole/@PanelPublic. Guard и так отклонит неаннотированную,
 * но этот тест ловит дыру на CI ДО того, как её увидит пользователь как 403.
 */
describe('panel-auth: инвентаризация уровней доступа', () => {
  it('каждый HTTP-метод контроллера имеет явную аннотацию уровня', () => {
    const reflector = new Reflector();
    const proto = PanelAuthController.prototype as Record<string, unknown>;
    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (name) =>
        name !== 'constructor' &&
        typeof proto[name] === 'function' &&
        // HTTP-ручка = метод с path-метаданными Nest (@Get/@Post/...)
        Reflect.getMetadata(PATH_METADATA, proto[name] as object) !== undefined,
    );

    expect(methodNames.length).toBeGreaterThanOrEqual(6);

    const missing = methodNames.filter(
      (name) => !isPanelRole(reflector.get(PANEL_MIN_ROLE_KEY, proto[name] as never)),
    );
    expect(missing, `ручки без явного уровня: ${missing.join(', ')}`).toEqual([]);
  });
});
