/**
 * Зубы органов листания таблицы проб кабинета. Предмет — `CabinetSampleTablePagination.tsx`.
 * jsdom — по `environmentMatchGlobs` кабинета (`*.test.tsx`).
 *
 * До спринта sample-library-paging-a11y (29.09) у кабинетного нава зуба не было вовсе: его
 * поведение проверялось только словами через зуб близнецов в Studio. Теперь у каждого дома —
 * свой зуб на поведение, у близнецов — зуб на одинаковость слов и правила фокуса.
 *
 * Порчи → красный (проверены руками):
 *  • снять `role="status"` с индикатора — красный («живая область»);
 *  • вернуть `aria-current="page"` — красный (набора страниц нет, атрибут пуст);
 *  • убрать эффект фокуса — после края фокус остаётся на запертой кнопке, не на соседней — красный;
 *  • вернуть `disabled={… || loading}` — прежний дефект кабинета — красный («loading не роняет фокус»);
 *  • снять гашение клика при `loading` — `onPageChange` вызван — красный;
 *  • `tabIndex={-1}` на кнопке или `<div role="button">` вместо `<button>` — красный;
 *  • повесить `window.addEventListener('keydown', …)` — красный (статический предикат);
 *  • снять `flex-wrap` с `nav` — красный (предикат РАЗМЕТКИ, не замер раскладки — см. ниже);
 *  • посчитать диапазон от нуля (`page * limit`) — красный на «41–80 из 1057».
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useState } from 'react';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CabinetSampleTablePagination } from './CabinetSampleTablePagination';

afterEach(cleanup);

/** Живой буфер прибора 28.09: 1057 проб = 27 страниц по 40. */
const LIVE = { total: 1057, totalPages: 27, limit: 40 };

