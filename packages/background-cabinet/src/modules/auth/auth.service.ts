import { createSessionToken, hashPassword, sessionExpiresAt, verifyPassword } from './password.util';
import type { AuthUser, LoginResult, ValidatedSession } from './auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

// ─── Регистрация по коду приглашения (решение M3, сессия C) ───────────────────────────
//
// Порядок шагов зафиксирован комнатой M3 и ратифицирован владельцем 21.09:
//   1) выключено (флаг или пара офиса не задана) → 401, офис не звать;
//   2) ограничитель по адресу — удар в контроллере, до сервиса;
//   3) длины логина и пароля;
//   4) код: trim; пустой или длиннее 128 → отказ без офиса;
//   5) логин занят → отказ без офиса;
//   6) хеш пароля (локально, без записи);
//   7) гашение кода в офисе через клиент M2;
//   8) только при исходе «ok» — создать пользователя и сессию.
// Иного порядка нет: гашение до проверок сжигает код на опечатке, создание до гашения
// рождает пользователя без кода. Отката гашения у кабинета нет (M1/M2).

/** Фразы наружу — буква в букву по карте двери M3. Локализация — не здесь (M4). */
export const REGISTRATION_DISABLED_MESSAGE = 'Registration is disabled';
export const REGISTRATION_NOT_ACCEPTED_MESSAGE = 'Registration was not accepted';
export const REGISTRATION_TRY_LATER_MESSAGE = 'Please try again later';

/** Верхняя граница длины кода после trim — защита от мусора до обращения к офису. */
export const REGISTRATION_CODE_MAX_LENGTH = 128;

/**
 * Исход клиента офиса — тип из решения M2, структурно. Сервис регистрации не импортирует
 * модуль B во время выполнения: до слияния B зубы идут на подменном клиенте, а после —
 * класс B удовлетворяет этому порту как есть (TypeScript структурен).
 */
export type RegistrationOutcome =
  | { readonly kind: 'ok'; readonly payload?: unknown }
  | { readonly kind: 'refused'; readonly reason: string }
  | { readonly kind: 'office-unavailable'; readonly detail?: string }
  | { readonly kind: 'config-invalid'; readonly detail?: string };

/** Порт клиента двери офиса (M2): один метод, продуктовый путь — только гашение. */
export interface RegistrationCodeRedeemer {
  redeemRegistrationCode(code: string): Promise<RegistrationOutcome>;
}

/**
 * Токен порта. `auth.module.ts` привязывает его к сервису модуля B (`useExisting`),
 * так что `AuthService` получает клиент через DI, как велит M3, а сам файл сервиса
 * не зависит от путей модуля B.
 */
export const REGISTRATION_CODE_REDEEMER = Symbol('REGISTRATION_CODE_REDEEMER');

/**
 * Конфиг с парой офиса из работы B: `office === null`, когда `OFFICE_URL`/`OFFICE_API_TOKEN`
 * не заданы (M2). До слияния B поля нет вовсе — читается как «не задано», регистрация
 * выключена: отказ закрыт, не открыт.
 */
type RegistrationConfig = AppConfig & { readonly office?: unknown };

