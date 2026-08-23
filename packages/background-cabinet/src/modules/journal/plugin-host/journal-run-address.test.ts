/**
 * Зубы адреса и отпечатка прогона журнала. Блок c1 спринта `chart-list-plugin`.
 *
 * Проверяется не «функция что-то вернула», а два утверждения, ради которых она заведена:
 * различимость заданий несёт отпечаток, и адрес не тащит пользовательский домен в офис.
 */
import { describe, expect, it } from 'vitest';

import {
  JOURNAL_RUN_COLLECTION_ID,
  journalInputHash,
  journalRunAddress,
} from './journal-run-address';

describe('адрес прогона журнала (пробел 1)', () => {
  it('набор назван журналом, а не коллекцией-затычкой и не буфером', () => {
    const a = journalRunAddress('membrana.showcase.chart-list', '0.1.0', 'run-1');
    expect(a.collectionId).toBe('journal');
    expect(a.mountTarget).toBe('background-cabinet/journal');
  });

  it('идентификатора пользователя в адресе НЕТ — иначе он уехал бы в офис мимо Т4', () => {
    const a = journalRunAddress('membrana.showcase.chart-list', '0.1.0', 'run-1');
    expect(JOURNAL_RUN_COLLECTION_ID).toBe('journal');
    expect(JSON.stringify(a)).not.toMatch(/user/i);
  });

  it('два прогона расходятся ТОЛЬКО runId — названная цена M3′ не тронута', () => {
    const a = journalRunAddress('membrana.showcase.chart-list', '0.1.0', 'run-1');
    const b = journalRunAddress('membrana.showcase.chart-list', '0.1.0', 'run-2');
    expect({ ...a, runId: null }).toEqual({ ...b, runId: null });
    expect(a.runId).not.toBe(b.runId);
  });

  it('runId приходит извне, а не рождается адресатором', () => {
    expect(journalRunAddress('p', '1', 'снаружи').runId).toBe('снаружи');
  });
});

describe('отпечаток входа журнала (пробел 2)', () => {
  it('разный состав задания — разный отпечаток: различимость несёт ОН, а не адрес', () => {
    expect(journalInputHash(['e1', 'e2'])).not.toBe(journalInputHash(['e1', 'e3']));
  });

  it('тот же состав в другом порядке — тот же отпечаток: задание есть набор, а не очередь', () => {
    expect(journalInputHash(['e2', 'e1', 'e3'])).toBe(journalInputHash(['e1', 'e3', 'e2']));
  });

  it('повтор адреса состава не меняет — задание из одной записи дважды есть задание из одной', () => {
    expect(journalInputHash(['e1', 'e1'])).toBe(journalInputHash(['e1']));
  });

  it('подмножество и надмножество различимы — иначе выборка по 20 совпала бы с выборкой по 200', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `e${i}`);
    const twoHundred = Array.from({ length: 200 }, (_, i) => `e${i}`);
    expect(journalInputHash(twenty)).not.toBe(journalInputHash(twoHundred));
  });

  it('пустое задание отпечатка НЕ получает — оно отвергается до плагина', () => {
    expect(() => journalInputHash([])).toThrow(/пустое задание/);
  });

  it('отпечаток устойчив между прогонами — иначе он ничего не удостоверяет', () => {
    expect(journalInputHash(['e1', 'e2'])).toBe(journalInputHash(['e1', 'e2']));
  });
});
