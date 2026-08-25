/**
 * Зубы ядра пар похожих (#2109, b1). Гоняются на числах, без звука — как и отбор.
 */
import { describe, expect, it } from 'vitest';

import { findDuplicatePairs } from './duplicates.js';
import type { ChartListCandidate } from './selection.js';

/** Кандидат с управляемыми признаками: одинаковые `features` — «клон», иные — далёкий звук. */
function cand(id: string, deltaDb: number, at: number, seed: number): ChartListCandidate {
  return {
    entryId: `e-${id}`,
    sampleId: id,
    at,
    deltaDb,
    peakDb: -20 + deltaDb,
    flatness: 0.1,
    structure: 'tonal',
    durationSec: 5,
    // Оси ровно те, что у отсева (DEDUPE_AXES): чужое поле дало бы undefined → NaN → «никто
    // никому не похож» — первая редакция зуба так и упала, ядро было ни при чём.
    features: { centroidHz: 1000 + seed * 500, rolloffHz: 3000 + seed * 700, flatness: 0.1 + seed * 0.02, zeroCrossingRate: 0.05 + seed * 0.01 },
  };
}

describe('findDuplicatePairs', () => {
  it('клоны собираются в группу под самым громким; далёкий звук в пары не попадает', () => {
    const report = findDuplicatePairs([
      cand('громкий-клон', 30, 100, 0),
      cand('тихий-клон', 20, 105, 0),
      cand('ещё-клон', 10, 300, 0),
      cand('далёкий', 25, 200, 5),
    ]);
    expect(report.refusal).toBeNull();
    expect(report.candidatesSeen).toBe(4);
    expect(report.groups).toHaveLength(1);
    expect(report.groups[0]!.keeper.sampleId).toBe('громкий-клон');
    expect(report.groups[0]!.duplicates.map((d) => d.sampleId)).toEqual(['тихий-клон', 'ещё-клон']);
    expect(report.duplicatesFound).toBe(2);
  });

  it('внутри группы вытесненные идут по ВРЕМЕНИ — соседство по времени человек слышит первым', () => {
    const report = findDuplicatePairs([
      cand('k', 30, 100, 0),
      cand('поздний', 5, 900, 0),
      cand('ранний', 20, 50, 0),
      cand('иной', 25, 200, 5),
    ]);
    expect(report.groups[0]!.duplicates.map((d) => d.sampleId)).toEqual(['ранний', 'поздний']);
  });

  it('БЕЗ ЛИМИТА: чистке нужна КАЖДАЯ группа, а не первые двадцать представителей', () => {
    // Первая редакция зуба брала одну группу из 60 клонов — и порча «лимит 20» её не уронила:
    // лимит отбора режет ПРЕДСТАВИТЕЛЕЙ, а представитель был один. Нужны 25 разных групп.
    const input = Array.from({ length: 25 }, (_, g) => [
      cand(`группа-${g}-громкий`, 100 - g, g * 100, g * 3),
      cand(`группа-${g}-клон`, 50 - g, g * 100 + 5, g * 3),
    ]).flat();
    // Порог здесь ЯВНО низкий: при 25 группах на равномерной сетке шаг между соседями
    // (1/24 ≈ 4 % размаха) меньше унаследованных 5 % — соседи слились бы ЗАКОННО, и зуб
    // судил бы порог, а не лимит. Предмет зуба — лимит; порог задан так, чтобы не мешать.
    const report = findDuplicatePairs(input, { minDistanceRatio: 0.01 });
    expect(report.groups).toHaveLength(25);
    expect(report.duplicatesFound).toBe(25);
  });

  it('разнородный набор: пар нет — и это не отказ, а «дублей не нашлось»', () => {
    const report = findDuplicatePairs([cand('a', 30, 1, 0), cand('b', 20, 2, 3), cand('c', 10, 3, 6)]);
    expect(report.refusal).toBeNull();
    expect(report.groups).toEqual([]);
    expect(report.duplicatesFound).toBe(0);
  });

  it('отказы различимы: нет кандидатов ≠ одна проба', () => {
    expect(findDuplicatePairs([]).refusal?.reason).toBe('no-candidates');
    expect(findDuplicatePairs([cand('одна', 10, 1, 0)]).refusal?.reason).toBe('too-few');
  });

  it('паспорт называет порог числом и словом «унаследован» — цена числу видна человеку', () => {
    const report = findDuplicatePairs([cand('a', 30, 1, 0), cand('b', 20, 2, 0)]);
    expect(report.passport).toEqual({ minDistanceRatio: 0.05, inherited: true });
  });

  it('ЯДРО НИЧЕГО НЕ УДАЛЯЕТ: вход не мутирован, поля «удалить» в отчёте нет', () => {
    // DoD #2109: удаление — только по клику человека, на стороне панели. Ядро не знает
    // слова «удалить»: ни списка на удаление, ни мутации входа.
    const input = [cand('a', 30, 1, 0), cand('b', 20, 2, 0)];
    const snapshot = JSON.stringify(input);
    const report = findDuplicatePairs(input);
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(JSON.stringify(report)).not.toMatch(/delete|remove|удал/iu);
  });

  it('ПОРЧА ПО DoD: порог занижен до нуля — пары сжимаются до точных клонов, проба не исчезает', () => {
    // При minDistanceRatio = 0 порог = 0: похожими считаются лишь копии с нулевым расстоянием.
    // Ядро и тогда лишь называет пары; «исчезнуть» пробе неоткуда — удаления в ядре нет.
    const input = [cand('a', 30, 1, 0), cand('b', 20, 2, 0), cand('почти', 10, 3, 0.01)];
    const report = findDuplicatePairs(input, { minDistanceRatio: 0 });
    expect(report.groups[0]!.duplicates.map((d) => d.sampleId)).toEqual(['b']);
    expect(report.candidatesSeen).toBe(3);
    expect(input).toHaveLength(3);
  });
});
