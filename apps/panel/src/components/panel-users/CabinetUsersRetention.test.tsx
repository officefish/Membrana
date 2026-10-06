/**
 * Зубы блока «Пользователи кабинета» (#2588 b4, порча P18–P20 плана
 * `docs/sprint/cut/cold-archive-retention-2588.json`).
 *
 * Статика — `renderToStaticMarkup` (образец `apps/cabinet/.../NodeOverflowHoldLine.test.tsx`):
 * строки из ответа, список ровно пяти значений, пометка «по умолчанию», ошибка в строке,
 * подтверждение в строке. Поведение — jsdom + `react-dom/client` + `act` (без новых зависимостей):
 * загрузка, PUT при подтверждении с `{days}` и верным membraneId, строка из ответа, откат при
 * ошибке, баннер на 503 `cabinet_not_configured`, «показать ещё» по nextCursor.
 *
 * Красные на стволе 978b94fd: компонента нет — import падает; `PanelUsersBoard` ствола блока не
 * монтирует. Порчи после реализации: PUT без подтверждения → красный (fetch после select = 0);
 * тело PUT не `{days}` → красный; не откатывать при ошибке → красный; 503 как ошибка строки,
 * а не баннер → красный; шестое значение в списке → красный.
 *
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CabinetUserRow } from '@/lib/cabinetUsersApi';
import { CabinetUsersRetention, CabinetUsersTable, NOT_CONFIGURED_BANNER, RETENTION_HINT } from './CabinetUsersRetention';

const HERE = dirname(fileURLToPath(import.meta.url));

// React 18: без этого флага каждый act() печатает предупреждение «environment is not configured».
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const M1 = '11111111-1111-4111-8111-111111111111';
const M2 = '22222222-2222-4222-8222-222222222222';
const M3 = '33333333-3333-4333-8333-333333333333';
const ROWS: CabinetUserRow[] = [
  { membraneId: M1, userId: 'u-1', displayLabel: 'alice', tariffId: 'free', retentionDays: 14, isDefault: true, createdAt: '2026-10-01T10:00:00.000Z' },
  { membraneId: M2, userId: 'u-2', displayLabel: 'bob', tariffId: 'pro', retentionDays: 1, isDefault: false, createdAt: '2026-09-15T08:00:00.000Z' },
];

const noop = () => undefined;

describe('CabinetUsersTable — статика (P18/P19/P20)', () => {
  it('строки из ответа: ярлык, тариф, срок, «по умолчанию» только у isDefault, дата', () => {
    const html = renderToStaticMarkup(
      <CabinetUsersTable rows={ROWS} pending={null} busyMembraneId={null} rowErrors={{}} disabled={false} onPick={noop} onConfirm={noop} onCancel={noop} />,
    );
    expect(html).toContain('alice');
    expect(html).toContain('bob');
    expect(html).toContain('>free<');
    expect(html).toContain('>pro<');
    expect(html).toContain(`data-membrane-id="${M1}"`);
    expect(html).toContain(`data-membrane-id="${M2}"`);
    expect(html.match(/по умолчанию<\/span>/g)).toHaveLength(1); // только alice
    expect(html).toContain('01.10.2026');
    expect(html).not.toContain('passwordHash');
  });

  it('P19: выпадающий список ровно из пяти значений с подписями 14 — по умолчанию, 1 — для проверок', () => {
    const html = renderToStaticMarkup(
      <CabinetUsersTable rows={[ROWS[0]!]} pending={null} busyMembraneId={null} rowErrors={{}} disabled={false} onPick={noop} onConfirm={noop} onCancel={noop} />,
    );
    const options = [...html.matchAll(/<option value="(\d+)"[^>]*>([^<]*)<\/option>/g)].map((m) => [Number(m[1]), m[2]]);
    expect(options).toEqual([
      [1, '1 — для проверок'],
      [7, '7 дней'],
      [14, '14 — по умолчанию'],
      [30, '30 дней'],
      [90, '90 дней'],
    ]);
    // выбранное значение строки — 14 (SSR ставит selected на option)
    expect(html).toMatch(/<option value="14" selected=""/);
  });

  it('подтверждение в строке: текущий → новый, кнопки «Сменить»/«Отмена»; ошибка строки — role=alert', () => {
    const html = renderToStaticMarkup(
      <CabinetUsersTable
        rows={ROWS}
        pending={{ membraneId: M1, days: 7 }}
        busyMembraneId={null}
        rowErrors={{ [M2]: 'Кабинет не принял этот срок.' }}
        disabled={false}
        onPick={noop}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(html).toContain('Сменить 14 → 7 дн.?');
    expect(html).toContain('>Сменить</button>');
    expect(html).toContain('>Отмена</button>');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Кабинет не принял этот срок.');
    expect(html).toMatch(/<option value="7" selected=""/); // select показывает выбранное, пока ждём подтверждения
  });

  it('пустой кабинет → фраза без таблицы; disabled отключает все select', () => {
    expect(renderToStaticMarkup(<CabinetUsersTable rows={[]} pending={null} busyMembraneId={null} rowErrors={{}} disabled={false} onPick={noop} onConfirm={noop} onCancel={noop} />)).toContain(
      'В кабинете пока нет пользователей.',
    );
    const html = renderToStaticMarkup(<CabinetUsersTable rows={ROWS} pending={null} busyMembraneId={null} rowErrors={{}} disabled onPick={noop} onConfirm={noop} onCancel={noop} />);
    expect(html.match(/<select[^>]*disabled=""/g)).toHaveLength(2);
  });

  it('провод: PanelUsersBoard монтирует CabinetUsersRetention', () => {
    const board = readFileSync(join(HERE, 'PanelUsersBoard.tsx'), 'utf8');
    expect(board).toMatch(/import \{ CabinetUsersRetention \} from '\.\/CabinetUsersRetention'/);
    expect(board).toContain('<CabinetUsersRetention />');
  });
});

// ─── поведение в jsdom ──────────────────────────────────────────────────────────────

type FetchCall = { url: string; init: RequestInit | undefined };

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/** Подставной fetch: GET-страницы и ответы PUT заданы очередью; все вызовы записываются. */
function stubFetch(handler: (url: string, init?: RequestInit) => ReturnType<typeof jsonResponse>) {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return handler(url, init);
    }),
  );
  return calls;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root!.render(<CabinetUsersRetention />);
  });
  // эффект загрузки + ответ подставного fetch
  await act(async () => {
    await Promise.resolve();
  });
  return container;
}

