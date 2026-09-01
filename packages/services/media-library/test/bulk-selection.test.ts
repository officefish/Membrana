/**
 * Зубы отбора под удаление пачкой (#2250).
 *
 * Порча владельца из билета: выбрать две рядовые и удалить без отметки — отказ; подсунуть в
 * отбор запись из именованного набора — окно называет её ценной поимённо. Второе и третье
 * держат зубы гипотезы ценности (`deletion-value.test.ts`); здесь — сам отбор.
 */
import { describe, expect, it } from 'vitest';

import {
  SELECT_ALL_SHOWN_LABEL,
  allShownPicked,
  bulkDeleteLabel,
  forgetPicks,
  pickedShownIds,
  toggleAllShown,
  togglePick,
} from '../src/bulk-selection.js';

const shown = ['a', 'b', 'c'];

describe('слова отбора — обещание, а не украшение', () => {
  it('«всё ПОКАЗАННОЕ», а не «всё»: подпись не обещает того, чего действие не делает', () => {
    // Класс docs/field/decisions-on-partial-data.md: человек думает про набор, действие идёт
    // по странице. Панель показывает выборку, за её краем лежат невидимые записи.
    expect(SELECT_ALL_SHOWN_LABEL).toContain('показанное');
    expect(SELECT_ALL_SHOWN_LABEL, 'подпись обещает весь набор — это ложь').not.toMatch(
      /^Выбрать всё$/u,
    );
  });

  it('число выбранных стоит В ПОДПИСИ кнопки — масштаб виден ДО нажатия', () => {
    expect(bulkDeleteLabel(0)).toBe('Удалить выбранные (0)');
    expect(bulkDeleteLabel(2)).toBe('Удалить выбранные (2)');
    expect(bulkDeleteLabel(40)).toContain('40');
  });
});

describe('отбор строк', () => {
  it('переключение одной строки не трогает соседей', () => {
    const one = togglePick(new Set<string>(), 'b');
    expect([...one]).toEqual(['b']);
    expect([...togglePick(one, 'b')]).toEqual([]);
  });

  it('«всё показанное» отмечает показанные и снимает их же повторным нажатием', () => {
    const all = toggleAllShown(new Set<string>(), shown);
    expect(allShownPicked(all, shown)).toBe(true);
    expect([...toggleAllShown(all, shown)]).toEqual([]);
  });

  it('ОТМЕТКИ ВНЕ ПОКАЗА ПЕРЕЖИВАЮТ переключение — чужую работу молча не стираем', () => {
    // Человек мог отобрать строки, сменить окно дат и вернуться.
    const withHidden = new Set(['z']);
    const all = toggleAllShown(withHidden, shown);
    expect(all.has('z')).toBe(true);
    const off = toggleAllShown(all, shown);
    expect([...off], 'снятие тоже трогает только показанное').toEqual(['z']);
  });

  it('пустой показ — НЕ «всё отмечено»: флажок над пустой таблицей не взводится', () => {
    expect(allShownPicked(new Set<string>(), [])).toBe(false);
    expect(allShownPicked(new Set(['a']), [])).toBe(false);
  });

  it('УХОДИТ ТОЛЬКО ВИДИМОЕ: отметка, пережившая смену окна, в список не попадает', () => {
    // Иначе удалили бы запись, которой человек сейчас не видит.
    const picked = new Set(['a', 'c', 'z']);
    expect(pickedShownIds(picked, shown)).toEqual(['a', 'c']);
  });

  it('порядок списка — от ПОКАЗА, чтобы окно читалось как таблица', () => {
    const picked = new Set(['c', 'a']);
    expect(pickedShownIds(picked, shown)).toEqual(['a', 'c']);
  });

  it('ушедшие записи перестают быть выбранными', () => {
    expect([...forgetPicks(new Set(['a', 'b', 'c']), ['a', 'c'])]).toEqual(['b']);
  });
});
