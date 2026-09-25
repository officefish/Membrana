/**
 * Зубы сессии C — регистрация по коду приглашения (решение M3, ратифицировано 21.09).
 *
 * Клиент офиса — подменный по типу исхода из решения M2 (сеть не трогается); база — подменная.
 * На стволе файл красный уже по отсутствию поля `code`, порта клиента и фраз двери.
 */
import { ForbiddenException, HttpException, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AuthService,
  REGISTRATION_CODE_LOG_PREFIX_LENGTH,
  REGISTRATION_CODE_MAX_LENGTH,
  REGISTRATION_DISABLED_MESSAGE,
  REGISTRATION_NOT_ACCEPTED_MESSAGE,
  REGISTRATION_TRY_LATER_MESSAGE,
  registrationCodePrefix,
  type RegistrationCodeRedeemer,
  type RegistrationOutcome,
} from './auth.service';
import type { RegistrationRefusalReason } from '../office-registration';

// ─── подмены ───────────────────────────────────────────────────────────────────────────

type UserRow = { id: string; login: string; passwordHash: string; role: 'user' | 'admin' };

/** Подменная база: пользователи в памяти, уникальность логина — как у Prisma (P2002). */
function makePrisma() {
  const users: UserRow[] = [];
  let seq = 0;
  const prisma = {
    user: {
      findUnique: vi.fn(async (args: { where: { login: string } }) =>
        users.find((u) => u.login === args.where.login) ?? null,
      ),
      create: vi.fn(async (args: { data: { login: string; passwordHash: string; role: 'user' } }) => {
        if (users.some((u) => u.login === args.data.login)) {
          throw Object.assign(new Error('Unique constraint failed on the fields: (`login`)'), { code: 'P2002' });
        }
        const row: UserRow = { id: `u-${++seq}`, ...args.data };
        users.push(row);
        return row;
      }),
    },
    session: {
      create: vi.fn(async (args: { data: { userId: string; token: string; expiresAt: Date } }) => ({
        id: `s-${args.data.userId}`,
        ...args.data,
      })),
    },
  };
  return { prisma, users };
}

const MEANINGFUL_OFFICE = { url: 'https://office.test', token: 't' };

function makeConfig(over: Partial<{ ALLOW_REGISTRATION: boolean; office: unknown }> = {}) {
  return {
    ALLOW_REGISTRATION: true,
    SESSION_TTL_HOURS: 24,
    office: MEANINGFUL_OFFICE,
    ...over,
  };
}

/** Подменный клиент офиса: очередь исходов; по умолчанию — «ok». */
function makeRedeemer(outcomes: RegistrationOutcome[] = []) {
  const calls: string[] = [];
  const redeemer: RegistrationCodeRedeemer & { calls: string[] } = {
    calls,
    redeemRegistrationCode: vi.fn(async (code: string) => {
      calls.push(code);
      return outcomes.length > 0 ? (outcomes.shift() as RegistrationOutcome) : ({ kind: 'ok', payload: {} } as const);
    }),
  };
  return redeemer;
}

function build(opts: { outcomes?: RegistrationOutcome[]; config?: ReturnType<typeof makeConfig> } = {}) {
  const { prisma, users } = makePrisma();
  const redeemer = makeRedeemer(opts.outcomes);
  const config = opts.config ?? makeConfig();
  const service = new AuthService(prisma as never, config as never, redeemer);
  return { service, prisma, users, redeemer };
}

