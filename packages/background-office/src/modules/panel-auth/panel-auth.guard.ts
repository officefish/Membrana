import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { canAccess, isPanelRole, resolveIdentity, type PanelIdentity } from './panel-auth-core';
import { PANEL_MIN_ROLE_KEY } from './panel-auth.decorators';

export interface PanelRequest extends Request {
  panelIdentity?: PanelIdentity;
}

/**
 * Default-deny guard панельных ручек (OP2): ручка БЕЗ явного @MinRole/@PanelPublic
 * отклоняется всегда — публичность и уровни только явные (консилиум, Q2/Q3).
 */
@Injectable()
export class PanelAuthGuard implements CanActivate {
  constructor(
    // Явный @Inject: vitest-транспиляция не эмитит design:paramtypes,
    // неявная инъекция по типу оставляет параметр undefined.
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<unknown>(PANEL_MIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isPanelRole(required)) {
      // Нет аннотации — отказ независимо от роли (default-deny).
      throw new ForbiddenException('panel: endpoint has no explicit access level');
    }

    const req = context.switchToHttp().getRequest<PanelRequest>();
    const secret = this.config.PANEL_SESSION_SECRET?.trim() ?? '';
    const identity = secret
      ? resolveIdentity(req.headers.cookie, secret, Math.floor(Date.now() / 1000))
      : { role: 'public' as const, sub: null };
    req.panelIdentity = identity;

    if (canAccess(identity.role, required)) return true;
    if (identity.role === 'public') {
      throw new UnauthorizedException('panel: authentication required');
    }
    throw new ForbiddenException('panel: insufficient access level');
  }
}
