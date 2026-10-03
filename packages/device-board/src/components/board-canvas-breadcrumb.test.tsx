/**
 * @vitest-environment jsdom
 *
 * Зуб крошки контекста канваса в шапке доски (#2558). Предмет — `board-canvas-breadcrumb.tsx`.
 *
 * При сжатии шапки крошка уступает ПЕРВОЙ: вес сжатия выше, чем у бейджа удержания (`flex-shrink: 1`),
 * `min-w-0` — до нуля. jsdom раскладку не считает — зуб по классам и по значению константы.
 *
 * Порчи → красный: с nav пропал `shrink-[n]` (вес стал равен бейджу — оба уходят в ноль одновременно,
 * как на стволе 7c895b5e) — красный; пропал `min-w-0` (крошка перестаёт сжиматься ниже содержимого) —
 * красный; вес литералом мимо константы — красный (зуб `board-header-layout.test.ts`).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { BOARD_BREADCRUMB_SHRINK_CLASS } from '../types/board-ui.js';

import { BoardCanvasBreadcrumb } from './board-canvas-breadcrumb.js';

afterEach(() => cleanup());

describe('крошка контекста: уступает первой при сжатии шапки (#2558)', () => {
  it('P3: nav несёт вес сжатия из константы (shrink-[n], n ≥ 2) и min-w-0', () => {
    render(<BoardCanvasBreadcrumb segments={[{ label: 'Сценарий' }, { label: 'Основной' }]} detailTitle="Сценарий" />);
    const nav = screen.getByRole('navigation');
    const classes = nav.className.split(/\s+/u);
    expect(classes).toContain(BOARD_BREADCRUMB_SHRINK_CLASS);
    expect(BOARD_BREADCRUMB_SHRINK_CLASS).toMatch(/^shrink-\[([2-9]|\d{2,})\]$/u);
    expect(classes).toContain('min-w-0');
    expect(classes).toContain('truncate');
    expect(classes).not.toContain('shrink-0');
  });

  it('содержимое и подсказка не меняются: сегменты по порядку, последний усекается, title полный', () => {
    render(
      <BoardCanvasBreadcrumb
        segments={[{ label: 'Сценарий' }, { label: 'Основной' }]}
        detailTitle="Полное имя сценария"
      />,
    );
    const nav = screen.getByRole('navigation');
    expect(nav.getAttribute('title')).toBe('Полное имя сценария');
    expect(nav.textContent).toBe('Сценарий›Основной');
    const last = nav.querySelector('.truncate.font-medium');
    expect(last?.textContent).toBe('Основной');
  });
});