async function expectHttp(
  promise: Promise<unknown>,
  status: number,
  message: string,
): Promise<HttpException> {
  let caught: unknown;
  try {
    await promise;
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeInstanceOf(HttpException);
  const err = caught as HttpException;
  expect(err.getStatus()).toBe(status);
  const body = err.getResponse();
  const bodyMessage = typeof body === 'string' ? body : (body as { message?: unknown }).message;
  expect(bodyMessage).toBe(message);
  return err;
}

const GOOD = { login: 'Newcomer', password: 'password-8+', code: ' ABCD-EFGH ' };

let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── карта двери: исход клиента → HTTP → фраза ────────────────────────────────────────

describe('AuthService.register — карта двери M3 по исходам клиента', () => {
  it('ok → пользователь создан, сессия выдана; код ушёл в офис после trim', async () => {
    const { service, prisma, users, redeemer } = build();
    const result = await service.register(GOOD.login, GOOD.password, GOOD.code);

    expect(redeemer.redeemRegistrationCode).toHaveBeenCalledTimes(1);
    expect(redeemer.calls[0]).toBe('ABCD-EFGH');
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(users).toHaveLength(1);
    expect(users[0]?.login).toBe('newcomer');
    expect(users[0]?.role).toBe('user');
    expect(result.user).toEqual({ id: users[0]?.id, login: 'newcomer', role: 'user' });
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
    expect(prisma.session.create).toHaveBeenCalledTimes(1);
  });

  it.each(['not_found', 'revoked', 'expired', 'grant_mismatch', 'exhausted'])(
    'refused(%s) → 403 «Registration was not accepted», пользователь не создан, причина только в лог',
    async (reason: RegistrationRefusalReason) => {
      const { service, prisma } = build({ outcomes: [{ kind: 'refused', reason }] });
      const err = await expectHttp(
        service.register(GOOD.login, GOOD.password, GOOD.code),
        403,
        REGISTRATION_NOT_ACCEPTED_MESSAGE,
      );
      expect(err).toBeInstanceOf(ForbiddenException);
      expect(JSON.stringify(err.getResponse())).not.toContain(reason);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'registration_refused', reason }),
        expect.any(String),
      );
    },
  );

  it('office-unavailable → 503 «Please try again later», пользователь не создан, лог warn outcome_unknown', async () => {
    const { service, prisma } = build({ outcomes: [{ kind: 'office-unavailable', detail: 'timeout 5000ms' }] });
    const err = await expectHttp(
      service.register(GOOD.login, GOOD.password, GOOD.code),
      503,
      REGISTRATION_TRY_LATER_MESSAGE,
    );
    expect(err).toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'registration_redeem_outcome_unknown', codePrefix: 'ABCD-E…' }),
      expect.any(String),
    );
  });

  it('config-invalid → 503 «Please try again later», лог error как инцидент конфигурации', async () => {
    const { service, prisma } = build({ outcomes: [{ kind: 'config-invalid', detail: '401 from office' }] });
    await expectHttp(service.register(GOOD.login, GOOD.password, GOOD.code), 503, REGISTRATION_TRY_LATER_MESSAGE);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'registration_office_config_invalid' }),
      expect.any(String),
    );
  });
});

// ─── два условия включения ────────────────────────────────────────────────────────────

describe('AuthService.register — регистрация выключена', () => {
  it('ALLOW_REGISTRATION=false → 401 «Registration is disabled», офис не вызван', async () => {
    const { service, redeemer, prisma } = build({ config: makeConfig({ ALLOW_REGISTRATION: false }) });
    const err = await expectHttp(
      service.register(GOOD.login, GOOD.password, GOOD.code),
      401,
      REGISTRATION_DISABLED_MESSAGE,
    );
    expect(err).toBeInstanceOf(UnauthorizedException);
    expect(redeemer.redeemRegistrationCode).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(service.registrationEnabled()).toBe(false);
  });

  it('office === null → 401 «Registration is disabled», офис не вызван', async () => {
    const { service, redeemer } = build({ config: makeConfig({ office: null }) });
    await expectHttp(service.register(GOOD.login, GOOD.password, GOOD.code), 401, REGISTRATION_DISABLED_MESSAGE);
    expect(redeemer.redeemRegistrationCode).not.toHaveBeenCalled();
  });

  it('пара офиса ещё не заведена в конфиге (поле отсутствует) → выключено, отказ закрыт', async () => {
    const { service, redeemer } = build({ config: makeConfig({ office: undefined }) });
    await expectHttp(service.register(GOOD.login, GOOD.password, GOOD.code), 401, REGISTRATION_DISABLED_MESSAGE);
    expect(redeemer.redeemRegistrationCode).not.toHaveBeenCalled();
  });
});

// ─── локальные отказы до гашения ──────────────────────────────────────────────────────

