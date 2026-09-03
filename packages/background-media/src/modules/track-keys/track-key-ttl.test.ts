/**
 * Зубы умолчания срока (DoD блока `key-ttl`, пункты 1 и 2).
 *
 * 1 — перебором: пусто · невалидно · NaN · повреждено · дата в прошлом · отрицательное →
 *     ИМЕНОВАННАЯ КОНСТАНТА, а не `null`;
 * 2 — валидный срок → он сам, константа заданное не подменяет.
 *
 * Третий пункт DoD (порча) живёт отдельным файлом: он гоняет ЭТОТ ЖЕ перебор по искалеченной
 * копии исходника и требует, чтобы зуб покраснел.
 */
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TRACK_KEY_TTL,
  MAX_TRACK_KEY_TTL,
  TRACK_KEY_TTL_FALLBACK_REASONS,
  isLiftedTtl,
  resolveTrackKeyTtl,
  trackKeyExpiresAt,
} from './track-key-ttl';
import { TTL_CORRUPTION_CASES, TTL_NOW } from './stubs/ttl-corruption-table';

const resolve = (stored: unknown) => resolveTrackKeyTtl(stored, { now: TTL_NOW });

describe('DoD-1 · fail-closed: порча даёт константу, а не null', () => {
  it.each(TTL_CORRUPTION_CASES.map((c) => [`${c.kind} · ${c.name}`, c] as const))(
    '%s → DEFAULT_TRACK_KEY_TTL',
    (_label, testCase) => {
      const ttl = resolve(testCase.stored);

      // Несущее: срок ЕСТЬ. `null` здесь означал бы бессрочную ссылку, выданную молча — то
      // самое, что вердикт M3 запрещает прямым текстом.
      expect(ttl.seconds, 'порча дала null вместо умолчания — защиты по умолчанию нет').not.toBeNull();
      expect(ttl.seconds).toBe(DEFAULT_TRACK_KEY_TTL);
      expect(ttl.source).toBe('default');
      expect(ttl.reason).toBe(testCase.reason);
    },
  );

  it('перебор покрывает все шесть разрядов DoD', () => {
    const kinds = new Set(TTL_CORRUPTION_CASES.map((c) => c.kind));
    expect([...kinds].sort()).toEqual(
      ['NaN', 'дата в прошлом', 'невалидно', 'отрицательное', 'повреждено', 'пусто'].sort(),
    );
  });

  it('каждая причина словаря названа поимённо — молчаливой подстановки нет', () => {
    const used = new Set(TTL_CORRUPTION_CASES.map((c) => c.reason));
    // Словарь закрыт, и перебор обязан его исчерпывать: причина без случая — не проверенная
    // ветка, случай без причины — причина, придуманная тестом.
    expect([...used].sort()).toEqual([...TRACK_KEY_TTL_FALLBACK_REASONS].sort());
  });

  it('инвариант: seconds === null возможно ТОЛЬКО у снятого человеком срока', () => {
    for (const testCase of TTL_CORRUPTION_CASES) {
      const ttl = resolve(testCase.stored);
      expect(ttl.seconds === null).toBe(isLiftedTtl(ttl));
      expect(isLiftedTtl(ttl)).toBe(false);
    }
  });

  it('у порчи всегда есть момент истечения — потому что есть константа', () => {
    for (const testCase of TTL_CORRUPTION_CASES) {
      const at = trackKeyExpiresAt(resolve(testCase.stored), TTL_NOW);
      expect(at).not.toBeNull();
      expect(at?.toISOString()).toBe(new Date(TTL_NOW.getTime() + DEFAULT_TRACK_KEY_TTL * 1000).toISOString());
    }
  });

  it('сломанные часы вызывающего — тоже порча входа', () => {
    const ttl = resolveTrackKeyTtl({ mode: 'seconds', seconds: 3600 }, { now: new Date(Number.NaN) });
    expect(ttl.seconds).toBe(DEFAULT_TRACK_KEY_TTL);
    expect(ttl.reason).toBe('malformed');
  });
});

