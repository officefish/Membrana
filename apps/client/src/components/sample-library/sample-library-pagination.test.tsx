// @vitest-environment jsdom
/**
 * Зубы органов листания библиотеки Studio (#2505). Предмет — `SampleLibraryPagination.tsx`.
 *
 * Порчи → красный (проверены руками):
 *  • скрыть нав при `totalPages < 1` вместо `<= 1` — красный на «одна страница — органов нет»
 *    (иначе рядом с полным списком висит бессмысленное «1 / 1»);
 *  • НЕ скрывать нав вовсе — красный там же;
 *  • снять `disabled` с «Назад» на первой странице — красный (кнопка предлагала бы страницу 0);
 *  • снять `disabled` с «Вперёд» на последней — красный;
 *  • послать в `onPageChange` номер текущей страницы вместо соседней — красный;
 *  • показать вместо диапазона длину страницы («40 из 1057» → «1–40 из 1057») — красный.
 *
 * Доступность (спринт sample-library-paging-a11y, 29.09) — порчи → красный:
 *  • снять `role="status"` с индикатора — красный («живая область»);
 *  • вернуть `aria-current="page"` — красный (набора страниц нет, атрибут пуст);
 *  • убрать эффект фокуса — после края фокус остаётся на запертой кнопке, не на соседней — красный;
 *  • вернуть `disabled={… || loading}` — красный («loading не роняет фокус»);
 *  • снять гашение клика при `loading` — `onPageChange` вызван — красный;
 *  • `tabIndex={-1}` на кнопке или `<div role="button">` вместо `<button>` — красный;
 *  • повесить `window.addEventListener('keydown', …)` — красный (статический предикат);
 *  • снять `flex-wrap` с `nav` — красный (предикат РАЗМЕТКИ, не замер раскладки — см. ниже).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useState } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SampleLibraryPagination } from './SampleLibraryPagination';

afterEach(cleanup);

/** Живой буфер прибора 28.09: 1057 проб = 27 страниц по 40. */
const LIVE = { total: 1057, totalPages: 27, pageSize: 40 };

// `__dirname`, не `import.meta.url`: в jsdom адрес модуля не файловый, и `fileURLToPath` его не берёт.
const SOURCE = readFileSync(join(__dirname, 'SampleLibraryPagination.tsx'), 'utf8');
/**
 * Отрицательные проверки судят КОД, а не шапку: у близнеца в кабинете шаблон уже ловил собственную
 * прозу о прежнем дефекте — класс ложного красного зуба близнецов переноса (#2497). Комментарии
 * срезаются до сравнения; срез проверен самопроверкой ниже.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(?:^|[ \t]+)\/\/.*$/gmu, '');
const CODE = stripComments(SOURCE);

/** Слушатель клавиатуры на окне/документе — то, чего у нава быть не должно (ввод рядом не задевать). */
const GLOBAL_KEY_LISTENER = /(window|document)\.addEventListener\(\s*['"]key/u;
/** Ширина, заданная числом, или запрет переноса — разметка, которая на узком экране вылезет за край. */
// Просмотр назад `(?<![\w-])`: `min-w-0` — законное «сжимайся», и граница слова после дефиса его
// ловила бы как ширину. Поймано самопроверкой шаблона ниже, а не глазом.
const RIGID_WIDTH = /whitespace-nowrap|\bmin-w-\[|(?<![\w-])w-(?:\[|\d)/u;

/** Дом с состоянием страницы — как Studio: `onPageChange` меняет `page` в том же движении. */
function Harness({ start, loading, onPageChange }: {
  readonly start: number;
  readonly loading?: boolean;
  readonly onPageChange?: (page: number) => void;
}) {
  const [page, setPage] = useState(start);
  const from = (page - 1) * LIVE.pageSize + 1;
  const to = Math.min(page * LIVE.pageSize, LIVE.total);
  return (
    <SampleLibraryPagination
      page={page}
      totalPages={LIVE.totalPages}
      total={LIVE.total}
      from={from}
      to={to}
      loading={loading}
      onPageChange={(next) => {
        onPageChange?.(next);
        setPage(next);
      }}
    />
  );
}

const button = (name: 'Назад' | 'Вперёд') => screen.getByRole('button', { name });
const press = (name: 'Назад' | 'Вперёд') => {
  const el = button(name);
  el.focus();
  fireEvent.click(el);
  return el;
};

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
    expect(button('Назад')).toHaveProperty('disabled', true);
    expect(button('Вперёд')).toHaveProperty('disabled', false);
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
    expect(button('Назад')).toHaveProperty('disabled', false);
    expect(button('Вперёд')).toHaveProperty('disabled', true);
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
    fireEvent.click(button('Вперёд'));
    expect(onPageChange).toHaveBeenLastCalledWith(6);
    fireEvent.click(button('Назад'));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
  });
});

