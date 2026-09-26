import { createSessionToken, hashPassword, sessionExpiresAt, verifyPassword } from './password.util';
import type { AuthUser, LoginResult, ValidatedSession } from './auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import type { AppConfig } from '../../config/env.schema';
import type { CabinetConfigWithOffice } from '../../config/office-env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import type { RegistrationOutcome } from '../office-registration';
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
 * Сколько символов кода приглашения попадает в след (#2433).
 *
 * Шесть — столько же берёт `scripts/_ssh-panel-smoke.mjs` → `codePrefix`, которым пользуется
 * `scripts/panel-cabinet-invite.mjs`. Панель в admin-списке показывает четыре
 * (`packages/background-office/src/modules/panel-users/panel-users-core.ts` → `codePrefix`),
 * то есть префикс следа накрывает префикс панели: оператор сличает первые четыре и попадает
 * в ту же строку. Код чеканится в 16 символов base32 (80 бит), так что шесть оставляют
 * неназванными 50 бит: префикс опознаёт строку, но не отпирает регистрацию.
 */
export const REGISTRATION_CODE_LOG_PREFIX_LENGTH = 6;

/**
 * Префикс кода для следа: сам код в лог не уходит никогда (#2433).
 *
 * 24.09 действующий ключ лёг в лог прод-контейнера целиком — из веток
 * `registration_redeem_outcome_unknown` и `registration_redeem_orphaned`, где стояло
 * `code: normalizedCode`. Разбор сгоревшего приглашения требует опознать строку, а не
 * получить ключ: связь префикса с промокодом даёт аудит офиса.
 */
export function registrationCodePrefix(code: string): string {
  return `${String(code).slice(0, REGISTRATION_CODE_LOG_PREFIX_LENGTH)}…`;
}

/**
 * Идентификатор попытки: один на вызов `register`, во всех строках следа этой попытки.
 * Он сшивает лог там, где префикса мало (два приглашения с одинаковым началом), и при этом
 * не является секретом — это метка строки, наружу она не уходит.
 */
let registrationAttemptSeq = 0;
function nextRegistrationAttemptId(): string {
  registrationAttemptSeq = (registrationAttemptSeq + 1) % 0x1000000;
  return `${Date.now().toString(36)}-${registrationAttemptSeq.toString(36).padStart(4, '0')}`;
}

/**
 * Исход клиента офиса — тип модуля B (решение M2), только тип: во время выполнения сервис
 * регистрации модуль B не тянет, зубы идут на подменном клиенте по этому же типу.
 */
export type { RegistrationOutcome };

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
 * Конфиг с парой офиса из работы B (`config.module.ts` → `APP_CONFIG`): `office === null`,
 * когда `OFFICE_URL`/`OFFICE_API_TOKEN` не заданы (M2). Если поля нет вовсе (конфиг
 * без пары в зубах) — читается как «не задано»: регистрация выключена, отказ закрыт.
 */
type RegistrationConfig = CabinetConfigWithOffice | (AppConfig & { readonly office?: unknown });

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

    // метка попытки — во все строки следа ниже, чтобы разбор шёл по ней, а не по коду (#2433)
    const attemptId = nextRegistrationAttemptId();

    // 3) длины (ограничитель — шаг 2 — бьёт контроллер до входа сюда)
    const normalizedLogin = typeof login === 'string' ? login.trim().toLowerCase() : '';
    if (normalizedLogin.length < 3 || typeof password !== 'string' || password.length < 8) {
      throw this.refuseLocally('invalid_lengths', normalizedLogin, attemptId);
    }

    // 4) код: trim; пустой или длиннее предела — отказ без офиса
    const normalizedCode = typeof code === 'string' ? code.trim() : '';
    if (normalizedCode.length === 0) {
      throw this.refuseLocally('empty_code', normalizedLogin, attemptId);
    }
    if (normalizedCode.length > REGISTRATION_CODE_MAX_LENGTH) {
      throw this.refuseLocally('code_too_long', normalizedLogin, attemptId);
    }

    // 5) логин занят — отказ без офиса
    const existing = await this.prisma.user.findUnique({ where: { login: normalizedLogin } });
    if (existing) {
      throw this.refuseLocally('login_taken', normalizedLogin, attemptId);
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
          { event: 'registration_refused', login: normalizedLogin, attemptId, reason: outcome.reason },
          'registration refused by office',
        );
        throw new ForbiddenException(REGISTRATION_NOT_ACCEPTED_MESSAGE);
      case 'office-unavailable':
        // исход гашения неизвестен: пользователя не создаём, код мог сгореть в офисе (M3, компенсация B)
        // в след — префикс и метка попытки, не ключ (#2433)
        this.logger.warn(
          {
            event: 'registration_redeem_outcome_unknown',
            login: normalizedLogin,
            attemptId,
            codePrefix: registrationCodePrefix(normalizedCode),
            detail: outcome.detail ?? null,
          },
          'office unavailable during registration; user not created',
        );
        throw new ServiceUnavailableException(REGISTRATION_TRY_LATER_MESSAGE);
      case 'config-invalid':
        this.logger.error(
          { event: 'registration_office_config_invalid', attemptId, detail: outcome.detail ?? null },
          'office pair for registration is invalid; user not created',
        );
        throw new ServiceUnavailableException(REGISTRATION_TRY_LATER_MESSAGE);
      default: {
        // исход вне контракта M2 — считаем неизвестным, как недоступность офиса
        const unknown: never = outcome;
        this.logger.error(
          {
            event: 'registration_redeem_outcome_unknown',
            login: normalizedLogin,
            attemptId,
            codePrefix: registrationCodePrefix(normalizedCode),
            outcomeKind: (unknown as { kind?: unknown }).kind ?? null,
          },
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
      // в след — префикс и метка попытки, не ключ (#2433)
      this.logger.error(
        {
          event: 'registration_redeem_orphaned',
          login: normalizedLogin,
          attemptId,
          codePrefix: registrationCodePrefix(normalizedCode),
          error: error instanceof Error ? error.message : String(error),
        },
        'code redeemed but user was not created',
      );
      throw new ForbiddenException(REGISTRATION_NOT_ACCEPTED_MESSAGE);
    }

    return this.createSessionForUser(user.id, user.login, user.role);
  }

  /** Локальный отказ до гашения: одна фраза наружу, причина — в лог (M3). */
  private refuseLocally(reason: LocalRefusalReason, login: string, attemptId: string): ForbiddenException {
    this.logger.warn(
      { event: 'registration_local_refusal', login, attemptId, reason },
      'registration refused locally',
    );
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