describe('AuthService.register — локальный отказ до гашения: 403, одна фраза, офис не вызван', () => {
  it('короткий логин', async () => {
    const { service, redeemer } = build();
    await expectHttp(service.register('ab', GOOD.password, GOOD.code), 403, REGISTRATION_NOT_ACCEPTED_MESSAGE);
    expect(redeemer.redeemRegistrationCode).not.toHaveBeenCalled();
  });

  it('короткий пароль', async () => {
    const { service, redeemer } = build();
    await expectHttp(service.register(GOOD.login, 'short', GOOD.code), 403, REGISTRATION_NOT_ACCEPTED_MESSAGE);
    expect(redeemer.redeemRegistrationCode).not.toHaveBeenCalled();
  });

  it('пустой код после trim', async () => {
    const { service, redeemer } = build();
    await expectHttp(service.register(GOOD.login, GOOD.password, '   '), 403, REGISTRATION_NOT_ACCEPTED_MESSAGE);
    expect(redeemer.redeemRegistrationCode).not.toHaveBeenCalled();
  });

  it('код отсутствует в теле (не строка)', async () => {
    const { service, redeemer } = build();
    await expectHttp(
      service.register(GOOD.login, GOOD.password, undefined as unknown as string),
      403,
      REGISTRATION_NOT_ACCEPTED_MESSAGE,
    );
    expect(redeemer.redeemRegistrationCode).not.toHaveBeenCalled();
  });

  it(`код длиннее ${REGISTRATION_CODE_MAX_LENGTH} символов`, async () => {
    const { service, redeemer } = build();
    await expectHttp(
      service.register(GOOD.login, GOOD.password, 'X'.repeat(REGISTRATION_CODE_MAX_LENGTH + 1)),
      403,
      REGISTRATION_NOT_ACCEPTED_MESSAGE,
    );
    expect(redeemer.redeemRegistrationCode).not.toHaveBeenCalled();
  });

  it('логин занят → 403 той же фразой (не 409), код не сгорает', async () => {
    const { service, redeemer, users } = build();
    users.push({ id: 'u-0', login: 'newcomer', passwordHash: 'h', role: 'user' });
    await expectHttp(service.register(GOOD.login, GOOD.password, GOOD.code), 403, REGISTRATION_NOT_ACCEPTED_MESSAGE);
    expect(redeemer.redeemRegistrationCode).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'registration_local_refusal', reason: 'login_taken' }),
      expect.any(String),
    );
  });
});

// ─── порядок шагов, гонки, полуудача ──────────────────────────────────────────────────

describe('AuthService.register — порядок шагов, гонки и полуудача A', () => {
  it('порядок: проверка логина → гашение → создание; гашение строго до создания', async () => {
    const order: string[] = [];
    const { service, prisma, redeemer } = build();
    prisma.user.findUnique.mockImplementation(async () => {
      order.push('findUnique');
      return null;
    });
    (redeemer.redeemRegistrationCode as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push('redeem');
      return { kind: 'ok', payload: {} } as const;
    });
    prisma.user.create.mockImplementation(async (args: { data: { login: string; passwordHash: string; role: 'user' } }) => {
      order.push('create');
      return { id: 'u-1', ...args.data };
    });
    await service.register(GOOD.login, GOOD.password, GOOD.code);
    expect(order).toEqual(['findUnique', 'redeem', 'create']);
  });

  it('гонка одним кодом (maxUses=1): офис гасит один раз — ровно один пользователь, второй 403', async () => {
    const { service, users } = build({
      outcomes: [{ kind: 'ok', payload: {} }, { kind: 'refused', reason: 'exhausted' }],
    });
    const results = await Promise.allSettled([
      service.register('first-user', GOOD.password, 'ONE-CODE'),
      service.register('second-user', GOOD.password, 'ONE-CODE'),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0]?.reason as HttpException).getStatus()).toBe(403);
    expect(users).toHaveLength(1);
  });

  it('гонка одним логином: оба прошли проверку, оба погасили — второй падает на уникальности → 403 + лог orphaned', async () => {
    const { service, prisma, users, redeemer } = build();
    // оба видят «логин свободен» до того, как первый создан
    prisma.user.findUnique.mockImplementation(async () => null);
    const results = await Promise.allSettled([
      service.register('same-login', GOOD.password, 'CODE-A'),
      service.register('same-login', GOOD.password, 'CODE-B'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    expect(rejected).toHaveLength(1);
    expect((rejected[0]?.reason as HttpException).getStatus()).toBe(403);
    expect(users).toHaveLength(1);
    expect(redeemer.redeemRegistrationCode).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'registration_redeem_orphaned', login: 'same-login' }),
      expect.any(String),
    );
  });

  it('полуудача A: код погашен, создание упало → 403 той же фразой, лог error с логином, кодом и ошибкой базы', async () => {
    const { service, prisma } = build();
    prisma.user.create.mockRejectedValueOnce(new Error('disk is full'));
    const err = await expectHttp(
      service.register(GOOD.login, GOOD.password, GOOD.code),
      403,
      REGISTRATION_NOT_ACCEPTED_MESSAGE,
    );
    expect(JSON.stringify(err.getResponse())).not.toContain('disk is full');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'registration_redeem_orphaned',
        login: 'newcomer',
        codePrefix: 'ABCD-E…',
        error: 'disk is full',
      }),
      expect.any(String),
    );
  });

  it('повтор после полуудачи тем же кодом: офис отвечает exhausted → 403, пользователя по-прежнему нет', async () => {
    const { service, prisma, users } = build({ outcomes: [{ kind: 'ok', payload: {} }, { kind: 'refused', reason: 'exhausted' }] });
    prisma.user.create.mockRejectedValueOnce(new Error('unique violation'));
    await expectHttp(service.register(GOOD.login, GOOD.password, GOOD.code), 403, REGISTRATION_NOT_ACCEPTED_MESSAGE);
    await expectHttp(service.register(GOOD.login, GOOD.password, GOOD.code), 403, REGISTRATION_NOT_ACCEPTED_MESSAGE);
    expect(users).toHaveLength(0);
  });
});

