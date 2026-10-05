/**
 * Зубы охраны служебной двери office→кабинет (#2588 b2, порча P6/P7 плана
 * `docs/sprint/cut/cold-archive-retention-2588.json`).
 *
 * Красные на стволе c68bf380: модуля нет — import падает. Порчи после реализации:
 * P6 сверять с API_INTERNAL_TOKEN или принимать любой из двух → красный; P7 без ключа
 * в env пропускать или отвечать 401 → красный; снять timingSafeEqual в пользу `===`
 * — `tokensEqual` остаётся верным, но зуб «разная длина → false» держит контракт.
 */
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import {
  OFFICE_DOOR_NOT_CONFIGURED_MESSAGE,
  OFFICE_TOKEN_HEADER,
  OfficeTokenGuard,
  tokensEqual,
} from './office-token.guard';

// Фикстуры — не секреты: слова вместо шестнадцатеричного «ключа», чтобы gitleaks (pre-commit) не считал их утечкой.
const OFFICE_KEY = 'office-door-test-value';
const MEDIA_KEY = 'media-door-test-value';

function ctx(headers: Record<string, unknown>) {
  return { switchToHttp: () => ({ getRequest: () => ({ headers }) }) } as never;
}

function guard(config: { CABINET_OFFICE_TOKEN?: string; API_INTERNAL_TOKEN: string }) {
  return new OfficeTokenGuard(config as never);
}

describe('OfficeTokenGuard — P6 ключи не взаимозаменяемы', () => {
  const g = guard({ CABINET_OFFICE_TOKEN: OFFICE_KEY, API_INTERNAL_TOKEN: MEDIA_KEY });

  it('верный CABINET_OFFICE_TOKEN → пропуск', () => {
    expect(g.canActivate(ctx({ [OFFICE_TOKEN_HEADER]: OFFICE_KEY }))).toBe(true);
  });

  it('без заголовка → 401 с названием заголовка', () => {
    expect(() => g.canActivate(ctx({}))).toThrow(UnauthorizedException);
    expect(() => g.canActivate(ctx({}))).toThrow('Missing X-Membrana-Token header');
  });

  it('пустой или не-строковый заголовок → 401', () => {
    expect(() => g.canActivate(ctx({ [OFFICE_TOKEN_HEADER]: '' }))).toThrow(UnauthorizedException);
    expect(() => g.canActivate(ctx({ [OFFICE_TOKEN_HEADER]: [OFFICE_KEY] }))).toThrow(UnauthorizedException);
  });

  it('чужой токен → 401 «Invalid token»', () => {
    expect(() => g.canActivate(ctx({ [OFFICE_TOKEN_HEADER]: 'wrong' }))).toThrow('Invalid token');
  });

  it('API_INTERNAL_TOKEN (ключ кабинета к media) в этой двери НЕ открывает → 401', () => {
    expect(() => g.canActivate(ctx({ [OFFICE_TOKEN_HEADER]: MEDIA_KEY }))).toThrow(UnauthorizedException);
  });
});

describe('OfficeTokenGuard — P7 без ключа в env дверь закрыта с названной причиной', () => {
  it.each([undefined, ''])('CABINET_OFFICE_TOKEN=%p → 503, а не 401 и не пропуск', (value) => {
    const g = guard({ CABINET_OFFICE_TOKEN: value, API_INTERNAL_TOKEN: MEDIA_KEY });
    expect(() => g.canActivate(ctx({ [OFFICE_TOKEN_HEADER]: MEDIA_KEY }))).toThrow(ServiceUnavailableException);
    expect(() => g.canActivate(ctx({}))).toThrow(OFFICE_DOOR_NOT_CONFIGURED_MESSAGE);
  });

  it('фраза 503 называет переменную, но не значение ключа', () => {
    expect(OFFICE_DOOR_NOT_CONFIGURED_MESSAGE).toBe('office door is not configured (CABINET_OFFICE_TOKEN is not set)');
  });
});

describe('tokensEqual', () => {
  it('равные → true; разная длина → false; та же длина, другое содержимое → false', () => {
    expect(tokensEqual(OFFICE_KEY, OFFICE_KEY)).toBe(true);
    expect(tokensEqual(OFFICE_KEY, `${OFFICE_KEY}x`)).toBe(false);
    expect(tokensEqual('abcd', 'abce')).toBe(false);
    expect(tokensEqual('', '')).toBe(true);
  });
});