describe('доступность органов листания', () => {
  it('индикатор — живая область: смена страницы объявляется фразой, а не пустым aria-current', () => {
    const { container } = render(<Harness start={1} />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toContain('Страница 1 из 27, записи 1–40 из 1057');
    // Видимое «1 / 27» остаётся (#2237): фраза — ДОБАВКА для читателя экрана, не замена.
    expect(screen.getByText('1 / 27')).toBeTruthy();

    press('Вперёд');
    expect(screen.getByRole('status').textContent).toContain('Страница 2 из 27, записи 41–80 из 1057');

    // Набора страниц нет — «текущий элемент набора» здесь нечем обозначать.
    expect(container.querySelector('[aria-current]')).toBeNull();
  });

  it('фокус остаётся на нажатой кнопке, пока она активна', () => {
    render(<Harness start={5} />);
    const next = press('Вперёд');
    expect(screen.getByText('6 / 27')).toBeTruthy();
    expect(document.activeElement).toBe(next);
    expect(next).toHaveProperty('disabled', false);
  });

  it('на краю диапазона фокус переходит на соседнюю кнопку, а не падает на body', () => {
    const { unmount } = render(<Harness start={26} />);
    press('Вперёд');
    expect(button('Вперёд')).toHaveProperty('disabled', true);
    expect(document.activeElement).toBe(button('Назад'));
    unmount();

    render(<Harness start={2} />);
    press('Назад');
    expect(button('Назад')).toHaveProperty('disabled', true);
    expect(document.activeElement).toBe(button('Вперёд'));
  });

  it('loading не роняет фокус: кнопки не заперты disabled, клик гасится, nav занят', () => {
    const onPageChange = vi.fn();
    const { container } = render(<Harness start={5} loading onPageChange={onPageChange} />);
    const next = press('Вперёд');
    expect(onPageChange).not.toHaveBeenCalled();
    expect(screen.getByText('5 / 27')).toBeTruthy();
    expect(document.activeElement).toBe(next);
    for (const name of ['Назад', 'Вперёд'] as const) {
      expect(button(name)).toHaveProperty('disabled', false);
      expect(button(name).getAttribute('aria-disabled')).toBe('true');
    }
    expect(container.querySelector('nav')?.getAttribute('aria-busy')).toBe('true');
  });

  it('клавиатура: родные кнопки в Tab-порядке, слушателей на окне нет — ввод рядом не задет', () => {
    const onPageChange = vi.fn();
    render(<Harness start={5} onPageChange={onPageChange} />);
    for (const name of ['Назад', 'Вперёд'] as const) {
      expect(button(name).tagName).toBe('BUTTON');
      expect(button(name).tabIndex).toBe(0);
    }
    for (const key of ['ArrowRight', 'ArrowLeft', 'PageDown', 'PageUp', 'Home', 'End']) {
      fireEvent.keyDown(document.body, { key });
    }
    expect(onPageChange).not.toHaveBeenCalled();
    expect(CODE).not.toMatch(GLOBAL_KEY_LISTENER);
    expect(CODE).not.toContain('onKeyDown');
  });

  it('разметка переносится на узком экране — предикат РАЗМЕТКИ, не замер раскладки', () => {
    // jsdom раскладку не считает; живой замер на 320px — отдельный gap спринта (без браузера).
    // Здесь проверяется лишь то, что разметка не запрещает перенос и не задаёт жёсткой ширины.
    const { container } = render(<Harness start={27} />);
    const nav = container.querySelector('nav');
    expect(nav?.className.split(/\s+/u)).toContain('flex-wrap');
    expect(CODE).not.toMatch(RIGID_WIDTH);
  });

  it('шаблоны отрицательных проверок ловят то, что обещают', () => {
    // Без этой пробы отрицательные проверки выше зелены и при сломанном шаблоне.
    expect(stripComments('/** window.addEventListener("keydown", x) */\nconst a = 1; // w-[3px]\n')).toBe('\nconst a = 1;\n');
    expect("window.addEventListener('keydown', onKey)").toMatch(GLOBAL_KEY_LISTENER);
    expect('document.addEventListener("keyup", onKey)').toMatch(GLOBAL_KEY_LISTENER);
    expect("window.addEventListener('resize', onResize)").not.toMatch(GLOBAL_KEY_LISTENER);
    expect('className="whitespace-nowrap"').toMatch(RIGID_WIDTH);
    expect('className="w-[320px]"').toMatch(RIGID_WIDTH);
    expect('className="w-48"').toMatch(RIGID_WIDTH);
    expect('className="min-w-0 flex-wrap"').not.toMatch(RIGID_WIDTH);
  });
});
