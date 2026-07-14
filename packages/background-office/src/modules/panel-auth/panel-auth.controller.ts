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
import type { Response } from 'express';

import {
  clearSessionCookieString,
  PANEL_SESSION_TTL_SEC,
  sessionCookieString,
} from './panel-auth-core';
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
  constructor(@Inject(PanelAuthService) private readonly service: PanelAuthService) {}

  /** Кто я: роль текущей cookie (public — честный ответ, не ошибка). */
  @Get('me')
  @PanelPublic()
  me(@Req() req: PanelRequest) {
    const identity = req.panelIdentity ?? { role: 'public', sub: null };
    return { role: identity.role, sub: identity.sub };
  }

  /** Вход союзника по invite-коду → httpOnly session-cookie (ally). */
  @Post('invite')
  @PanelPublic()
  invite(@Body() body: { code?: string }, @Res({ passthrough: true }) res: Response) {
    if (!this.service.isConfigured()) {
      throw new ServiceUnavailableException('panel auth is not configured');
    }
    const code = body?.code?.trim();
    if (!code) throw new BadRequestException('code is required');
    const session = this.service.redeemInvite(code);
    if (!session) throw new ForbiddenException('invalid or expired invite code');
    res.setHeader(
      'Set-Cookie',
      sessionCookieString(session.token, PANEL_SESSION_TTL_SEC, this.service.cookieSecure()),
    );
    return { ok: true, role: session.role };
  }

  /** Старт GitHub OAuth (operator/owner): redirect на authorize с подписанным state. */
  @Get('github')
  @PanelPublic()
  github(@Res() res: Response) {
    if (!this.service.isGithubConfigured()) {
      throw new ServiceUnavailableException('github oauth is not configured');
    }
    res.redirect(this.service.authorizeUrl(this.service.mintOauthState()));
  }

  /** Callback GitHub: state → code → user → allowlist-роль → cookie → redirect на витрину. */
  @Get('github/callback')
  @PanelPublic()
  async githubCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
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
    res.setHeader(
      'Set-Cookie',
      sessionCookieString(
        this.service.mintSessionForGithub(user, role),
        PANEL_SESSION_TTL_SEC,
        this.service.cookieSecure(),
      ),
    );
    res.redirect('/');
  }

  /** Выход: гашение cookie. */
  @Post('logout')
  @PanelPublic()
  logout(@Res({ passthrough: true }) res: Response) {
    res.setHeader('Set-Cookie', clearSessionCookieString(this.service.cookieSecure()));
    return { ok: true };
  }

  /** Смоук уровней: ручка видна только оператору+ (использует default-deny контур). */
  @Get('whoami-operator')
  @MinRole('operator')
  whoamiOperator(@Req() req: PanelRequest) {
    return { ok: true, role: req.panelIdentity?.role ?? null };
  }
}
