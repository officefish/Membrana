/**
 * Зубы учёта квот (S4 плана интеграции; заседание `tariff-grid`).
 *
 * Сторожат вердикт M4: класс памяти обязателен на записи, исчерпание отказывает
 * на создание но не на жизнь, автовытеснения и тихой деградации нет, классы не
 * перетекают друг в друга. Проверка идёт по ЖИВОЙ матрице.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  applyCommit,
  applyDelete,
  applyRelease,
  applyReserve,
  decideReserve,
  isOverQuota,
  isReadDeleteAllowed,
  QUOTA_ENTITLEMENT_BY_CLASS,
  remaining,
  type ClassUsage,
} from './quota-ledger';
import type { TariffGridDocument } from './tariff-grid';

const LIVE: TariffGridDocument = JSON.parse(
  readFileSync(new URL('../../../../docs/tariffs/tariff-grid.json', import.meta.url), 'utf8'),
);

const MIB = 1024 * 1024;
const empty: ClassUsage = { occupied: 0, reserved: 0 };

describe('класс памяти обязателен', () => {
  it('запись без класса — дефект контракта, а не «положим куда-нибудь»', () => {
    const d = decideReserve(LIVE, 'free-v1', { bytes: 100 } as never, empty);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('missing_memory_class');
    expect(d.toothId).toBe('memory_class_required');
  });

  it('выдуманный класс не проходит — список закрыт', () => {
    const d = decideReserve(LIVE, 'free-v1', { memoryClass: 'warm' as never, bytes: 100 }, empty);
    expect(d.reason).toBe('missing_memory_class');
  });

  it('три класса имеют своё право в сетке и не делят одно', () => {
    const ids = Object.values(QUOTA_ENTITLEMENT_BY_CLASS);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(LIVE.registry.some((d) => d.id === id)).toBe(true);
  });
});

describe('потолок берётся из матрицы', () => {
  it('«Датчик»: горячая — 512 МиБ', () => {
    const d = decideReserve(LIVE, 'free-v1', { memoryClass: 'hot', bytes: MIB }, empty);
    expect(d.allowed).toBe(true);
    expect(d.limit).toBe(512 * MIB);
  });

  it('«Датчику» холодная не положена — ноль означает «нельзя», а не «сколько угодно»', () => {
    const d = decideReserve(LIVE, 'free-v1', { memoryClass: 'cold', bytes: 1 }, empty);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('quota_exceeded');
  });

  it('«Блокпост»: холодная — 2 ГиБ', () => {
    const d = decideReserve(LIVE, 'checkpoint-v1', { memoryClass: 'cold', bytes: MIB }, empty);
    expect(d.allowed).toBe(true);
    expect(d.limit).toBe(2048 * MIB);
  });

  it('неизвестный тариф — отказ, а не «сколько угодно»', () => {
    const d = decideReserve(LIVE, 'premium-v99', { memoryClass: 'hot', bytes: 1 }, empty);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('no_quota_cell');
  });
});

describe('исчерпание', () => {
  const nearFull: ClassUsage = { occupied: 511 * MIB, reserved: 0 };

  it('запись сверх потолка отклоняется зубом quota_exceeded и называет остаток', () => {
    const d = decideReserve(LIVE, 'free-v1', { memoryClass: 'hot', bytes: 2 * MIB }, nearFull);
    expect(d.allowed).toBe(false);
    expect(d.toothId).toBe('quota_exceeded');
    expect(d.remainingAfter).toBe(MIB);
  });

  it('запись ровно в остаток проходит — граница включительна', () => {
    const d = decideReserve(LIVE, 'free-v1', { memoryClass: 'hot', bytes: MIB }, nearFull);
    expect(d.allowed).toBe(true);
    expect(d.remainingAfter).toBe(0);
  });

  it('резервы занимают место наравне с записанным — иначе двойная выдача', () => {
    const withReserve: ClassUsage = { occupied: 500 * MIB, reserved: 12 * MIB };
    expect(remaining(512 * MIB, withReserve)).toBe(0);
    const d = decideReserve(LIVE, 'free-v1', { memoryClass: 'hot', bytes: 1 }, withReserve);
    expect(d.allowed).toBe(false);
  });

  it('чтение и удаление живут всегда — решение заседания, а не забытая ветка', () => {
    expect(isReadDeleteAllowed()).toBe(true);
  });

  it('переполнение после понижения тарифа законно: запрещено новое, не существующее', () => {
    const over: ClassUsage = { occupied: 900 * MIB, reserved: 0 };
    expect(isOverQuota(512 * MIB, over)).toBe(true);
    expect(remaining(512 * MIB, over)).toBe(0);
    expect(applyDelete(over, 400 * MIB).occupied).toBe(500 * MIB);
  });

  it('классы не перетекают: свободное в холодной не спасает горячую', () => {
    const hotFull: ClassUsage = { occupied: 2048 * MIB, reserved: 0 };
    const d = decideReserve(LIVE, 'checkpoint-v1', { memoryClass: 'hot', bytes: MIB }, hotFull);
    expect(d.allowed).toBe(false);
    const cold = decideReserve(LIVE, 'checkpoint-v1', { memoryClass: 'cold', bytes: MIB }, empty);
    expect(cold.allowed).toBe(true);
  });
});

describe('путь записи: резерв → фиксация | освобождение', () => {
  it('резерв занимает место, фиксация переводит его в занятое', () => {
    const afterReserve = applyReserve(empty, 10 * MIB);
    expect(afterReserve).toEqual({ occupied: 0, reserved: 10 * MIB });
    const afterCommit = applyCommit(afterReserve, 10 * MIB);
    expect(afterCommit).toEqual({ occupied: 10 * MIB, reserved: 0 });
  });

  it('запись не пришла — резерв снят, занятое не тронуто', () => {
    const afterReserve = applyReserve({ occupied: 5 * MIB, reserved: 0 }, 10 * MIB);
    expect(applyRelease(afterReserve, 10 * MIB)).toEqual({ occupied: 5 * MIB, reserved: 0 });
  });

  it('резерв не уходит в минус при двойном освобождении', () => {
    const once = applyRelease({ occupied: 0, reserved: 10 * MIB }, 10 * MIB);
    expect(applyRelease(once, 10 * MIB).reserved).toBe(0);
  });

  it('удаление не делает занятое отрицательным', () => {
    expect(applyDelete({ occupied: 5, reserved: 0 }, 999).occupied).toBe(0);
  });

  it('отрицательный и нечисловой размер отвергаются до потолка', () => {
    expect(decideReserve(LIVE, 'free-v1', { memoryClass: 'hot', bytes: -1 }, empty).reason).toBe('invalid_bytes');
    expect(decideReserve(LIVE, 'free-v1', { memoryClass: 'hot', bytes: NaN }, empty).reason).toBe('invalid_bytes');
  });
});