afterEach(async () => {
  if (root) {
    await act(async () => root!.unmount());
    root = null;
  }
  container?.remove();
  container = null;
  vi.unstubAllGlobals();
});

function selectOf(el: HTMLElement, membraneId: string): HTMLSelectElement {
  return el.querySelector(`tr[data-membrane-id="${membraneId}"] select`) as HTMLSelectElement;
}

async function pick(select: HTMLSelectElement, value: number) {
  await act(async () => {
    // React слушает onChange через нативное событие change на select
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
    setter.call(select, String(value));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function click(el: HTMLElement, text: string) {
  const button = [...el.querySelectorAll('button')].find((b) => b.textContent === text);
  expect(button, `кнопка «${text}»`).toBeDefined();
  await act(async () => {
    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe('CabinetUsersRetention — поведение (jsdom)', () => {
  it('загрузка: GET страницы, строки в таблице, подсказка о сроке', async () => {
    const calls = stubFetch(() => jsonResponse(200, { items: ROWS, nextCursor: null }));
    const el = await mount();
    expect(calls.map((c) => c.url)).toEqual(['/v1/panel/admin/cabinet-users']);
    expect(el.querySelectorAll('tr[data-membrane-id]')).toHaveLength(2);
    expect(el.textContent).toContain(RETENTION_HINT);
    expect(el.textContent).toContain('Пользователи кабинета (2)');
    expect(selectOf(el, M1).value).toBe('14');
  });

  it('P18: выбор без подтверждения PUT не шлёт; «Сменить» → PUT {days} на верный membraneId; строка — из ответа', async () => {
    const calls = stubFetch((url, init) =>
      init?.method === 'PUT'
        ? jsonResponse(200, { membraneId: M1, retentionDays: 7, isDefault: false, updatedAt: 'x', updatedBy: 'panel:owner' })
        : jsonResponse(200, { items: ROWS, nextCursor: null }),
    );
    const el = await mount();
    await pick(selectOf(el, M1), 7);
    expect(calls.filter((c) => c.init?.method === 'PUT')).toHaveLength(0);
    expect(el.textContent).toContain('Сменить 14 → 7 дн.?');

    await click(el, 'Сменить');
    const puts = calls.filter((c) => c.init?.method === 'PUT');
    expect(puts).toHaveLength(1);
    expect(puts[0]!.url).toBe(`/v1/panel/admin/cabinet-users/${M1}/archive-retention`);
    expect(JSON.parse(String(puts[0]!.init!.body))).toEqual({ days: 7 });
    expect(selectOf(el, M1).value).toBe('7');
    // пометка «по умолчанию» (badge) снята — строка взята из ответа (isDefault:false); текст option «14 — по умолчанию» остаётся в списке
    expect(el.querySelector(`tr[data-membrane-id="${M1}"] .badge`)).toBeNull();
    expect(el.querySelector(`tr[data-membrane-id="${M2}"] .badge`)).toBeNull(); // bob и был не по умолчанию
    expect(el.textContent).not.toContain('Сменить 14 → 7');
    // соседняя строка не тронута
    expect(selectOf(el, M2).value).toBe('1');
  });

  it('«Отмена» возвращает select к текущему значению, PUT нет', async () => {
    const calls = stubFetch(() => jsonResponse(200, { items: ROWS, nextCursor: null }));
    const el = await mount();
    await pick(selectOf(el, M1), 90);
    await click(el, 'Отмена');
    expect(selectOf(el, M1).value).toBe('14');
    expect(calls.filter((c) => c.init?.method === 'PUT')).toHaveLength(0);
  });

  it('P18 откат: 400 кабинета → значение возвращается, ошибка в строке, баннера нет', async () => {
    stubFetch((_url, init) =>
      init?.method === 'PUT' ? jsonResponse(400, { code: 'invalid_retention_days', status: 400 }) : jsonResponse(200, { items: ROWS, nextCursor: null }),
    );
    const el = await mount();
    await pick(selectOf(el, M2), 30);
    await click(el, 'Сменить');
    expect(selectOf(el, M2).value).toBe('1');
    const row = el.querySelector(`tr[data-membrane-id="${M2}"]`)!;
    expect(row.querySelector('[role="alert"]')!.textContent).toBe('Кабинет не принял этот срок.');
    expect(el.querySelector('[data-banner="cabinet-not-configured"]')).toBeNull();
    // ошибка — только в своей строке
    expect(el.querySelector(`tr[data-membrane-id="${M1}"] [role="alert"]`)).toBeNull();
  });

  it('502 при смене → откат и фраза про кабинет; 404 → только владельцу', async () => {
    stubFetch((_url, init) => (init?.method === 'PUT' ? jsonResponse(502, { code: 'cabinet_unreachable' }) : jsonResponse(200, { items: ROWS, nextCursor: null })));
    const el = await mount();
    await pick(selectOf(el, M1), 1);
    await click(el, 'Сменить');
    expect(selectOf(el, M1).value).toBe('14');
    expect(el.querySelector(`tr[data-membrane-id="${M1}"] [role="alert"]`)!.textContent).toBe('Кабинет не отвечает — попробуйте позже.');
  });

  it('P20: 503 cabinet_not_configured на загрузке → баннер, таблицы и select нет', async () => {
    stubFetch(() => jsonResponse(503, { code: 'cabinet_not_configured', missing: ['CABINET_API_URL', 'CABINET_OFFICE_TOKEN'] }));
    const el = await mount();
    const banner = el.querySelector('[data-banner="cabinet-not-configured"]');
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toBe(NOT_CONFIGURED_BANNER);
    expect(el.textContent).not.toContain('CABINET_API_URL');
    expect(el.querySelectorAll('select')).toHaveLength(0);
    expect(el.querySelectorAll('table')).toHaveLength(0);
  });

  it('503 cabinet_not_configured при смене → список сменяется баннером, значение не применено', async () => {
    stubFetch((_url, init) =>
      init?.method === 'PUT' ? jsonResponse(503, { code: 'cabinet_not_configured', missing: ['CABINET_OFFICE_TOKEN'] }) : jsonResponse(200, { items: ROWS, nextCursor: null }),
    );
    const el = await mount();
    await pick(selectOf(el, M1), 7);
    await click(el, 'Сменить');
    expect(el.querySelector('[data-banner="cabinet-not-configured"]')).not.toBeNull();
    expect(el.querySelectorAll('select')).toHaveLength(0);
  });

  it('иная ошибка загрузки (502) → alert-error с фразой, без баннера «не настроена»', async () => {
    stubFetch(() => jsonResponse(502, { code: 'cabinet_unreachable' }));
    const el = await mount();
    expect(el.querySelector('[data-banner="cabinet-not-configured"]')).toBeNull();
    expect(el.querySelector('.alert-error')!.textContent).toBe('Кабинет не отвечает — попробуйте позже.');
  });

  it('пагинация: nextCursor → «Показать ещё» → GET с cursor, строки дописываются, кнопка исчезает', async () => {
    const third: CabinetUserRow = { membraneId: M3, userId: 'u-3', displayLabel: 'carol', tariffId: 'free', retentionDays: 14, isDefault: true, createdAt: '2026-10-02T10:00:00.000Z' };
    const calls = stubFetch((url) => (url.includes('cursor=') ? jsonResponse(200, { items: [third], nextCursor: null }) : jsonResponse(200, { items: ROWS, nextCursor: M2 })));
    const el = await mount();
    expect(el.textContent).toContain('Пользователи кабинета (2+)');
    await click(el, 'Показать ещё');
    expect(calls.map((c) => c.url)).toEqual(['/v1/panel/admin/cabinet-users', `/v1/panel/admin/cabinet-users?cursor=${M2}`]);
    expect(el.querySelectorAll('tr[data-membrane-id]')).toHaveLength(3);
    expect(el.textContent).toContain('carol');
    expect([...el.querySelectorAll('button')].some((b) => b.textContent === 'Показать ещё')).toBe(false);
    expect(el.textContent).toContain('Пользователи кабинета (3)');
  });
});
