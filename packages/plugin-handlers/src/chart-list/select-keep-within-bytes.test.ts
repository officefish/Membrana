/**
 * Зубы отбора «оставить, пока хватает байт». Блок b1 спринта `tariff-downgrade-freeze-2587`
 * (ADR-0031, решение 6).
 *
 * Гоняются на ЧИСЛАХ: ни звука, ни базы, ни Nest. Проверяются утверждения, ради которых модуль
 * заведён: инвариант байт, приоритет keep (pinned → режим → новее → sampleId), судьба неизмеримых
 * и детерминизм при равных метках времени. Порча P1 плана: на стволе 796dfd87 файл
 * `./select-keep-within-bytes.js` отсутствует — импорт падает, зуб красный.
 */
import { describe, expect, it } from 'vitest';

import {
  compareKeepPriority,
  modeRanksFromPicks,
  selectKeepWithinBytes,
  type KeepCandidate,
} from './select-keep-within-bytes.js';

const T0 = 1_759_600_000_000; // 2026-10-04T...Z — любая фиксированная точка

const cand = (over: Partial<KeepCandidate> & { sampleId: string }): KeepCandidate => ({
  bytes: 100,
  createdAt: T0,
  pinned: false,
  modeRank: 0,
  ...over,
});

const ids = (list: readonly KeepCandidate[]): string[] => list.map((c) => c.sampleId);
const sumBytes = (list: readonly KeepCandidate[]): number => list.reduce((s, c) => s + c.bytes, 0);

describe('selectKeepWithinBytes — инвариант байт', () => {
  it('сумма keep не превышает лимит, а keep ∪ freeze = вход без потерь и дублей', () => {
    const input = Array.from({ length: 12 }, (_, i) =>
      cand({ sampleId: `s${String(i).padStart(2, '0')}`, bytes: 50 + i * 10, modeRank: i }),
    );
    const out = selectKeepWithinBytes(input, 400);
    expect(out.refusal).toBeNull();
    expect(sumBytes(out.keep)).toBeLessThanOrEqual(400);
    expect(out.keepBytes).toBe(sumBytes(out.keep));
    expect(out.freezeBytes).toBe(sumBytes(out.freeze));
    expect(out.keepBytes + out.freezeBytes).toBe(sumBytes(input));
    expect([...ids(out.keep), ...ids(out.freeze)].sort()).toEqual(ids(input).sort());
    // Лучшие по режиму s00..s05 = 50+60+70+80+90+100 = 450 > 400: s05 не влез, но s06 (110) тоже
    // нет; жадность по приоритету — кто первый влез, тот и остался.
    expect(ids(out.keep)).toEqual(['s00', 's01', 's02', 's03', 's04']);
    expect(out.keepBytes).toBe(350);
  });

  it('жадность продолжает после не влезшего: меньший следующий ещё может остаться', () => {
    const out = selectKeepWithinBytes(
      [
        cand({ sampleId: 'a', bytes: 300, modeRank: 0 }),
        cand({ sampleId: 'b', bytes: 300, modeRank: 1 }),
        cand({ sampleId: 'c', bytes: 100, modeRank: 2 }),
      ],
      400,
    );
    expect(ids(out.keep)).toEqual(['a', 'c']);
    expect(ids(out.freeze)).toEqual(['b']);
    expect(out.keepBytes).toBe(400);
  });

  it('лимит 0 — всё во freeze, keep пуст, отказа нет', () => {
    const out = selectKeepWithinBytes([cand({ sampleId: 'a' }), cand({ sampleId: 'b', pinned: true })], 0);
    expect(out.refusal).toBeNull();
    expect(out.keep).toEqual([]);
    expect(ids(out.freeze)).toEqual(['b', 'a']);
    expect(out.freezeBytes).toBe(200);
  });

  it('пустой вход — пустой ответ без отказа (нечего морозить — не ошибка)', () => {
    const out = selectKeepWithinBytes([], 1024);
    expect(out).toEqual({
      keep: [],
      freeze: [],
      keepBytes: 0,
      freezeBytes: 0,
      limitBytes: 1024,
      refusal: null,
    });
  });

  it('всё влезает — freeze пуст', () => {
    const input = [cand({ sampleId: 'a' }), cand({ sampleId: 'b' })];
    const out = selectKeepWithinBytes(input, 200);
    expect(ids(out.keep)).toEqual(['a', 'b']);
    expect(out.freeze).toEqual([]);
  });
});

