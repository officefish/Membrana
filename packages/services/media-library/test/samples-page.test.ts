/**
 * Зубы правила страницы (#2505). Предмет — `src/samples-page.ts`.
 *
 * Порчи → красный (проверены руками, а не обещаны):
 *  • убрать приведение номера (`clampSamplesPage` вернёт `page` как есть) — красный на «страница
 *    27 списка из одной»;
 *  • посчитать пустой список как одну страницу (`total === 0 ? 1 : …`) — красный;
 *  • взять размер страницы числом (`40` вместо `DEFAULT_SAMPLES_PAGE_SIZE`) — красный на пробе
 *    «умолчание — тот самый размер, что у двери»;
 *  • срезать окно от нуля (`slice(0, size)`) — красный на последней странице;
 *  • считать `from` от нуля — красный на «1–40 из 1057».
 */
import { describe, expect, it } from 'vitest';

import { DEFAULT_SAMPLES_PAGE_SIZE } from '../src/constants.js';
import { clampSamplesPage, resolveSamplesPageWindow } from '../src/samples-page.js';

/** Живой объём буфера прибора на 28.09 — та цифра, из-за которой листание и понадобилось. */
const LIVE_BUFFER = 1057;

const rows = (n: number) => Array.from({ length: n }, (_, i) => `s-${i + 1}`);

describe('clampSamplesPage: номер страницы не переживает список', () => {
  it('страница вне диапазона приводится к последней живой', () => {
    // Буфер вывезли окном «перенести все»: было 27 страниц, осталась одна.
    expect(clampSamplesPage(27, 1)).toBe(1);
    expect(clampSamplesPage(99, 27)).toBe(27);
  });

  it('пустой список — страница всё равно первая, а не нулевая', () => {
    // `totalPages === 0` у двери означает «показывать нечего»; «страница 0» не существует.
    expect(clampSamplesPage(3, 0)).toBe(1);
    expect(clampSamplesPage(1, 0)).toBe(1);
  });

  it('страница в диапазоне не трогается', () => {
    expect(clampSamplesPage(1, 27)).toBe(1);
    expect(clampSamplesPage(14, 27)).toBe(14);
    expect(clampSamplesPage(27, 27)).toBe(27);
  });

  it('мусор на входе становится первой страницей, а не NaN-ом в счётчике', () => {
    expect(clampSamplesPage(Number.NaN, 27)).toBe(1);
    expect(clampSamplesPage(0, 27)).toBe(1);
    expect(clampSamplesPage(-5, 27)).toBe(1);
    expect(clampSamplesPage(2.7, 27)).toBe(2);
  });
});

describe('resolveSamplesPageWindow: окно страницы и оба числа рядом', () => {
  it('умолчание размера — ТОТ ЖЕ размер, что у двери и у кабинета', () => {
    // Объяви размер вторым числом, и «страница 3 из 27» станет про разные вещи в разных домах.
    const view = resolveSamplesPageWindow(rows(LIVE_BUFFER), 1);
    expect(view.pageSize).toBe(DEFAULT_SAMPLES_PAGE_SIZE);
    expect(view.items).toHaveLength(DEFAULT_SAMPLES_PAGE_SIZE);
  });

  it('1057 проб: первая страница — 40 строк, а полное число едет рядом', () => {
    const view = resolveSamplesPageWindow(rows(LIVE_BUFFER), 1);
    expect(view.items).toHaveLength(40);
    expect(view.items[0]).toBe('s-1');
    expect(view.items.at(-1)).toBe('s-40');
    expect(view.page).toBe(1);
    expect(view.totalPages).toBe(27);
    expect(view.total).toBe(LIVE_BUFFER);
    expect(view.from).toBe(1);
    expect(view.to).toBe(40);
  });

  it('последняя страница — остаток, а не сорок строк', () => {
    const view = resolveSamplesPageWindow(rows(LIVE_BUFFER), 27);
    expect(view.items).toHaveLength(17);
    expect(view.items[0]).toBe('s-1041');
    expect(view.items.at(-1)).toBe(`s-${LIVE_BUFFER}`);
    expect(view.from).toBe(1041);
    expect(view.to).toBe(LIVE_BUFFER);
  });

  it('страница за краем приводится к живой, а не отдаёт пустоту', () => {
    const view = resolveSamplesPageWindow(rows(LIVE_BUFFER), 999);
    expect(view.page).toBe(27);
    expect(view.items).toHaveLength(17);
  });

  it('пустой список: ноль страниц и «0–0 из 0», без выдуманной единицы', () => {
    const view = resolveSamplesPageWindow([], 5);
    expect(view.totalPages).toBe(0);
    expect(view.page).toBe(1);
    expect(view.from).toBe(0);
    expect(view.to).toBe(0);
    expect(view.items).toEqual([]);
  });

  it('свой размер страницы уважается (окно переполнения и прочие узкие места)', () => {
    const view = resolveSamplesPageWindow(rows(25), 3, 10);
    expect(view.pageSize).toBe(10);
    expect(view.totalPages).toBe(3);
    expect(view.items).toEqual(['s-21', 's-22', 's-23', 's-24', 's-25']);
    expect(view.from).toBe(21);
    expect(view.to).toBe(25);
  });

  it('исходный список не переворачивается и не режется на месте', () => {
    const source = rows(45);
    const copy = [...source];
    resolveSamplesPageWindow(source, 2);
    expect(source).toEqual(copy);
  });
});
