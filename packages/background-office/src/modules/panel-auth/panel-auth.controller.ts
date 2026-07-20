import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import {
  clearSessionCookieString,
  PANEL_SESSION_TTL_SEC,
  sessionCookieString,
} from './panel-auth-core';
import { PanelUsersStore } from '../panel-users/panel-users.store';
import { MinRole, PanelPublic } from './panel-auth.decorators';
import { PanelAuthGuard, type PanelRequest } from './panel-auth.guard';
import { PanelAuthService } from './panel-auth.service';

/**
 * Auth-ручки панели (OP2). Все уровни ЯВНЫЕ (@PanelPublic/@MinRole) — guard
 * отклоняет неаннотированные ручки (default-deny); он же (OP5) ставит
 * Cache-Control: no-store, ведёт аудит и режет rate-limit на всё панельное.
 */
@Controller('v1/panel/auth')
@UseGuards(PanelAuthGuard)
export class PanelAuthController {
  // Явный @Inject — vitest-транспиляция не эмитит design:paramtypes (см. guard).
  constructor(
    @Inject(PanelAuthService) private readonly service: PanelAuthService,
    @Inject(PanelUsersStore) private readonly usersStore: PanelUsersStore,
  ) {}

  /**
   * Кто я: роль текущей cookie (public — честный ответ, не ошибка).
   * PU1 (#463, ADR 0005): для партнёрской сессии (sub=user:*, pv в cookie)
   * сверяет permVersion-эпоху со store — отставшая cookie тихо переиздаётся
   * со свежими грантами; revoked → public; store потерян (volume!) → роль
   * остаётся, гранты пустые (видимая деградация, не разлогин).
   */
  @Get('me')
  @PanelPublic()
  me(@Req() req: PanelRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const identity = req.panelIdentity ?? { role: 'public' as const, sub: null };
    const userId =
      identity.pv !== undefined && identity.sub?.startsWith('user:')
        ? identity.sub.slice('user:'.length)
        : null;
    if (userId === null) {
      return { role: identity.role, sub: identity.sub, grants: identity.grants ?? [] };
    }
    if (this.usersStore.isDegraded()) {
      return { role: identity.role, sub: identity.sub, grants: identity.grants ?? [] };
    }
    const user = this.usersStore.snapshot().users.find((u) => u.id === userId);
    if (!user) {
      // Store пуст/потерян — не наказываем партнёра разлогином (консилиум),
      // но грантов без истины store не отдаём.
      return { role: identity.role, sub: identity.sub, grants: [] };
    }
    if (user.revoked) {
      void res.header('Set-Cookie', clearSessionCookieString(this.service.cookieSecure()));
      return { role: 'public', sub: null, grants: [] };
    }
    if (user.permVersion !== identity.pv) {
      void res.header(
        'Set-Cookie',
        sessionCookieString(
          this.service.mintPartnerSession(user.id, user.grants, user.permVersion),
          PANEL_SESSION_TTL_SEC,
          this.service.cookieSecure(),
        ),
      );
      return { role: 'ally', sub: identity.sub, grants: [...user.grants] };
    }
    return { role: identity.role, sub: identity.sub, grants: identity.grants ?? [] };
  }

  /** Вход союзника по invite-коду → httpOnly session-cookie (ally). */
  @Post('invite')
  @PanelPublic()
  invite(@Body() body: { code?: string }, @Res({ passthrough: true }) res: FastifyReply) {
    if (!this.service.isConfigured()) {
      throw new ServiceUnavailableException('panel auth is not configured');
    }
    const code = body?.code?.trim();
    if (!code) throw new BadRequestException('code is required');
    const session = this.service.redeemInvite(code);
    if (!session) throw new ForbiddenException('invalid or expired invite code');
    void res.header(
      'Set-Cookie',
      sessionCookieString(session.token, PANEL_SESSION_TTL_SEC, this.service.cookieSecure()),
    );
    return { ok: true, role: session.role };
  }

  /** Старт GitHub OAuth (operator/owner): redirect на authorize с подписанным state. */
  @Get('github')
  @PanelPublic()
  github(@Res() res: FastifyReply) {
    if (!this.service.isGithubConfigured()) {
      throw new ServiceUnavailableException('github oauth is not configured');
    }
    void res.redirect(this.service.authorizeUrl(this.service.mintOauthState()));
  }

  /** Callback GitHub: state → code → user → allowlist-роль → cookie → redirect на витрину. */
  @Get('github/callback')
  @PanelPublic()
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: FastifyReply,
  ) {
    if (!this.service.isGithubConfigured()) {
      throw new ServiceUnavailableException('github oauth is not configured');
    }
    if (!state || !this.service.verifyOauthState(state)) {
      throw new ForbiddenException('invalid oauth state');
    }
    if (!code) throw new BadRequestException('code is required');
    const user = await this.service.exchangeGithubCode(code);
    if (!user) throw new ForbiddenException('github exchange failed');
    const role = this.service.roleForGithubUser(user);
    if (!role) throw new ForbiddenException('github user is not in the allowlist');
    void res.header(
      'Set-Cookie',
      sessionCookieString(
        this.service.mintSessionForGithub(user, role),
        PANEL_SESSION_TTL_SEC,
        this.service.cookieSecure(),
      ),
    );
    void res.redirect('/');
  }

  /** Выход: гашение cookie. */
  @Post('logout')
  @PanelPublic()
  logout(@Res({ passthrough: true }) res: FastifyReply) {
    void res.header('Set-Cookie', clearSessionCookieString(this.service.cookieSecure()));
    return { ok: true };
  }

  /** Смоук уровней: ручка видна только оператору+ (использует default-deny контур). */
  @Get('whoami-operator')
  @MinRole('operator')
  whoamiOperator(@Req() req: PanelRequest) {
    return { ok: true, role: req.panelIdentity?.role ?? null };
  }
}
