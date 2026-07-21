import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import {
  clientKey,
  createSlidingWindowLimiter,
  PANEL_SESSION_TTL_SEC,
  sessionCookieString,
  type RateLimiter,
} from '../panel-auth/panel-auth-core';
import { OwnerAdmin, PanelPublic } from '../panel-auth/panel-auth.decorators';
import { PanelAuthGuard, type PanelRequest } from '../panel-auth/panel-auth.guard';
import { PanelAuthService } from '../panel-auth/panel-auth.service';
import {
  codePrefix,
  mintCode,
  normalizeGrants,
  redeemCode,
  revokeCode,
  revokeUser,
  setUserGrants,
  type PromoCode,
} from './panel-users-core';
import { PanelUsersStore } from './panel-users.store';

/** Q3 (консилиум Р6): регистрация жёстче общего панельного лимита. */
const REGISTER_MAX_PER_WINDOW = 5;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

/** Кап бессрочности кода по умолчанию: 30 дней, как у invite. */
const DEFAULT_CODE_DAYS = 30;
const MAX_CODE_DAYS = 365;

/**
 * Ручки реестра партнёров (PU1, эпик #463, ADR 0005). Регистрация — публичная
 * с собственным лимитером; admin-семейство — только owner, не-owner получает
 * 404 (@OwnerAdmin). Ошибки регистрации не различают причину наружу (Q3).
 */
@Controller('v1/panel')
@UseGuards(PanelAuthGuard)
export class PanelUsersController {
  private readonly registerLimiter: RateLimiter = createSlidingWindowLimiter(
    REGISTER_MAX_PER_WINDOW,
    REGISTER_WINDOW_MS,
  );

  constructor(
    @Inject(PanelUsersStore) private readonly store: PanelUsersStore,
    @Inject(PanelAuthService) private readonly auth: PanelAuthService,
  ) {}

  private nowIso(): string {
    return new Date().toISOString();
  }

  private actor(req: PanelRequest): string {
    return req.panelIdentity?.sub ?? 'owner';
  }

  /** Регистрация партнёра: промокод + имя → пользователь + session-cookie с грантами. */
  @Post('register')
  @PanelPublic()
  register(
    @Body() body: { code?: string; name?: string },
    @Req() req: PanelRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    if (!this.auth.isConfigured()) {
      throw new ServiceUnavailableException('panel auth is not configured');
    }
    const key = clientKey(req.headers['x-forwarded-for'] as string | undefined, req.ip);
    if (!this.registerLimiter.hit(key, Date.now())) {
      throw new HttpException('panel: too many requests', 429);
    }
    const code = body?.code?.trim() ?? '';
    const name = body?.name?.trim() ?? '';
    // Snapshot-first: между snapshot() и mutate() нет await — состояние то же
    // (однопоточный Node), а TS-нарровинг не ломается замыканием.
    const result = redeemCode(this.store.snapshot(), code, name, this.auth.now(), this.nowIso());
    if (!result || !this.store.mutate(() => result.state)) {
      // Q3: одна формулировка на все причины (нет кода/истёк/исчерпан/отозван).
      throw new ForbiddenException('code was not accepted');
    }
    const { user } = result;
    void res.header(
      'Set-Cookie',
      sessionCookieString(
        this.auth.mintPartnerSession(user.id, user.grants, user.permVersion),
        PANEL_SESSION_TTL_SEC,
        this.auth.cookieSecure(),
      ),
    );
    return { ok: true, role: 'ally', name: user.name, grants: user.grants };
  }

  // ─── admin (owner, 404 не-owner'у) ────────────────────────────────────────────────

  @Get('admin/users')
  @OwnerAdmin()
  listUsers() {
    const state = this.store.snapshot();
    const codeLabel = new Map(state.codes.map((c) => [c.id, c.label]));
    return {
      degraded: this.store.isDegraded(),
      users: state.users.map((u) => ({
        id: u.id,
        name: u.name,
        grants: u.grants,
        permVersion: u.permVersion,
        revoked: u.revoked,
        createdAt: u.createdAt,
        codeLabel: codeLabel.get(u.codeId) ?? null,
      })),
      audit: state.audit.slice(-50),
    };
  }

  @Patch('admin/users/:id/grants')
  @OwnerAdmin()
  patchGrants(
    @Param('id') id: string,
    @Body() body: { grants?: unknown },
    @Req() req: PanelRequest,
  ) {
    const grants = normalizeGrants(body?.grants);
    const next = this.store.mutate((state) =>
      setUserGrants(state, id, grants, this.actor(req), this.nowIso()),
    );
    if (!next) throw new ForbiddenException('user not found or store degraded');
    const user = next.users.find((u) => u.id === id)!;
    return { ok: true, id, grants: user.grants, permVersion: user.permVersion };
  }

  @Post('admin/users/:id/revoke')
  @OwnerAdmin()
  revokeUser(@Param('id') id: string, @Req() req: PanelRequest) {
    const next = this.store.mutate((state) => revokeUser(state, id, this.actor(req), this.nowIso()));
    if (!next) throw new ForbiddenException('user not found or store degraded');
    return { ok: true, id };
  }

  @Get('admin/promo-codes')
  @OwnerAdmin()
  listCodes() {
    const state = this.store.snapshot();
    return {
      codes: state.codes.map((c) => ({
        id: c.id,
        // Сам код показывается ОДИН раз при чеканке — в списке только префикс.
        codePrefix: codePrefix(c.code),
        label: c.label,
        grants: c.grants,
        expiresAt: c.expiresAt,
        maxUses: c.maxUses,
        usedCount: c.usedCount,
        revoked: c.revoked,
        createdAt: c.createdAt,
      })),
    };
  }

  @Post('admin/promo-codes')
  @OwnerAdmin()
  createCode(
    @Body() body: { label?: string; grants?: unknown; days?: number; maxUses?: number },
    @Req() req: PanelRequest,
  ) {
    const label = body?.label?.trim().slice(0, 64) ?? '';
    if (!label) throw new ForbiddenException('label is required');
    const grants = normalizeGrants(body?.grants);
    if (grants.length === 0) throw new ForbiddenException('grants are required');
    const days = Math.min(Math.max(1, Math.floor(body?.days ?? DEFAULT_CODE_DAYS)), MAX_CODE_DAYS);
    const maxUses = Math.min(Math.max(1, Math.floor(body?.maxUses ?? 1)), 1000);

    // Snapshot-first (см. register): без await между чтением и записью.
    const result = mintCode(
      this.store.snapshot(),
      { label, grants, expiresAt: this.auth.now() + days * 24 * 60 * 60, maxUses },
      this.actor(req),
      this.nowIso(),
    );
    if (!this.store.mutate(() => result.state)) throw new ForbiddenException('store degraded');
    const promo: PromoCode = result.code;
    // Единственное место, где код уходит наружу целиком (консилиум Р5).
    return {
      ok: true,
      id: promo.id,
      code: promo.code,
      label: promo.label,
      grants: promo.grants,
      expiresAt: promo.expiresAt,
      maxUses: promo.maxUses,
    };
  }

  @Post('admin/promo-codes/:id/revoke')
  @OwnerAdmin()
  revokePromoCode(@Param('id') id: string, @Req() req: PanelRequest) {
    const next = this.store.mutate((state) => revokeCode(state, id, this.actor(req), this.nowIso()));
    if (!next) throw new ForbiddenException('code not found or store degraded');
    return { ok: true, id };
  }
}
