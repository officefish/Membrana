/**
 * panel-users-core — чистое ядро реестра партнёров панели (PU1, эпик #463).
 *
 * ADR 0005: store — истина, cookie — кэш отображения (permVersion-эпоха).
 * Все функции чистые и иммутабельные (state → new state) — тестируются без
 * fs/Nest. Persistence и HTTP — в store-сервисе и контроллере.
 */
import { randomBytes } from 'node:crypto';

export interface PanelUser {
  readonly id: string;
  /** «Как вас называть» из формы регистрации — строка в разделе owner'а. */
  readonly name: string;
  /** id промокода, которым зарегистрировался (для аудита/группировки). */
  readonly codeId: string;
  /** id разделов панели; '*' = все разделы, текущие и будущие. */
  readonly grants: readonly string[];
  /** Эпоха прав: каждое изменение грантов/revoke инкрементит; сверяется в /me. */
  readonly permVersion: number;
  readonly revoked: boolean;
  readonly createdAt: string;
}

export interface PromoCode {
  readonly id: string;
  /** Секрет кода. В admin-списке наружу отдаётся только префикс. */
  readonly code: string;
  readonly label: string;
  readonly grants: readonly string[];
  /** unix-секунды; null = бессрочный. */
  readonly expiresAt: number | null;
  readonly maxUses: number;
  readonly usedCount: number;
  readonly revoked: boolean;
  readonly createdAt: string;
}

export interface AuditEntry {
  readonly at: string;
  readonly actor: string;
  readonly action:
    | 'register'
    | 'grants'
    | 'revoke-user'
    | 'mint-code'
    | 'revoke-code'
    | 'redeem-cabinet-code';
  readonly target: string;
  readonly detail: string;
}

export interface PanelUsersState {
  readonly schemaVersion: 1;
  readonly users: readonly PanelUser[];
  readonly codes: readonly PromoCode[];
  readonly audit: readonly AuditEntry[];
}

export const AUDIT_CAP = 500;

export const WILDCARD_GRANT = '*';

export function emptyState(): PanelUsersState {
  return { schemaVersion: 1, users: [], codes: [], audit: [] };
}

/**
 * Защитный парс store-файла: любая некорректность → null (вызывающий решает,
 * падать или стартовать пустым с warning — видимая деградация ADR 0005).
 */
export function parseState(text: string): PanelUsersState | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Record<string, unknown>;
  if (s.schemaVersion !== 1 || !Array.isArray(s.users) || !Array.isArray(s.codes)) return null;
  return {
    schemaVersion: 1,
    users: s.users as PanelUser[],
    codes: s.codes as PromoCode[],
    audit: Array.isArray(s.audit) ? (s.audit as AuditEntry[]) : [],
  };
}

// ─── гранты ────────────────────────────────────────────────────────────────────────

/** Партнёр видит раздел, если грант точный или wildcard (консилиум Р1). */
export function grantsAllowSection(grants: readonly string[], sectionId: string): boolean {
  return grants.includes(WILDCARD_GRANT) || grants.includes(sectionId);
}

/** Нормализация списка грантов: строки, трим, дедуп, отбрасывание пустых. */
export function normalizeGrants(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') continue;
    const v = item.trim();
    if (v && v.length <= 64 && !out.includes(v)) out.push(v);
  }
  return out;
}

// ─── промокоды ─────────────────────────────────────────────────────────────────────