describe('DoD-2 · валидный срок принимается как есть', () => {
  const future = new Date(TTL_NOW.getTime() + 2 * 3600 * 1000).toISOString();

  it.each([
    ['число секунд', 3600, 3600],
    ['числовая строка', '3600', 3600],
    ['запись кабинета', { mode: 'seconds', seconds: 3600 }, 3600],
    ['запись кабинета со строкой', { mode: 'seconds', seconds: '90' }, 90],
    ['сырое { seconds }', { seconds: 120 }, 120],
    ['абсолютная дата в будущем', future, 7200],
    ['сырое { expiresAt }', { expiresAt: future }, 7200],
    ['ровно потолок', MAX_TRACK_KEY_TTL, MAX_TRACK_KEY_TTL],
    ['одна секунда', 1, 1],
  ] as const)('%s → %s секунд, константа не подменяет', (_label, stored, expected) => {
    const ttl = resolve(stored);
    expect(ttl.seconds).toBe(expected);
    expect(ttl.source).toBe('configured');
    expect(ttl.reason).toBe('configured');
  });

  it('заданный срок, СОВПАДАЮЩИЙ с константой, всё равно помечен как заданный', () => {
    // Иначе приёмка не отличит «человек выбрал 15 минут» от «умолчание подставлено молча».
    const ttl = resolve({ mode: 'seconds', seconds: DEFAULT_TRACK_KEY_TTL });
    expect(ttl.seconds).toBe(DEFAULT_TRACK_KEY_TTL);
    expect(ttl.source).toBe('configured');
  });

  it('человек открыл блок и оставил умолчание — та же константа, но выбранная', () => {
    const ttl = resolve({ mode: 'default' });
    expect(ttl.seconds).toBe(DEFAULT_TRACK_KEY_TTL);
    expect(ttl.source).toBe('default');
    expect(ttl.reason).toBe('default-chosen');
  });
});

describe('снятие срока — назначается, а не возникает', () => {
  const lifted = { mode: 'lifted', liftedAt: '2026-09-02T09:00:00.000Z', liftedBy: 'owner' };

  it('подписанное движение человека даёт бессрочную ссылку', () => {
    const ttl = resolve(lifted);
    expect(ttl.seconds).toBeNull();
    expect(ttl.source).toBe('lifted');
    expect(isLiftedTtl(ttl)).toBe(true);
    expect(trackKeyExpiresAt(ttl, TTL_NOW)).toBeNull();
  });

  it('снятие без подписи — порча, а не бессрочность', () => {
    // Право владельца снять срок закрыто штормом и не оспаривается. Но движение без подписи
    // неотличимо от повреждённой записи, и различать их «по доброте» — значит отдать
    // бессрочную ссылку по кляксе в хранилище.
    for (const broken of [
      { mode: 'lifted' },
      { mode: 'lifted', liftedBy: '' },
      { mode: 'lifted', liftedBy: 'owner' },
      { mode: 'lifted', liftedAt: lifted.liftedAt },
      { mode: 'lifted', liftedBy: 'owner', liftedAt: '  ' },
    ]) {
      const ttl = resolve(broken);
      expect(ttl.seconds).toBe(DEFAULT_TRACK_KEY_TTL);
      expect(ttl.source).toBe('default');
    }
  });

  it('бессрочность не назначается величиной — только словом', () => {
    // Огромное число неотличимо от опечатки, поэтому оно НЕ синоним снятия срока.
    const ttl = resolve(Number.MAX_SAFE_INTEGER);
    expect(ttl.seconds).toBe(DEFAULT_TRACK_KEY_TTL);
    expect(ttl.reason).toBe('over-ceiling');
  });
});

describe('разряд константы назван, а не унаследован', () => {
  it('умолчание — 15 минут в секундах', () => {
    expect(DEFAULT_TRACK_KEY_TTL).toBe(900);
  });

  it('разряд НЕ совпадает с младшим разрядом узловых ключей (4 часа)', () => {
    // Эпик: разряды словаря узловых ключей — «не того порядка» для ключа-предъявителя.
    // Зуб стережёт именно это: механическое копирование словаря его сломает.
    expect(DEFAULT_TRACK_KEY_TTL).toBeLessThan(4 * 3600);
  });

  it('потолок — 30 суток', () => {
    expect(MAX_TRACK_KEY_TTL).toBe(2_592_000);
  });
});