describe('selectKeepWithinBytes — приоритет keep', () => {
  it('размеченные и «хранить» идут первыми, даже если режим ставит их последними', () => {
    const out = selectKeepWithinBytes(
      [
        cand({ sampleId: 'loud', modeRank: 0 }),
        cand({ sampleId: 'mid', modeRank: 1 }),
        cand({ sampleId: 'kept', modeRank: 2, pinned: true }),
      ],
      200,
    );
    expect(ids(out.keep)).toEqual(['kept', 'loud']);
    expect(ids(out.freeze)).toEqual(['mid']);
  });

  it('pinned, не влезший в бюджет, уходит во freeze — защита не ворует квоту', () => {
    const out = selectKeepWithinBytes(
      [cand({ sampleId: 'big-pinned', bytes: 500, pinned: true }), cand({ sampleId: 'small', bytes: 100 })],
      200,
    );
    expect(ids(out.keep)).toEqual(['small']);
    expect(ids(out.freeze)).toEqual(['big-pinned']);
  });

  it('при равном ранге режима остаётся более новая запись (старые во freeze раньше)', () => {
    const out = selectKeepWithinBytes(
      [
        cand({ sampleId: 'old', modeRank: 0, createdAt: T0 - 60_000 }),
        cand({ sampleId: 'new', modeRank: 0, createdAt: T0 }),
      ],
      100,
    );
    expect(ids(out.keep)).toEqual(['new']);
    expect(ids(out.freeze)).toEqual(['old']);
  });

  it('при равных ранге и времени решает sampleId по возрастанию — детерминизм без порядка входа', () => {
    const a = cand({ sampleId: 'b-2' });
    const b = cand({ sampleId: 'a-9' });
    const c = cand({ sampleId: 'a-10' });
    const forward = selectKeepWithinBytes([a, b, c], 200);
    const backward = selectKeepWithinBytes([c, b, a], 200);
    expect(ids(forward.keep)).toEqual(['a-10', 'a-9']);
    expect(ids(forward.freeze)).toEqual(['b-2']);
    expect(backward).toEqual(forward);
  });
});

describe('selectKeepWithinBytes — неизмеримые', () => {
  it('неизмеримая (modeRank null) уходит во freeze даже при свободном бюджете', () => {
    const out = selectKeepWithinBytes(
      [cand({ sampleId: 'measured', modeRank: 3 }), cand({ sampleId: 'silent', modeRank: null })],
      10_000,
    );
    expect(ids(out.keep)).toEqual(['measured']);
    expect(ids(out.freeze)).toEqual(['silent']);
    expect(out.freezeBytes).toBe(100);
  });

  it('pinned побеждает неизмеримость: байты известны, слово человека «хранить» весомее меры', () => {
    const out = selectKeepWithinBytes([cand({ sampleId: 'kept-silent', modeRank: null, pinned: true })], 100);
    expect(ids(out.keep)).toEqual(['kept-silent']);
  });

  it('неизмеримые во freeze упорядочены новее → sampleId, как и измеренные', () => {
    const out = selectKeepWithinBytes(
      [
        cand({ sampleId: 'u-old', modeRank: null, createdAt: T0 - 1 }),
        cand({ sampleId: 'u-b', modeRank: null }),
        cand({ sampleId: 'u-a', modeRank: null }),
      ],
      10_000,
    );
    expect(ids(out.freeze)).toEqual(['u-a', 'u-b', 'u-old']);
  });
});

describe('compareKeepPriority', () => {
  it('pinned < измеренный < неизмеримый; внутри — ранг, новее, sampleId', () => {
    const pinned = cand({ sampleId: 'p', modeRank: 9, pinned: true });
    const rank0 = cand({ sampleId: 'r0', modeRank: 0 });
    const rank1new = cand({ sampleId: 'r1n', modeRank: 1, createdAt: T0 + 1 });
    const rank1old = cand({ sampleId: 'r1o', modeRank: 1, createdAt: T0 });
    const unmeasured = cand({ sampleId: 'u', modeRank: null });
    const sorted = [unmeasured, rank1old, rank1new, rank0, pinned].sort(compareKeepPriority);
    expect(ids(sorted)).toEqual(['p', 'r0', 'r1n', 'r1o', 'u']);
  });

  it('равные элементы дают 0 — компаратор антисимметричен', () => {
    const a = cand({ sampleId: 'x' });
    expect(compareKeepPriority(a, { ...a })).toBe(0);
    const b = cand({ sampleId: 'y' });
    expect(Math.sign(compareKeepPriority(a, b))).toBe(-Math.sign(compareKeepPriority(b, a)));
  });
});

