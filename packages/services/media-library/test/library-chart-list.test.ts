/**
 * Зубы общего ядра панели отбора (#2110). Переехали сюда из Studio: правило «день человека в
 * его поясе» теперь одно на обоих близнецов, и проверяется у своего дома, а не у одного из них.
 */
import { describe, expect, it } from 'vitest';

import {
  LIBRARY_CHART_LIST_CRITERIA,
  LIBRARY_CHART_LIST_VOLUMES,
  dateInputToIsoWindow,
} from '../src/library-chart-list.js';

describe('dateInputToIsoWindow', () => {
  it('день человека — от его local-полуночи до local-23:59:59.999, обе границы включительны', () => {
    const { from, to } = dateInputToIsoWindow('2026-08-23', '2026-08-23');
    // Сверка против local-конструктора, НЕ против литерала: зуб обязан быть зелёным в любом
    // поясе раннера, а литерал зашил бы пояс машины, на которой его писали.
    expect(from).toBe(new Date(2026, 7, 23, 0, 0, 0, 0).toISOString());
    expect(to).toBe(new Date(2026, 7, 23, 23, 59, 59, 999).toISOString());
  });

  it('НЕ парсит строку как UTC: для пояса восточнее Гринвича день не начинается вчера вечером', () => {
    const { from } = dateInputToIsoWindow('2026-08-23', '');
    expect(from).toBe(new Date(2026, 7, 23).toISOString());
  });

  it('полуокна законны: пустая строка не рождает границу', () => {
    expect(dateInputToIsoWindow('', '2026-08-23').from).toBeUndefined();
    expect(dateInputToIsoWindow('2026-08-23', '').to).toBeUndefined();
    expect(dateInputToIsoWindow('', '')).toEqual({});
  });

  it('мусор вместо даты границы не рождает — молча слать NaN серверу нельзя', () => {
    expect(dateInputToIsoWindow('вчера', '23.08.2026')).toEqual({});
  });
});

describe('словари панели', () => {
  it('объёмы — закрытый список владельца, критерии — закрытая тройка команды', () => {
    expect([...LIBRARY_CHART_LIST_VOLUMES]).toEqual([20, 60, 100, 200]);
    expect(LIBRARY_CHART_LIST_CRITERIA.map((c) => c.value)).toEqual([
      'loudness-over-floor',
      'spectral-variety',
      'drone-likeness',
    ]);
  });
});
