/**
 * Зубы конверсии дат панели отбора (#2110). Единственная логика панели, которую можно
 * проверить числами: остальное — заказ у сервера и показ ответа.
 */
import { describe, expect, it } from 'vitest';

import { dateInputToIsoWindow } from './types';

describe('dateInputToIsoWindow', () => {
  it('день человека — от его local-полуночи до local-23:59:59.999, обе границы включительны', () => {
    const { from, to } = dateInputToIsoWindow('2026-08-22', '2026-08-22');
    // Сверка против local-конструктора, НЕ против литерала: зуб обязан быть зелёным в любом
    // поясе раннера, а литерал зашил бы пояс машины, на которой его писали.
    expect(from).toBe(new Date(2026, 7, 22, 0, 0, 0, 0).toISOString());
    expect(to).toBe(new Date(2026, 7, 22, 23, 59, 59, 999).toISOString());
  });

  it('НЕ парсит строку как UTC: для пояса восточнее Гринвича день не начинается вчера вечером', () => {
    const { from } = dateInputToIsoWindow('2026-08-22', '');
    // new Date('2026-08-22') читается как UTC-полночь; правильная конверсия — local-полночь.
    // В UTC-поясе значения совпадают, и это законно; расходиться они обязаны только там,
    // где пояс ненулевой — потому сверка идёт с local-конструктором, а не с неравенством.
    expect(from).toBe(new Date(2026, 7, 22).toISOString());
  });

  it('полуокна законны: пустая строка не рождает границу', () => {
    expect(dateInputToIsoWindow('', '2026-08-22').from).toBeUndefined();
    expect(dateInputToIsoWindow('2026-08-22', '').to).toBeUndefined();
    expect(dateInputToIsoWindow('', '')).toEqual({});
  });

  it('мусор вместо даты границы не рождает — молча слать NaN серверу нельзя', () => {
    expect(dateInputToIsoWindow('вчера', '22.08.2026')).toEqual({});
  });
});