// ─── зуб #2433: код приглашения в след не уходит ──────────────────────────────────────
//
// 24.09 действующий ключ лежал в логе прод-контейнера целиком. Зуб судит не отдельную
// строку, а ВЕСЬ след попытки: гоняет регистрацию по каждой ветке настоящим кодом в 16
// символов и требует, чтобы ни один аргумент логгера его не содержал.
//
// Красный вход (показан при сдаче): вернуть `code: normalizedCode` в любую из двух веток
// `auth.service.ts` — зуб падает и называет ветку, а не «что-то не так».

/** Код той же формы, что чеканит офис: 16 символов base32 (panel-users-core.ts). */
const REAL_CODE = 'ABCDEFGHJKMNPQRS';

describe('зуб #2433: след регистрации несёт префикс, а не ключ', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    debugSpy = vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
  });

  /** Всё, что ушло в логгер за попытку, — одной строкой; по ней и судим. */
  function loggedText(): string {
    const all = [warnSpy, errorSpy, logSpy, debugSpy].flatMap((spy) => spy.mock.calls);
    return all
      .map((args) => args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
      .join('\n');
  }

  it('предмет зуба на месте: registrationCodePrefix усекает код до шести символов', () => {
    // сначала утверждение о предмете, потом сравнение: иначе зуб судил бы пустоту
    expect(typeof registrationCodePrefix).toBe('function');
    expect(REGISTRATION_CODE_LOG_PREFIX_LENGTH).toBe(6);
    expect(REAL_CODE.length).toBeGreaterThan(REGISTRATION_CODE_LOG_PREFIX_LENGTH);
    expect(registrationCodePrefix(REAL_CODE)).toBe('ABCDEF…');
    expect(registrationCodePrefix(REAL_CODE)).not.toContain(REAL_CODE);
  });

  it.each([
    ['office-unavailable', { kind: 'office-unavailable', detail: 'timeout 5000ms' } as RegistrationOutcome],
    ['refused(exhausted)', { kind: 'refused', reason: 'exhausted' } as RegistrationOutcome],
    ['ok', { kind: 'ok', payload: {} } as RegistrationOutcome],
  ])('исход %s: полный код ни в одной строке следа', async (_name, outcome) => {
    const { service } = build({ outcomes: [outcome] });
    await service.register(GOOD.login, GOOD.password, ` ${REAL_CODE} `).catch(() => undefined);
    expect(loggedText()).not.toContain(REAL_CODE);
  });

  it('полуудача A (orphaned): полного кода нет, есть префикс и метка попытки', async () => {
    const { service, prisma } = build();
    prisma.user.create.mockRejectedValueOnce(new Error('disk is full'));
    await expectHttp(
      service.register(GOOD.login, GOOD.password, REAL_CODE),
      403,
      REGISTRATION_NOT_ACCEPTED_MESSAGE,
    );
    expect(loggedText()).not.toContain(REAL_CODE);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'registration_redeem_orphaned',
        codePrefix: 'ABCDEF…',
        attemptId: expect.any(String),
      }),
      expect.any(String),
    );
  });

  it('исход неизвестен: полного кода нет, есть префикс и метка попытки', async () => {
    const { service } = build({ outcomes: [{ kind: 'office-unavailable', detail: 'timeout 5000ms' }] });
    await expectHttp(
      service.register(GOOD.login, GOOD.password, REAL_CODE),
      503,
      REGISTRATION_TRY_LATER_MESSAGE,
    );
    expect(loggedText()).not.toContain(REAL_CODE);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'registration_redeem_outcome_unknown',
        codePrefix: 'ABCDEF…',
        attemptId: expect.any(String),
      }),
      expect.any(String),
    );
  });

  it('метка попытки одна на всю попытку и разная у двух попыток', async () => {
    const { service } = build({
      outcomes: [
        { kind: 'office-unavailable', detail: 'a' },
        { kind: 'office-unavailable', detail: 'b' },
      ],
    });
    await service.register('first-login', GOOD.password, REAL_CODE).catch(() => undefined);
    await service.register('second-login', GOOD.password, REAL_CODE).catch(() => undefined);
    const ids = warnSpy.mock.calls
      .map(([payload]) => (payload as { attemptId?: string }).attemptId)
      .filter((v): v is string => typeof v === 'string');
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });
});
