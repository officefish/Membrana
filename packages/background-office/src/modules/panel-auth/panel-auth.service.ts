import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import {
  buildGithubAuthorizeUrl,
  mintPartnerSessionToken,
  mintSessionToken,
  PANEL_SESSION_TTL_SEC,
  parseAllowlist,
  signPayload,
  verifyInviteCode,
  verifyPayload,
  type PanelRole,
} from './panel-auth-core';

const STATE_TTL_SEC = 10 * 60;

export interface GithubUser {
  id: string;
  login: string;
}

/**
 * Сервис auth-контура панели (OP2). Stateless: секреты и allowlist — из env,
 * ничего не персистится. GitHub OAuth — plain fetch (без passport: office уже
 * ходит в GitHub плоским fetch в GithubService, новая зависимость не нужна).
 */
@Injectable()
export class PanelAuthService {
  private readonly logger = new Logger(PanelAuthService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.PANEL_SESSION_SECRET?.trim());
  }

  isGithubConfigured(): boolean {
    return (
      this.isConfigured() &&
      Boolean(this.config.PANEL_GITHUB_CLIENT_ID?.trim()) &&
      Boolean(this.config.PANEL_GITHUB_CLIENT_SECRET?.trim())
    );
  }

  private sessionSecret(): string {
    return this.config.PANEL_SESSION_SECRET?.trim() ?? '';
  }

  /** Invite-секрет: отдельный, с fallback на session-секрет (один секрет — валидная минимальная конфигурация). */
  private inviteSecret(): string {
    return this.config.PANEL_INVITE_SECRET?.trim() || this.sessionSecret();
  }

  private publicUrl(): string {
    return (this.config.PANEL_PUBLIC_URL?.trim() || 'https://panel.mmbrn.tech').replace(/\/$/, '');
  }

  redirectUri(): string {
    return `${this.publicUrl()}/v1/panel/auth/github/callback`;
  }

  cookieSecure(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  now(): number {
    return Math.floor(Date.now() / 1000);
  }

  /** Обмен ally-кода на сессию. null = код невалиден/просрочен. */
  redeemInvite(code: string): { token: string; role: PanelRole } | null {
    const invite = verifyInviteCode(this.inviteSecret(), code, this.now());
    if (!invite) return null;
    const token = mintSessionToken(
      this.sessionSecret(),
      'ally',
      `invite:${invite.label}`,
      this.now() + PANEL_SESSION_TTL_SEC,
    );
    return { token, role: 'ally' };
  }

  /** PU1 (#463): сессия зарегистрированного партнёра (ally + гранты + эпоха). */
  mintPartnerSession(userId: string, grants: readonly string[], permVersion: number): string {
    return mintPartnerSessionToken(
      this.sessionSecret(),
      `user:${userId}`,
      grants,
      permVersion,
      this.now() + PANEL_SESSION_TTL_SEC,
    );
  }

  mintOauthState(): string {
    return signPayload(this.sessionSecret(), { kind: 'state', exp: this.now() + STATE_TTL_SEC });
  }

  verifyOauthState(state: string): boolean {
    return verifyPayload(this.sessionSecret(), state, this.now())?.kind === 'state';
  }

  authorizeUrl(state: string): string {
    return buildGithubAuthorizeUrl(
      this.config.PANEL_GITHUB_CLIENT_ID?.trim() ?? '',
      this.redirectUri(),
      state,
    );
  }

  /** Роль по allowlist (env JSON github_user_id → operator|owner). null = не в списке. */
  roleForGithubUser(user: GithubUser): PanelRole | null {
    return parseAllowlist(this.config.PANEL_GITHUB_ALLOWLIST).get(user.id) ?? null;
  }

  mintSessionForGithub(user: GithubUser, role: PanelRole): string {
    return mintSessionToken(
      this.sessionSecret(),
      role,
      `github:${user.id}:${user.login}`,
      this.now() + PANEL_SESSION_TTL_SEC,
    );
  }

  /** OAuth code → GitHub user (plain fetch, тот же путь, что GithubService). */
  async exchangeGithubCode(code: string): Promise<GithubUser | null> {
    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          client_id: this.config.PANEL_GITHUB_CLIENT_ID?.trim(),
          client_secret: this.config.PANEL_GITHUB_CLIENT_SECRET?.trim(),
          code,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const tokenJson = (await tokenRes.json()) as {
        access_token?: string;
        token_type?: string;
        scope?: string;
      };
      const accessToken = tokenJson.access_token;
      if (!tokenRes.ok || !accessToken) {
        this.logger.warn({ status: tokenRes.status }, 'panel-auth: github token exchange failed');
        return null;
      }
      // OP5 (P2 ревью OP2): фиксируем ожидаемый тип токена; неожиданный scope
      // логируем — расширение прав OAuth App должно быть осознанным решением.
      if (tokenJson.token_type && tokenJson.token_type.toLowerCase() !== 'bearer') {
        this.logger.warn({ tokenType: tokenJson.token_type }, 'panel-auth: unexpected token_type');
        return null;
      }
      if (tokenJson.scope && !tokenJson.scope.split(',').includes('read:user')) {
        this.logger.warn({ scope: tokenJson.scope }, 'panel-auth: unexpected oauth scope');
      }
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: 'application/vnd.github+json',
          'user-agent': 'membrana-panel-auth',
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!userRes.ok) {
        this.logger.warn({ status: userRes.status }, 'panel-auth: github user fetch failed');
        return null;
      }
      const user = (await userRes.json()) as { id?: number; login?: string };
      if (user.id === undefined || user.id === null) return null;
      return { id: String(user.id), login: user.login ?? '' };
    } catch (err) {
      this.logger.warn(
        { reason: err instanceof Error ? err.message : String(err) },
        'panel-auth: github oauth error',
      );
      return null;
    }
  }
}