/** base32 (Crockford, без гласных-двусмысленностей) — читается голосом. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ0123456789';
export const CODE_LENGTH = 16;

/** 16 символов ×5 бит = 80 бит энтропии (консилиум Р6). */
export function generatePromoCode(rng: (n: number) => Buffer = randomBytes): string {
  const bytes = rng(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

/** Префикс кода для admin-списка (сам код после чеканки не показывается повторно). */
export function codePrefix(code: string): string {
  return `${code.slice(0, 4)}…`;
}

export interface MintCodeInput {
  readonly label: string;
  readonly grants: readonly string[];
  /** unix-секунды; null = бессрочный. */
  readonly expiresAt: number | null;
  readonly maxUses: number;
}

export function mintCode(
  state: PanelUsersState,
  input: MintCodeInput,
  actor: string,
  nowIso: string,
  code: string = generatePromoCode(),
): { state: PanelUsersState; code: PromoCode } {
  const promo: PromoCode = {
    id: `code-${state.codes.length + 1}-${code.slice(0, 4).toLowerCase()}`,
    code,
    label: input.label,
    grants: [...input.grants],
    expiresAt: input.expiresAt,
    maxUses: Math.max(1, Math.floor(input.maxUses)),
    usedCount: 0,
    revoked: false,
    createdAt: nowIso,
  };
  return {
    state: appendAudit(
      { ...state, codes: [...state.codes, promo] },
      { at: nowIso, actor, action: 'mint-code', target: promo.id, detail: `label=${promo.label} grants=[${promo.grants.join(',')}] maxUses=${promo.maxUses}` },
    ),
    code: promo,
  };
}

export function revokeCode(
  state: PanelUsersState,
  codeId: string,
  actor: string,
  nowIso: string,
): PanelUsersState | null {
  const target = state.codes.find((c) => c.id === codeId);
  if (!target || target.revoked) return null;
  return appendAudit(
    {
      ...state,
      codes: state.codes.map((c) => (c.id === codeId ? { ...c, revoked: true } : c)),
    },
    { at: nowIso, actor, action: 'revoke-code', target: codeId, detail: `label=${target.label}` },
  );
}

// ─── регистрация ───────────────────────────────────────────────────────────────────

/**
 * Обмен промокода на пользователя. null = код не подошёл (причина НЕ различается
 * наружу — Q3; внутри аудит пишет только успешные регистрации).
 */
export function redeemCode(
  state: PanelUsersState,
  rawCode: string,
  name: string,
  nowSec: number,
  nowIso: string,
): { state: PanelUsersState; user: PanelUser } | null {
  const code = rawCode.trim().toUpperCase();
  const promo = state.codes.find((c) => c.code === code);
  if (!promo || promo.revoked) return null;
  if (promo.expiresAt !== null && promo.expiresAt <= nowSec) return null;
  if (promo.usedCount >= promo.maxUses) return null;
  const cleanName = name.trim().slice(0, 64);
  if (!cleanName) return null;

  const user: PanelUser = {
    id: `user-${state.users.length + 1}-${Math.abs(hashCode(`${code}:${nowIso}:${state.users.length}`)).toString(36)}`,
    name: cleanName,
    codeId: promo.id,
    grants: [...promo.grants],
    permVersion: 1,
    revoked: false,
    createdAt: nowIso,
  };
  const next: PanelUsersState = {
    ...state,
    users: [...state.users, user],
    codes: state.codes.map((c) => (c.id === promo.id ? { ...c, usedCount: c.usedCount + 1 } : c)),
  };
  return {
    state: appendAudit(next, {
      at: nowIso,
      actor: `user:${user.id}`,
      action: 'register',
      target: user.id,
      detail: `name=${cleanName} code=${promo.label}`,
    }),
    user,
  };
}

// ─── регистрация в кабинете по коду панели ─────────────────────────────────────────

/**
 * Грант «регистрация в кабинете» (заседание M1 21.09, ратифицировано владельцем).
 * Это НЕ раздел панели: через grantsAllowSection литерал не идёт, а через
 * normalizeGrants проходит как обычная строка.
 */
export const CABINET_REGISTER_GRANT = 'cabinet-register';

export type CabinetConsumeMode = 'check' | 'redeem';

export type CabinetConsumeRefusal =
  | 'not_found'
  | 'revoked'
  | 'expired'
  | 'grant_mismatch'
  | 'exhausted';

export type CabinetConsumeOutcome =
  | { readonly ok: true; readonly redeemable: true; readonly grant: string; readonly uses: { readonly used: number; readonly max: number } }
  | { readonly ok: true; readonly code: string; readonly grant: string; readonly uses: { readonly used: number; readonly max: number } }
  | { readonly ok: false; readonly reason: CabinetConsumeRefusal };

/**
 * Проверка и погашение кода регистрации в кабинете.
 *
 * Порядок предикатов ратифицирован и не переставляется:
 * not_found → revoked → expired → grant_mismatch → exhausted → ok.
 *
 * mode=check отвечает о годности и состояния не меняет. mode=redeem приращает
 * счётчик использований и пишет аудит — и на успех, и на отказ; check следа не
 * оставляет (разъяснение ведущей 22.09: действие названо redeem-*, а проверку
 * живости зовут регулярно — лента с капом вытеснила бы выдачи и отзывы).
 *
 * Пользователя панели дверь не создаёт и section-гранты никуда не копирует.
 */
export function consumeCabinetRegistrationCode(
  state: PanelUsersState,
  rawCode: string,
  mode: CabinetConsumeMode,
  nowSec: number,
  nowIso: string,
): { state: PanelUsersState; outcome: CabinetConsumeOutcome } {
  const code = rawCode.trim().toUpperCase();
  const promo = state.codes.find((c) => c.code === code);

  const refuse = (reason: CabinetConsumeRefusal) => ({
    state:
      mode === 'redeem'
        ? appendAudit(state, {
            at: nowIso,
            actor: 'service:cabinet',
            action: 'redeem-cabinet-code' as const,
            target: promo?.id ?? codePrefix(code),
            detail: `mode=redeem ok=false reason=${reason}`,
          })
        : state,
    outcome: { ok: false as const, reason },
  });

  if (!promo) return refuse('not_found');
  if (promo.revoked) return refuse('revoked');
  if (promo.expiresAt !== null && promo.expiresAt <= nowSec) return refuse('expired');
  if (!promo.grants.includes(CABINET_REGISTER_GRANT)) return refuse('grant_mismatch');
  if (promo.usedCount >= promo.maxUses) return refuse('exhausted');

  if (mode === 'check') {
    return {
      state,
      outcome: {
        ok: true,
        redeemable: true,
        grant: CABINET_REGISTER_GRANT,
        uses: { used: promo.usedCount, max: promo.maxUses },
      },
    };
  }

  const used = promo.usedCount + 1;
  const next: PanelUsersState = {
    ...state,
    codes: state.codes.map((c) => (c.id === promo.id ? { ...c, usedCount: used } : c)),
  };
  return {
    state: appendAudit(next, {
      at: nowIso,
      actor: 'service:cabinet',
      action: 'redeem-cabinet-code',
      target: promo.id,
      detail: `mode=redeem ok=true usedCount=${used}/${promo.maxUses}`,
    }),
    outcome: {
      ok: true,
      code: promo.code,
      grant: CABINET_REGISTER_GRANT,
      uses: { used, max: promo.maxUses },
    },
  };
}

export interface StateLock {
  /** Исполнить участок «прочитать — проверить — приростить — записать» в одиночку. */
  run<T>(section: () => Promise<T>): Promise<T>;
}

/**
 * Замок единственного пишущего контура (решение M1, строка «Атомарность»).
 *
 * Чистое ядро состояния не хранит, поэтому инвариант «успешных redeem ≤ maxUses»
 * держится не самой проверкой, а тем, что между чтением состояния и его записью
 * не вклинивается второй заход. Участки исполняются по одному, в порядке
 * обращения; падение участка замок освобождает.
 */
export function createStateLock(): StateLock {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    run<T>(section: () => Promise<T>): Promise<T> {
      const result = tail.then(section, section);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}

// ─── управление грантами (owner) ───────────────────────────────────────────────────

export function setUserGrants(
  state: PanelUsersState,
  userId: string,
  grants: readonly string[],
  actor: string,
  nowIso: string,
): PanelUsersState | null {
  const user = state.users.find((u) => u.id === userId);
  if (!user) return null;
  return appendAudit(
    {
      ...state,
      users: state.users.map((u) =>
        u.id === userId ? { ...u, grants: [...grants], permVersion: u.permVersion + 1 } : u,
      ),
    },
    {
      at: nowIso,
      actor,
      action: 'grants',
      target: userId,
      detail: `name=${user.name} grants=[${grants.join(',')}] (было [${user.grants.join(',')}])`,
    },
  );
}

export function revokeUser(
  state: PanelUsersState,
  userId: string,
  actor: string,
  nowIso: string,
): PanelUsersState | null {
  const user = state.users.find((u) => u.id === userId);
  if (!user || user.revoked) return null;
  return appendAudit(
    {
      ...state,
      users: state.users.map((u) =>
        u.id === userId ? { ...u, revoked: true, permVersion: u.permVersion + 1 } : u,
      ),
    },
    { at: nowIso, actor, action: 'revoke-user', target: userId, detail: `name=${user.name}` },
  );
}

// ─── аудит ─────────────────────────────────────────────────────────────────────────

/** Хвост аудита с капом (консилиум Р5): свежие в конце, старые отрезаются. */
export function appendAudit(state: PanelUsersState, entry: AuditEntry): PanelUsersState {
  const audit = [...state.audit, entry];
  return { ...state, audit: audit.length > AUDIT_CAP ? audit.slice(audit.length - AUDIT_CAP) : audit };
}

function hashCode(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return h;
}
