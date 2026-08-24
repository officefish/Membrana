import { randomInt } from 'node:crypto';

/**
 * Номер происшествия — лицо отказа рода «сломан» (вердикт M1 заседания
 * logging-observability-cut, кусок B #2119).
 *
 * Форма: PREFIX-XXXX-XXXX, 8 символов Crockford Base32 (без I, L, O, U) — диктуемо
 * голосом и находимо в картотеке. Официальный `INC-…` чеканит ТОЛЬКО Сентри (кусок E);
 * пока картотеки нет или она недоступна, кабинет чеканит локальный суррогат `TMP-…`,
 * который в картотеку не записывается. Когда кусок E подключит Сентри, mintIncidentId
 * станет пробовать картотеку и падать на TMP — интерфейс не изменится.
 */
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export type IncidentMint = {
  /** `TMP-XXXX-XXXX` (локальный суррогат) либо `INC-XXXX-XXXX` (картотека, кусок E). */
  id: string;
  source: 'tmp' | 'sentry';
};

function randomGroup(): string {
  let out = '';
  for (let i = 0; i < 4; i += 1) out += CROCKFORD_ALPHABET[randomInt(32)];
  return out;
}

export function mintIncidentId(): IncidentMint {
  // Кусок E подключит сюда чекан Сентри; до него — честный суррогат.
  return { id: `TMP-${randomGroup()}-${randomGroup()}`, source: 'tmp' };
}

export const INCIDENT_ID_PATTERN = /^(INC|TMP)-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;
