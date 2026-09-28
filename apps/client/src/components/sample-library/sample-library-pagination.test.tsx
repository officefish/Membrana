// @vitest-environment jsdom
/**
 * Зубы органов листания библиотеки Studio (#2501). Предмет — `SampleLibraryPagination.tsx`.
 *
 * Порчи → красный (проверены руками):
 *  • скрыть нав при `totalPages < 1` вместо `<= 1` — красный на «одна страница — органов нет»
 *    (иначе рядом с полным списком висит бессмысленное «1 / 1»);
 *  • НЕ скрывать нав вовсе — красный там же;
 *  • снять `disabled` с «Назад» на первой странице — красный (кнопка предлагала бы страницу 0);
 *  • снять `disabled` с «Вперёд» на последней — красный;
 *  • послать в `onPageChange` номер текущей страницы вместо соседней — красный;
 *  • показать вместо диапазона длину страницы («40 из 1057» → «1–40 из 1057») — красный.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SampleLibraryPagination } from './SampleLibraryPagination';

afterEach(cleanup);

/** Живой буфер прибора 28.09: 1057 проб = 27 страниц по 40. */
const LIVE = { total: 1057, totalPages: 27 };

describe('органы листания: где я и сколько всего', () => {
  it('одна страница — органов нет: листать некуда', () => {
    const { container } = render(
      <SampleLibraryPagination
        page={1}
        totalPages={1}
        total={12}
        from={1}
        to={12}
        onPageChange={() => {}}
      />,
    );
    expect(container.querySelector('nav')).toBeNull();
  });

  it('пустой набор — органов нет (нулю страниц листать тоже нечего)', () => {
    const { container } = render(
      <SampleLibraryPagination
        page={1}
        totalPages={0}
        total={0}
        from={0}
        to={0}
        onPageChange={() => {}}
      />,
    );
    expect(container.querySelector('nav')).toBeNull();
  });

  it('27 страниц: видно И диапазон записей, И номер страницы', () => {
    render(
      <SampleLibraryPagination
        page={2}
        totalPages={LIVE.totalPages}
        total={LIVE.total}
        from={41}
        to={80}
        onPageChange={() => {}}
      />,
    );
    // «41–80 из 1057» отвечает на «сколько всего», «2 / 27» — на «где я».
    expect(screen.getByText('41–80 из 1057')).toBeTruthy();
    expect(screen.getByText('2 / 27')).toBeTruthy();
  });

  it('на первой странице «Назад» заперт, на последней — «Вперёд»', () => {
    const { unmount } = render(
      <SampleLibraryPagination
        page={1}
        totalPages={LIVE.totalPages}
        total={LIVE.total}
        from={1}
        to={40}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Назад' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Вперёд' })).toHaveProperty('disabled', false);
    unmount();

    render(
      <SampleLibraryPagination
        page={27}
        totalPages={LIVE.totalPages}
        total={LIVE.total}
        from={1041}
        to={1057}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Назад' })).toHaveProperty('disabled', false);
    expect(screen.getByRole('button', { name: 'Вперёд' })).toHaveProperty('disabled', true);
  });

  it('кнопки просят СОСЕДНЮЮ страницу, а не свою', () => {
    const onPageChange = vi.fn();
    render(
      <SampleLibraryPagination
        page={5}
        totalPages={LIVE.totalPages}
        total={LIVE.total}
        from={161}
        to={200}
        onPageChange={onPageChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Вперёд' }));
    expect(onPageChange).toHaveBeenLastCalledWith(6);
    fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
  });
});
