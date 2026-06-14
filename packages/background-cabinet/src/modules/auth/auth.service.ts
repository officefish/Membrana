import { createSessionToken, hashPassword, sessionExpiresAt, verifyPassword } from './password.util';
import type { AuthUser, LoginResult } from './auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async register(login: string, password: string): Promise<LoginResult> {
    if (!this.config.ALLOW_REGISTRATION) {
      throw new UnauthorizedException('Registration is disabled');
    }
    const normalizedLogin = login.trim().toLowerCase();
    if (normalizedLogin.length < 3 || password.length < 8) {
      throw new UnauthorizedException('Login min 3 chars, password min 8 chars');
    }

    const existing = await this.prisma.user.findUnique({ where: { login: normalizedLogin } });
    if (existing) {
      throw new ConflictException('Login already taken');
    }

    const passwordHash = await hashPassword(password);
    const user = await this.prisma.user.create({
      data: { login: normalizedLogin, passwordHash },
    });

    return this.createSessionForUser(user.id, user.login);
  }

  async login(login: string, password: string): Promise<LoginResult> {
    const normalizedLogin = login.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { login: normalizedLogin } });
    if (!user) {
      throw new UnauthorizedException('Invalid login or password');
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid login or password');
    }

    await this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    return this.createSessionForUser(user.id, user.login);
  }

  async logout(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { token } });
  }

  async validateSessionToken(token: string): Promise<AuthUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } });
      }
      return null;
    }
    return { id: session.user.id, login: session.user.login };
  }

  /** Pairing (MP3): session capped by key expiry. */
  async createSessionForUserWithExpiry(
    userId: string,
    login: string,
    expiresAt: Date,
  ): Promise<LoginResult> {
    const token = createSessionToken();
    await this.prisma.session.create({
      data: { userId, token, expiresAt },
    });
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: { id: userId, login },
    };
  }

  private async createSessionForUser(userId: string, login: string): Promise<LoginResult> {
    const token = createSessionToken();
    const expiresAt = sessionExpiresAt(this.config.SESSION_TTL_HOURS);
    await this.prisma.session.create({
      data: { userId, token, expiresAt },
    });
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: { id: userId, login },
    };
  }
}