type LocalRefusalReason = 'invalid_lengths' | 'empty_code' | 'code_too_long' | 'login_taken';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: RegistrationConfig,
    @Inject(REGISTRATION_CODE_REDEEMER) private readonly redeemer: RegistrationCodeRedeemer,
  ) {}

  /**
   * Два условия включения складываются через И (M3): флаг `ALLOW_REGISTRATION`
   * (`config/env.schema.ts:37,47`, только чтение) и пара офиса задана.
   */
  registrationEnabled(): boolean {
    return this.config.ALLOW_REGISTRATION === true && this.config.office != null;
  }

  async register(login: string, password: string, code: string): Promise<LoginResult> {
    // 1) выключено — офис не звать, ничего не считать
    if (!this.registrationEnabled()) {
      throw new UnauthorizedException(REGISTRATION_DISABLED_MESSAGE);
    }

    // 3) длины (ограничитель — шаг 2 — бьёт контроллер до входа сюда)
    const normalizedLogin = typeof login === 'string' ? login.trim().toLowerCase() : '';
    if (normalizedLogin.length < 3 || typeof password !== 'string' || password.length < 8) {
      throw this.refuseLocally('invalid_lengths', normalizedLogin);
    }

    // 4) код: trim; пустой или длиннее предела — отказ без офиса
    const normalizedCode = typeof code === 'string' ? code.trim() : '';
    if (normalizedCode.length === 0) {
      throw this.refuseLocally('empty_code', normalizedLogin);
    }
    if (normalizedCode.length > REGISTRATION_CODE_MAX_LENGTH) {
      throw this.refuseLocally('code_too_long', normalizedLogin);
    }

    // 5) логин занят — отказ без офиса
    const existing = await this.prisma.user.findUnique({ where: { login: normalizedLogin } });
    if (existing) {
      throw this.refuseLocally('login_taken', normalizedLogin);
    }

    // 6) хеш — локально, без записи; при отказе офиса просто отбрасывается
    const passwordHash = await hashPassword(password);

    // 7) гашение в офисе — один вызов, без ретраев и без «check» (M1/M2)
    const outcome = await this.redeemer.redeemRegistrationCode(normalizedCode);
    switch (outcome.kind) {
      case 'ok':
        break;
      case 'refused':
        // причина — только в серверный лог; наружу одна фраза (Q3, ADR-0005)
        this.logger.warn(
          { event: 'registration_refused', login: normalizedLogin, reason: outcome.reason },
          'registration refused by office',
        );
        throw new ForbiddenException(REGISTRATION_NOT_ACCEPTED_MESSAGE);
      case 'office-unavailable':
        // исход гашения неизвестен: пользователя не создаём, код мог сгореть в офисе (M3, компенсация B)
        this.logger.warn(
          {
            event: 'registration_redeem_outcome_unknown',
            login: normalizedLogin,
            code: normalizedCode,
            detail: outcome.detail ?? null,
          },
          'office unavailable during registration; user not created',
        );
        throw new ServiceUnavailableException(REGISTRATION_TRY_LATER_MESSAGE);
      case 'config-invalid':
        this.logger.error(
          { event: 'registration_office_config_invalid', detail: outcome.detail ?? null },
          'office pair for registration is invalid; user not created',
        );
        throw new ServiceUnavailableException(REGISTRATION_TRY_LATER_MESSAGE);
      default: {
        // исход вне контракта M2 — считаем неизвестным, как недоступность офиса
        const unknown: never = outcome;
        this.logger.error(
          { event: 'registration_redeem_outcome_unknown', login: normalizedLogin, outcome: unknown },
          'unexpected client outcome kind; user not created',
        );
        throw new ServiceUnavailableException(REGISTRATION_TRY_LATER_MESSAGE);
      }
    }

    // 8) код погашен — создаём пользователя; падение здесь — полуудача A (M3):
    //    код сгорел, повтор с ним даст «exhausted», отката нет, наружу та же фраза, в лог — инцидент
    let user: { id: string; login: string; role: AuthUser['role'] };
    try {
      user = await this.prisma.user.create({
        data: { login: normalizedLogin, passwordHash, role: 'user' },
      });
    } catch (error) {
      this.logger.error(
        {
          event: 'registration_redeem_orphaned',
          login: normalizedLogin,
          code: normalizedCode,
          error: error instanceof Error ? error.message : String(error),
        },
        'code redeemed but user was not created',
      );
      throw new ForbiddenException(REGISTRATION_NOT_ACCEPTED_MESSAGE);
    }

    return this.createSessionForUser(user.id, user.login, user.role);
  }

  /** Локальный отказ до гашения: одна фраза наружу, причина — в лог (M3). */
  private refuseLocally(reason: LocalRefusalReason, login: string): ForbiddenException {
    this.logger.warn({ event: 'registration_local_refusal', login, reason }, 'registration refused locally');
    return new ForbiddenException(REGISTRATION_NOT_ACCEPTED_MESSAGE);
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

    return this.createSessionForUser(user.id, user.login, user.role);
  }

  async logout(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { token } });
  }

  async validateSessionToken(token: string): Promise<AuthUser | null> {
    const validated = await this.validateSession(token);
    return validated?.user ?? null;
  }

  async validateSession(token: string): Promise<ValidatedSession | null> {
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
    return {
      sessionId: session.id,
      user: { id: session.user.id, login: session.user.login, role: session.user.role },
    };
  }

  /** Pairing (MP3): session capped by key expiry. */
  async createSessionForUserWithExpiry(
    userId: string,
    login: string,
    role: AuthUser['role'],
    expiresAt: Date,
  ): Promise<LoginResult> {
    const token = createSessionToken();
    await this.prisma.session.create({
      data: { userId, token, expiresAt },
    });
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: { id: userId, login, role },
    };
  }

  private async createSessionForUser(
    userId: string,
    login: string,
    role: AuthUser['role'],
  ): Promise<LoginResult> {
    const token = createSessionToken();
    const expiresAt = sessionExpiresAt(this.config.SESSION_TTL_HOURS);
    await this.prisma.session.create({
      data: { userId, token, expiresAt },
    });
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: { id: userId, login, role },
    };
  }
}
