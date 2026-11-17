import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ArchiveBatchItem, ArchiveRestoreOutcome } from '@/api/downgradeArchive';

import { NodeDowngradeArchivePanel, useDowngradeArchive } from './NodeDowngradeArchivePanel';

/**
 * Зубы панели архива узла (#2619). На стволе файла панели нет — импорт красный.
 * Партии с датой удаления; кнопка только у `frozen`; успех — только после ответа; отказ — текстом
 * причины, без перечитывания; узел без ответа сервера — пометка, не падение.
 */
const api = vi.hoisted(() => ({ restoreArchiveBatch: vi.fn(), fetchArchiveBatches: vi.fn() }));
vi.mock('@/api/downgradeArchive', () => api);

const FROZEN: ArchiveBatchItem = {
  batchId: 'b-1',
  state: 'frozen',
  frozenAt: '2026-10-07T10:00:00.000Z',
  expiresAt: '2026-10-21T10:00:00.000Z',
  frozenBytes: 3 * 1024 * 1024,
  sampleCount: 7,
};

const onRestored = vi.fn();

function renderPanel(batches: ArchiveBatchItem[] = [FROZEN]) {
  return render(<NodeDowngradeArchivePanel view={{ nodeId: 'n1', batches }} onRestored={onRestored} />);
}

function ArchiveHost() {
  const archive = useDowngradeArchive();
  return (
    <NodeDowngradeArchivePanel
      view={archive.nodes.find((node) => node.nodeId === 'n1')}
      loadError={archive.error}
      onRetryLoad={archive.reload}
      onRestored={onRestored}
    />
  );
}

beforeEach(() => {
  api.restoreArchiveBatch.mockReset();
  api.fetchArchiveBatches.mockReset();
  onRestored.mockReset();
});

afterEach(cleanup);

describe('NodeDowngradeArchivePanel (#2619)', () => {
  it('партия в архиве — число записей, объём и дата удаления; кнопка с говорящим именем', () => {
    renderPanel();
    const region = screen.getByRole('region', { name: 'Архив после понижения тарифа' });
    expect(region.textContent).toContain('7 записей · ≈3.0 МБ');
    expect(region.textContent).toContain('удалится 21 октября 2026');
    expect(screen.getByRole('button', { name: /^Вернуть из архива записи от 7 октября 2026/ })).toBeTruthy();
  });

  it('нет партий в архиве (только возвращённые/удалённые) — панели нет', () => {
    const { container } = renderPanel([{ ...FROZEN, state: 'restored' }, { ...FROZEN, batchId: 'b-2', state: 'deleted' }]);
    expect(container.innerHTML).toBe('');
  });

  it('успех не показан до ответа; после ответа — сообщение, фокус на нём, перечитывание архива', async () => {
    let resolve!: (v: ArchiveRestoreOutcome) => void;
    api.restoreArchiveBatch.mockReturnValue(new Promise<ArchiveRestoreOutcome>((r) => (resolve = r)));
    renderPanel();
    fireEvent.click(screen.getByRole('button'));
    expect(api.restoreArchiveBatch).toHaveBeenCalledWith('b-1');
    expect(screen.queryByRole('status')).toBeNull();
    expect(onRestored).not.toHaveBeenCalled();
    expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true');
    await act(async () => resolve({ ok: true, nodeId: 'n1', batch: { ...FROZEN, state: 'restored' }, restored: 7 }));
    const status = await screen.findByRole('status');
    expect(status.textContent).toBe('Вернули в буфер записей: 7');
    expect(document.activeElement).toBe(status);
    expect(onRestored).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['insufficient_quota', 'Не возвращено: Не помещается в буфер текущего тарифа — освободите место или повысьте тариф'],
    ['archive_expired', 'Не возвращено: Срок хранения истёк — эти записи больше не вернуть'],
    ['media_unavailable', 'Не возвращено: Сервер записей не ответил — попробуйте позже'],
    ['new_reason', 'Не возвращено: Неизвестная причина отказа: new_reason'],
  ])('отказ %s — текст причины, архив не перечитан, партия на месте', async (reason, text) => {
    api.restoreArchiveBatch.mockResolvedValue({ ok: false, reason, detail: 'x' });
    renderPanel();
    fireEvent.click(screen.getByRole('button'));
    expect((await screen.findByRole('alert')).textContent).toBe(text);
    expect(onRestored).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: /Вернуть из архива/ }).hasAttribute('disabled')).toBe(false));
  });

  it('сервер записей не ответил по узлу — пометка, без кнопок', () => {
    render(<NodeDowngradeArchivePanel view={{ nodeId: 'n1', unavailable: 'down' }} onRestored={onRestored} />);
    expect(screen.getByRole('status').textContent).toContain('Архив узла сейчас недоступен');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('сбой загрузки архива виден; повтор после успеха показывает партии', async () => {
    api.fetchArchiveBatches
      .mockRejectedValueOnce(new Error('media down'))
      .mockResolvedValueOnce([{ nodeId: 'n1', batches: [FROZEN] }]);

    render(<ArchiveHost />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Не удалось загрузить архив');
    expect(alert.textContent).toContain('media down');
    expect(document.activeElement).toBe(alert);

    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText(/7 записей · ≈3.0 МБ/u)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(api.fetchArchiveBatches).toHaveBeenCalledTimes(2);
  });
});
