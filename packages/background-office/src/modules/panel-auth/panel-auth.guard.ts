import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import {
  canAccess,
  clientKey,
  createSlidingWindowLimiter,
  isPanelRole,
  resolveIdentity,
  type PanelIdentity,
  type RateLimiter,
} from './panel-auth-core';
import { PANEL_DENY_AS_404_KEY, PANEL_MIN_ROLE_KEY } from './panel-auth.decorators';

export interface PanelRequest extends Request {
  panelIdentity?: PanelIdentity;
}

const RATE_WINDOW_MS = 60_000;
const RATE_DEFAULT_PER_MIN = 120;

/**
 * Default-deny guard панельных ручек (OP2) + Q3-hardening (OP5) в единой точке:
 * ручка БЕЗ явного @MinRole/@PanelPublic отклоняется всегда; каждый панельный
 * ответ — `Cache-Control: no-store`; rate-limit скользящим окном по клиенту
 * (429 при превышении, anti-scraping); аудит-лог доступа (роль/путь/вердикт).
 */
@Injectable()
export class PanelAuthGuard implements CanActivate {
  private readonly logger = new Logger(PanelAuthGuard.name);
  private readonly limiter: RateLimiter;

  constructor(
    // Явный @Inject: vitest-транспиляция не эмитит design:paramtypes,
    // неявная инъекция по типу оставляет параметр undefined.
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {
    const raw = Number.parseInt(this.config.PANEL_RATE_LIMIT_PER_MIN ?? '', 10);
    const perMin = Number.isFinite(raw) && raw > 0 ? raw : RATE_DEFAULT_PER_MIN;
    this.limiter = createSlidingWindowLimiter(perMin, RATE_WINDOW_MS);
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<PanelRequest>();
    const res = context.switchToHttp().getResponse<Response>();
    // Q3: панельные ответы не кэшируются нигде на пути (включая ошибки и redirect).
    res.setHeader('Cache-Control', 'no-store');

    const key = clientKey(req.headers['x-forwarded-for'] as string | undefined, req.ip);
    if (!this.limiter.hit(key, Date.now())) {
      this.logger.warn({ key, path: req.path }, 'panel: rate limit exceeded');
      throw new HttpException('panel: too many requests', 429);
    }

    const required = this.reflector.getAllAndOverride<unknown>(PANEL_MIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isPanelRole(required)) {
      // Нет аннотации — отказ независимо от роли (default-deny).
      this.logger.warn({ path: req.path }, 'panel: endpoint without explicit access level');
      throw new ForbiddenException('panel: endpoint has no explicit access level');
    }

    const secret = this.config.PANEL_SESSION_SECRET?.trim() ?? '';
    const identity = secret
      ? resolveIdentity(req.headers.cookie, secret, Math.floor(Date.now() / 1000))
      : { role: 'public' as const, sub: null };
    req.panelIdentity = identity;

    const allowed = canAccess(identity.role, required);
    // Аудит доступа (Q3): роль/уровень/путь/вердикт; sub без значения cookie.
    this.logger.log(
      { path: req.path, required, role: identity.role, sub: identity.sub, allowed },
      'panel: access',
    );

    if (allowed) return true;
    // PU1 (#463, Q3): admin-ручки не подтверждают существование не-owner'у.
    const denyAs404 = this.reflector.getAllAndOverride<unknown>(PANEL_DENY_AS_404_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (denyAs404 === true) {
      throw new NotFoundException();
    }
    if (identity.role === 'public') {
      throw new UnauthorizedException('panel: authentication required');
    }
    throw new ForbiddenException('panel: insufficient access level');
  }
}