// `__dirname`, не `import.meta.url`: в jsdom адрес модуля не файловый, и `fileURLToPath` его не берёт.
const SOURCE = readFileSync(join(__dirname, 'CabinetSampleTablePagination.tsx'), 'utf8');
/**
 * Отрицательные проверки судят КОД, а не шапку: без этого шаблон `disabled={… || loading}` ловил
 * собственную прозу о прежнем дефекте — тот же класс ложного красного, что у зуба близнецов
 * переноса (#2497). Комментарии срезаются до сравнения; срез проверен самопроверкой ниже.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(?:^|[ \t]+)\/\/.*$/gmu, '');
const CODE = stripComments(SOURCE);

/** Слушатель клавиатуры на окне/документе — то, чего у нава быть не должно (ввод рядом не задевать). */
const GLOBAL_KEY_LISTENER = /(window|document)\.addEventListener\(\s*['"]key/u;
/** Ширина, заданная числом, или запрет переноса — разметка, которая на узком экране вылезет за край. */
const RIGID_WIDTH = /whitespace-nowrap|\bmin-w-\[|(?<![\w-])w-(?:\[|\d)/u;
/**
 * `disabled` на время загрузки — прежний дефект кабинета: запертая кнопка роняет фокус на body.
 * Просмотр назад `(?<![\w-])`: `aria-disabled={loading …}` — законная замена, шаблон без него ловил её.
 */
const DISABLED_BY_LOADING = /(?<![\w-])disabled=\{[^}]*loading/u;

/** Дом с состоянием страницы — как хук кабинета: `onPageChange` меняет `page`, загрузка едет отдельно. */
function Harness({ start, loading, onPageChange }: {
  readonly start: number;
  readonly loading?: boolean;
  readonly onPageChange?: (page: number) => void;
}) {
  const [page, setPage] = useState(start);
  return (
    <CabinetSampleTablePagination
      page={page}
      totalPages={LIVE.totalPages}
      total={LIVE.total}
      limit={LIVE.limit}
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

describe('органы листания кабинета: где я и сколько всего', () => {
  it('одна страница и пустой набор — органов нет: листать некуда', () => {
    for (const totalPages of [1, 0]) {
      const { container, unmount } = render(
        <CabinetSampleTablePagination
          page={1}
          totalPages={totalPages}
          total={totalPages * 12}
          limit={LIVE.limit}
          onPageChange={() => {}}
        />,
      );
      expect(container.querySelector('nav')).toBeNull();
      unmount();
    }
  });

  it('диапазон считается от единицы и обрезается по набору', () => {
    const { unmount } = render(<Harness start={2} />);
    expect(screen.getByText('41–80 из 1057')).toBeTruthy();
    expect(screen.getByText('2 / 27')).toBeTruthy();
    unmount();

    render(<Harness start={27} />);
    expect(screen.getByText('1041–1057 из 1057')).toBeTruthy();
  });

  it('на первой странице «Назад» заперт, на последней — «Вперёд»; кнопки просят соседнюю', () => {
    const onPageChange = vi.fn();
    const { unmount } = render(<Harness start={1} onPageChange={onPageChange} />);
    expect(button('Назад')).toHaveProperty('disabled', true);
    fireEvent.click(button('Вперёд'));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    unmount();

    render(<Harness start={27} onPageChange={onPageChange} />);
    expect(button('Вперёд')).toHaveProperty('disabled', true);
    fireEvent.click(button('Назад'));
    expect(onPageChange).toHaveBeenLastCalledWith(26);
  });
});

describe('доступность органов листания кабинета', () => {
  it('индикатор — живая область: смена страницы объявляется фразой, а не пустым aria-current', () => {
    const { container } = render(<Harness start={1} />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toContain('Страница 1 из 27, записи 1–40 из 1057');
    expect(screen.getByText('1 / 27')).toBeTruthy();

    press('Вперёд');
    expect(screen.getByRole('status').textContent).toContain('Страница 2 из 27, записи 41–80 из 1057');
    expect(container.querySelector('[aria-current]')).toBeNull();
  });

  it('фокус остаётся на нажатой кнопке, пока она активна', () => {
    render(<Harness start={5} />);
    const next = press('Вперёд');
    expect(screen.getByText('6 / 27')).toBeTruthy();
    expect(document.activeElement).toBe(next);
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
    // Прежний дефект кабинета: `disabled={… || loading}` на КАЖДОЙ смене страницы отдавал фокус body.
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
    expect(CODE).not.toMatch(DISABLED_BY_LOADING);
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
    const { container } = render(<Harness start={27} />);
    expect(container.querySelector('nav')?.className.split(/\s+/u)).toContain('flex-wrap');
    expect(CODE).not.toMatch(RIGID_WIDTH);
  });

  it('шаблоны отрицательных проверок ловят то, что обещают', () => {
    // Срез комментариев: проза уходит, код остаётся — иначе отрицательные проверки выше судят шапку.
    expect(stripComments('/** прежнее disabled={x || loading} */\nconst a = 1; // disabled={loading}\n')).toBe('\nconst a = 1;\n');
    expect(stripComments('disabled={page <= 1 || loading}')).toMatch(DISABLED_BY_LOADING);
    expect("window.addEventListener('keydown', onKey)").toMatch(GLOBAL_KEY_LISTENER);
    expect("window.addEventListener('resize', onResize)").not.toMatch(GLOBAL_KEY_LISTENER);
    expect('className="whitespace-nowrap"').toMatch(RIGID_WIDTH);
    expect('className="w-[320px]"').toMatch(RIGID_WIDTH);
    expect('className="w-48"').toMatch(RIGID_WIDTH);
    expect('className="min-w-0 flex-wrap"').not.toMatch(RIGID_WIDTH);
    expect('disabled={page <= 1 || loading}').toMatch(DISABLED_BY_LOADING);
    expect('disabled={lockedPrev}').not.toMatch(DISABLED_BY_LOADING);
    expect('aria-disabled={loading || undefined}').not.toMatch(DISABLED_BY_LOADING);
  });
});
