/**
 * Зубы вкладки «График удалений» (#2632 g6c, Т5). Порчи: кнопка удаления/переключатель режима на
 * вкладке → красный; раздел открывается не-владельцу или грантом → красный; 503 как общая ошибка, а не
 * баннер → красный; пустой график без объяснения → красный; задания прогона не грузятся по клику → красный.
 *
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { canAccessSection } from '@/lib/roles';
import { PANEL_SECTIONS } from '@/lib/sections';

import { ColdArchiveScheduleTab, NOT_CONFIGURED_BANNER, lastRunModeText } from './ColdArchiveScheduleTab';
import { ColdArchiveScheduleTable, EMPTY_SCHEDULE_TEXT } from './ColdArchiveScheduleTable';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => vi.unstubAllGlobals());

const RUN_ID = '22222222-2222-4222-8222-222222222222';
const ROW = {
  batchId: 'bbbbbbbb-0000-4000-8000-000000000000',
  membraneId: 'mmmmmmmm-0000-4000-8000-000000000000',
  deviceId: 'dddddddd-0000-4000-8000-000000000000',
  expiresAt: '2026-11-21T00:00:00.000Z',
  frozenBytes: 1024,
};
const RUN = {
  runId: RUN_ID, trigger: 'cron', mode: 'dry_run', status: 'succeeded', startedAt: '2026-11-20T10:00:00.000Z',
  finishedAt: null, enabledSnapshot: true, dryRunSnapshot: true, jobsTotal: 1, jobsSucceeded: 0, jobsFailed: 0,
  jobsDeadLetter: 1, bytesFreed: 0, errorSummary: null,
} as const;
const DEAD_JOB = {
  jobId: 'j1', targetType: 'orphan_blob', batchId: null, deviceId: null, status: 'dead_letter', attempt: 5,
  nextAttemptAt: null, pathsTotal: 1, outcomes: { removed: 0, already_absent: 0, failed: 1 }, bytesFreed: 0, lastError: 'EACCES',
} as const;

function stubOffice(routes: Record<string, [number, unknown]>) {
  const fn = vi.fn(async (url: string) => {
    const [status, body] = routes[url.replace('/v1/panel/admin/cold-archive/', '')] ?? [500, {}];
    return { ok: status < 300, status, json: async () => body };
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

async function mount() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<ColdArchiveScheduleTab />));
  return { host, done: () => act(() => root.unmount()) };
}

describe('раздел — только владельцу', () => {
  it('cold-archive-schedule: minRole=owner, грантом (даже «*») не открывается', () => {
    const s = PANEL_SECTIONS.find((x) => x.id === 'cold-archive-schedule');
    expect(s?.minRole).toBe('owner');
    expect(s?.title).toBe('График удалений');
    expect(canAccessSection('operator', ['*'], 'owner', 'cold-archive-schedule')).toBe(false);
  });
});

describe('таблица графика', () => {
  it('строка: срок, объём текстом; пустой график — объяснение; кнопок нет', () => {
    const html = renderToStaticMarkup(<ColdArchiveScheduleTable rows={[ROW]} />);
    expect(html).toContain(`data-batch-id="${ROW.batchId}"`);
    expect(html).toContain('1.0 КБ');
    expect(html).not.toContain('<button');
    expect(renderToStaticMarkup(<ColdArchiveScheduleTable rows={[]} />)).toContain(EMPTY_SCHEDULE_TEXT);
  });
});

describe('вкладка', () => {
  it('загружает график и журнал; режим по последнему прогону; пульс «не подключён»; ни одной кнопки удаления', async () => {
    stubOffice({ 'purge-schedule': [200, [ROW]], 'purge-runs': [200, [RUN]] });
    const { host, done } = await mount();
    expect(host.textContent).toContain('Ближайшие удаления (1)');
    expect(host.textContent).toContain('Журнал прогонов (1)');
    expect(host.textContent).toContain('Режим по последнему прогону: пробный.');
    expect(host.textContent).toContain('не подключён');
    const labels = [...host.querySelectorAll('button')].map((b) => b.textContent ?? '');
    expect(labels).toEqual(['Задания']);
    expect(host.querySelector('input, select')).toBeNull();
    done();
  });

  it('клик «Задания» грузит прогон и показывает безнадёжные задания', async () => {
    const fn = stubOffice({
      'purge-schedule': [200, []],
      'purge-runs': [200, [RUN]],
      [`purge-runs/${RUN_ID}`]: [200, { ...RUN, jobs: [DEAD_JOB] }],
    });
    const { host, done } = await mount();
    await act(async () => host.querySelector('button')!.click());
    expect(fn).toHaveBeenCalledWith(`/v1/panel/admin/cold-archive/purge-runs/${RUN_ID}`, expect.anything());
    expect(host.querySelector('[data-dead-letter="1"]')).not.toBeNull();
    done();
  });

  it('503 media_not_configured — баннер, а не общая ошибка', async () => {
    stubOffice({ 'purge-schedule': [503, { code: 'media_not_configured' }], 'purge-runs': [200, []] });
    const { host, done } = await mount();
    expect(host.querySelector('[data-banner="media-not-configured"]')?.textContent).toBe(NOT_CONFIGURED_BANNER);
    done();
  });

  it('lastRunModeText: выключено / боевой / прогонов не было', () => {
    expect(lastRunModeText([{ ...RUN, enabledSnapshot: false }])).toContain('уборка выключена');
    expect(lastRunModeText([{ ...RUN, dryRunSnapshot: false }])).toContain('боевой');
    expect(lastRunModeText([])).toContain('прогонов ещё не было');
  });
});
