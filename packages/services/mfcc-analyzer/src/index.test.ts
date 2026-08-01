/**
 * Зуб публичного контракта пакета.
 *
 * Заведён вместе с закрытием шва 01.08. До него корневой индекс не реэкспортировал
 * детекторы, и это не ловилось ничем: тесты трубы и тренда импортировали их напрямую из
 * `detectors/`, поэтому были зелёными при недоступном снаружи пакете. Цена уже уплачена —
 * прибор судил собственной копией счёта, потому что до детектора было не дотянуться.
 */
import { describe, expect, it } from 'vitest';

import * as pkg from './index.js';

describe('корневой индекс отдаёт детекторы наружу', () => {
  it('труба и тренд доступны из корня пакета', () => {
    expect(typeof pkg.evaluatePipe).toBe('function');
    expect(typeof pkg.evaluateTrend).toBe('function');
  });

  it('общая часть детекторов доступна: судейство серии и меры', () => {
    for (const name of ['judgeRun', 'magnitudeOf', 'meanOf', 'cosineOf', 'refuse'] as const) {
      expect(typeof pkg[name]).toBe('function');
    }
  });

  it('ядро на месте — реэкспорт детекторов его не вытеснил', () => {
    expect(typeof pkg.processWindow).toBe('function');
    expect(typeof pkg.createEngine).toBe('function');
    expect(typeof pkg.configHashOf).toBe('function');
  });

  it('meyda за периметр не выходит: чужих имён в контракте нет', () => {
    // Решение структурщика, записанное в шапке индекса: проброс чужого типа сделал бы
    // библиотеку частью нашего контракта. Реэкспорт детекторов его не нарушил.
    const foreign = Object.keys(pkg).filter((k) => /meyda/iu.test(k));
    expect(foreign).toEqual([]);
  });
});
