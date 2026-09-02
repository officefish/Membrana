/**
 * Отказы разведены осознанно (вердикт M2): `404` — нет такого, `403` — есть, но закрыто.
 *
 * Слияние уместно для публичного входа без авторизации. Здесь партнёр УЖЕ опознан, и
 * скрывать от своего факт существования его же ресурса значит дезориентировать: он будет
 * чинить опечатку в идентификаторе вместо того, чтобы просить доступ.
 */

/** Три исхода решения соседа об оси владения (M1). Булевым их не свести. */
export type AccessOutcome = 'allow' | 'forbidden' | 'absent';

export const ACCESS_OUTCOMES = ['allow', 'forbidden', 'absent'] as const;

export const LIBRARY_ERROR_CODES = ['not-found', 'forbidden'] as const;

export type LibraryErrorCode = (typeof LIBRARY_ERROR_CODES)[number];

export interface LibraryErrorBody {
  readonly code: LibraryErrorCode;
  readonly message: string;
}

export interface LibraryRefusal {
  readonly status: 404 | 403;
  readonly body: LibraryErrorBody;
}

export const NOT_FOUND_REFUSAL: LibraryRefusal = {
  status: 404,
  body: { code: 'not-found', message: 'Ресурса с таким идентификатором нет.' },
};

export const FORBIDDEN_REFUSAL: LibraryRefusal = {
  status: 403,
  body: { code: 'forbidden', message: 'Ресурс существует, но закрыт для этого предъявителя.' },
};

/**
 * Перевод исхода соседа в отказ. `allow` отказа не даёт — сигнатура это и говорит.
 */
export function refusalForOutcome(outcome: Exclude<AccessOutcome, 'allow'>): LibraryRefusal {
  return outcome === 'absent' ? NOT_FOUND_REFUSAL : FORBIDDEN_REFUSAL;
}

/** Разведены ли два отказа: разные коды HTTP И разные коды тела. */
export function refusalsAreDistinct(left: LibraryRefusal, right: LibraryRefusal): boolean {
  return left.status !== right.status && left.body.code !== right.body.code;
}
