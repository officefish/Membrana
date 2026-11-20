/**
 * Зубы виджетов журнала уборщика (#2632 g6b). Порчи: пустой журнал как «всё чисто» → красный;
 * stale без role=alert и слова «Тревога» → красный; null-пульс как «работает» → красный;
 * dead_letter без отдельной строки → красный; кнопка удаления в любом виджете → красный;
 * фокус не на заголовке деталей → красный.
 *
 * @vitest-environment jsdom
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { PurgeJobSummary, PurgeRunDetail, PurgeRunSummary } from '@/lib/coldArchiveApi';

import { ColdArchivePulseBadge } from './ColdArchivePulseBadge';
import { ColdArchiveRunDetails } from './ColdArchiveRunDetails';
import { ColdArchiveRunsJournal, EMPTY_JOURNAL_TEXT } from './ColdArchiveRunsJournal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const RUN: PurgeRunSummary = {
  runId: '22222222-2222-4222-8222-222222222222',
  trigger: 'cron',
  mode: 'live',
  status: 'succeeded',
  startedAt: '2026-11-20T10:00:00.000Z',
  finishedAt: '2026-11-20T10:01:00.000Z',
  enabledSnapshot: true,
  dryRunSnapshot: false,
  jobsTotal: 3,
  jobsSucceeded: 1,
  jobsFailed: 1,
  jobsDeadLetter: 1,
  bytesFreed: 2048,
  errorSummary: null,
};
const job = (status: PurgeJobSummary['status'], jobId: string): PurgeJobSummary => ({
  jobId,
  targetType: 'orphan_blob',
  batchId: null,
  deviceId: null,
  status,
  attempt: status === 'dead_letter' ? 5 : 1,
  nextAttemptAt: null,
  pathsTotal: 2,
  outcomes: { removed: 0, already_absent: 0, failed: 2 },
  bytesFreed: 0,
  lastError: status === 'dead_letter' ? 'EACCES' : null,
});
const DETAIL: PurgeRunDetail = { ...RUN, jobs: [job('succeeded', 'j1'), job('dead_letter', 'j2')] };
const noop = () => undefined;
const noDeleteButton = (html: string) => expect(html).not.toMatch(/<button[^>]*>[^<]*(Удал|удал)/);

describe('значок пульса', () => {
  it('stale — role=alert, «Тревога», режим текстом', () => {
    const html = renderToStaticMarkup(
      <ColdArchivePulseBadge pulse={{ mode: 'dry_run', pulse: 'stale', lastFinishedRunAt: null, lastSucceededRunAt: null }} />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Тревога');
    expect(html).toContain('пробный режим');
  });

  it('ok — role=status, aria-live; disabled — «уборка выключена»; null — «не подключён», не «работает»', () => {
    const ok = renderToStaticMarkup(
      <ColdArchivePulseBadge pulse={{ mode: 'live', pulse: 'ok', lastFinishedRunAt: null, lastSucceededRunAt: RUN.finishedAt }} />,
    );
    expect(ok).toContain('role="status"');
    expect(ok).toContain('aria-live="polite"');
    expect(ok).toContain('Уборщик работает');
    const off = renderToStaticMarkup(
      <ColdArchivePulseBadge pulse={{ mode: 'disabled', pulse: 'disabled', lastFinishedRunAt: null, lastSucceededRunAt: null }} />,
    );
    expect(off).toContain('уборка выключена');
    expect(off).not.toContain('Тревога');
    const unknown = renderToStaticMarkup(<ColdArchivePulseBadge pulse={null} />);
    expect(unknown).toContain('не подключён');
    expect(unknown).not.toContain('работает');
  });
});

describe('журнал прогонов', () => {
  it('пустой — «прогонов ещё не было», не «всё чисто»', () => {
    const html = renderToStaticMarkup(<ColdArchiveRunsJournal runs={[]} selectedRunId={null} onSelect={noop} />);
    expect(html).toContain(EMPTY_JOURNAL_TEXT);
    expect(html).not.toContain('<table');
  });

  it('строка: режим, исход, счётчики текстом, aria-expanded у выбранного; без кнопок удаления', () => {
    const html = renderToStaticMarkup(<ColdArchiveRunsJournal runs={[RUN]} selectedRunId={RUN.runId} onSelect={noop} />);
    expect(html).toContain('боевой');
    expect(html).toContain('успешно');
    expect(html).toMatch(/3 \/ 1 \/ 1 \/ (<!-- -->)?\s*<span class="font-semibold text-error">1<\/span>/);
    expect(html).toContain('2.0 КБ');
    expect(html).toContain('aria-expanded="true"');
    noDeleteButton(html);
  });

  it('клик «Задания» отдаёт runId', () => {
    const onSelect = vi.fn();
    const host = document.createElement('div');
    const root = createRoot(host);
    act(() => root.render(<ColdArchiveRunsJournal runs={[RUN]} selectedRunId={null} onSelect={onSelect} />));
    act(() => host.querySelector('button')!.click());
    expect(onSelect).toHaveBeenCalledWith(RUN.runId);
    act(() => root.unmount());
  });
});

describe('детали прогона (Т2)', () => {
  it('dead_letter — отдельная строка role=alert со счётом и пометка в таблице; без кнопок', () => {
    const html = renderToStaticMarkup(<ColdArchiveRunDetails run={DETAIL} />);
    expect(html).toContain('data-dead-letter="1"');
    expect(html).toContain('Безнадёжных заданий: 1.');
    expect(html).toContain('data-job-status="dead_letter"');
    expect(html).toContain('EACCES');
    expect(html).not.toContain('<button');
    const clean = renderToStaticMarkup(<ColdArchiveRunDetails run={{ ...DETAIL, jobs: [job('succeeded', 'j1')] }} />);
    expect(clean).not.toContain('role="alert"');
  });

  it('при открытии фокус на заголовке деталей', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(<ColdArchiveRunDetails run={DETAIL} />));
    expect(document.activeElement?.id).toBe('cold-archive-run-details-title');
    act(() => root.unmount());
    host.remove();
  });
});