describe('selectKeepWithinBytes — валидация входа (отказ вместо списка)', () => {
  it('лимит не целое неотрицательное число — invalid-limit, списки пусты', () => {
    for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const out = selectKeepWithinBytes([cand({ sampleId: 'a' })], bad);
      expect(out.refusal?.reason).toBe('invalid-limit');
      expect(out.keep).toEqual([]);
      expect(out.freeze).toEqual([]);
    }
  });

  it('байты записи не целое неотрицательное — invalid-candidate с адресом', () => {
    const out = selectKeepWithinBytes([cand({ sampleId: 'ok' }), cand({ sampleId: 'bad', bytes: -5 })], 100);
    expect(out.refusal?.reason).toBe('invalid-candidate');
    expect(out.refusal?.detail).toContain('bad');
  });

  it('createdAt не конечное число — invalid-candidate', () => {
    const out = selectKeepWithinBytes([cand({ sampleId: 'nat', createdAt: Number.NaN })], 100);
    expect(out.refusal?.reason).toBe('invalid-candidate');
    expect(out.refusal?.detail).toContain('nat');
  });

  it('повтор sampleId — duplicate-sample: один блоб не может быть и живым, и замороженным', () => {
    const out = selectKeepWithinBytes([cand({ sampleId: 'dup' }), cand({ sampleId: 'dup' })], 1000);
    expect(out.refusal?.reason).toBe('duplicate-sample');
    expect(out.refusal?.detail).toContain('dup');
  });

  it('modeRank отрицательный или дробный — invalid-candidate', () => {
    expect(selectKeepWithinBytes([cand({ sampleId: 'neg', modeRank: -1 })], 100).refusal?.reason).toBe(
      'invalid-candidate',
    );
    expect(selectKeepWithinBytes([cand({ sampleId: 'frac', modeRank: 0.5 })], 100).refusal?.reason).toBe(
      'invalid-candidate',
    );
  });
});

describe('selectKeepWithinBytes — замечания контекста Дынина (05.10)', () => {
  it('pinned-неизмеримая ВХОДИТ в keepBytes и держит бюджет — лимит один для всего keep', () => {
    const out = selectKeepWithinBytes(
      [
        cand({ sampleId: 'kept-silent', modeRank: null, pinned: true, bytes: 150 }),
        cand({ sampleId: 'loud', modeRank: 0, bytes: 100 }),
      ],
      200,
    );
    expect(ids(out.keep)).toEqual(['kept-silent']);
    expect(out.keepBytes).toBe(150);
    expect(ids(out.freeze)).toEqual(['loud']);
  });

  it('идемпотентность: повторный прогон на keep ∪ freeze с тем же лимитом даёт тот же ответ', () => {
    const input = Array.from({ length: 9 }, (_, i) =>
      cand({
        sampleId: `s${i}`,
        bytes: 30 + ((i * 37) % 90),
        modeRank: i % 3 === 0 ? null : (i * 7) % 5,
        pinned: i === 4,
        createdAt: T0 + ((i * 13) % 4) * 1000,
      }),
    );
    const first = selectKeepWithinBytes(input, 250);
    const second = selectKeepWithinBytes([...first.freeze, ...first.keep], 250);
    expect(second).toEqual(first);
  });

  it('лимит MAX_SAFE_INTEGER — всё измеренное остаётся, сумма байт считается без переполнения', () => {
    const input = [
      cand({ sampleId: 'a', bytes: Number.MAX_SAFE_INTEGER - 10 }),
      cand({ sampleId: 'b', bytes: 5 }),
    ];
    const out = selectKeepWithinBytes(input, Number.MAX_SAFE_INTEGER);
    expect(out.refusal).toBeNull();
    expect(ids(out.keep)).toEqual(['a', 'b']);
    expect(out.keepBytes).toBe(Number.MAX_SAFE_INTEGER - 5);
  });

  it('компаратор антисимметричен и транзитивен на 200 псевдослучайных тройках', () => {
    // Детерминированный LCG вместо Math.random: падение зуба должно воспроизводиться.
    let seed = 20261005;
    const next = (): number => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed;
    };
    const gen = (): KeepCandidate =>
      cand({
        sampleId: `s${next() % 7}`,
        pinned: next() % 2 === 0,
        modeRank: next() % 4 === 0 ? null : next() % 3,
        createdAt: T0 + (next() % 3) * 1000,
      });
    for (let i = 0; i < 200; i += 1) {
      const [a, b, c] = [gen(), gen(), gen()];
      const ab = Math.sign(compareKeepPriority(a, b));
      const ba = Math.sign(compareKeepPriority(b, a));
      // Сумма, не `toBe(-ba)`: Math.sign(0) = +0, а Object.is(+0, -0) ложен — равенство здесь ложно
      // падало бы на каждой паре равных кандидатов.
      expect(ab + ba).toBe(0);
      const bc = Math.sign(compareKeepPriority(b, c));
      const ac = Math.sign(compareKeepPriority(a, c));
      if (ab <= 0 && bc <= 0) expect(ac).toBeLessThanOrEqual(0);
      if (ab >= 0 && bc >= 0) expect(ac).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('modeRanksFromPicks', () => {
  it('переводит строки выборки chart-list в ранги по sampleId; отсутствующие — неизмеримые', () => {
    const ranks = modeRanksFromPicks([
      { sampleId: 's2', rank: 2 },
      { sampleId: 's1', rank: 1 },
    ]);
    expect(ranks.get('s1')).toBe(0);
    expect(ranks.get('s2')).toBe(1);
    expect(ranks.get('s3')).toBeUndefined();
  });

  it('повтор sampleId в выборке — ошибка входа, не молчаливая перезапись', () => {
    expect(() => modeRanksFromPicks([{ sampleId: 'x', rank: 1 }, { sampleId: 'x', rank: 2 }])).toThrow(
      /x/,
    );
  });
});
