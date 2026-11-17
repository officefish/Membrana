import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DowngradePreviewPlan, SelectTariffOutcome, TariffCatalogView } from '@/api/tariff';
import { TariffSelector } from '@/pages/MembranePage';

/**
 * Зубы P5 (#2587 b5): окно подтверждения понижения. На стволе файла окна нет — импорт красный.
 * Окно — только при избытке; уходит ровно показанный planDigest; успех — только после ответа;
 * plan_stale / freeze_failed → «Тариф не изменён», тариф на странице прежний; смена режима
 * пересчитывает числа; клавиатура: фокус на «Отмена», Escape, Tab по кругу.
 */
const api = vi.hoisted(() => ({
  fetchTariffCatalog: vi.fn(),
  previewTariffDowngrade: vi.fn(),
  selectTariff: vi.fn(),
  setDowngradePolicy: vi.fn(),
}));
vi.mock('@/api/tariff', async (orig) => ({ ...(await orig<typeof import('@/api/tariff')>()), ...api }));

const CATALOG: TariffCatalogView = {
  currentTariffId: 'sensor-v1',
  items: [
    { id: 'free-v1', name: 'Free', rank: 1, current: false, userStorageQuotaBytes: '1', bufferQuotaBytes: '1', maxNodesPerMembrane: 1, maxUserWorkspaces: 1 },
    { id: 'sensor-v1', name: 'Датчик', rank: 2, current: true, userStorageQuotaBytes: '2', bufferQuotaBytes: '2', maxNodesPerMembrane: 2, maxUserWorkspaces: 2 },
    { id: 'post-v1', name: 'Пункт', rank: 3, current: false, userStorageQuotaBytes: '3', bufferQuotaBytes: '3', maxNodesPerMembrane: 3, maxUserWorkspaces: 3 },
  ],
};

function plan(over: Partial<DowngradePreviewPlan> = {}, freezeCount = 7): DowngradePreviewPlan {
  return {
    ok: true,
    downgrade: true,
    fromTariffId: 'sensor-v1',
    toTariffId: 'free-v1',
    criterion: 'loudness-over-floor',
    retentionDays: 14,
    expiresAtEstimate: '2026-10-21T10:00:00.000Z',
    requiresConfirmation: true,
    nodes: [
      { nodeId: 'n1', keepCount: 40, keepBytes: 1, freezeCount, freezeBytes: 3 * 1024 * 1024, planDigest: 'digest-shown-n1', unmeasured: 0, excess: true },
      { nodeId: 'n2', keepCount: 5, keepBytes: 1, freezeCount: 0, freezeBytes: 0, planDigest: 'digest-n2-no-excess', unmeasured: 0, excess: false },
    ],
    ...over,
  };
}

const OK: SelectTariffOutcome = {
  ok: true,
  fromTariffId: 'sensor-v1',
  toTariffId: 'free-v1',
  contextSync: { updated: 1, failed: 0 },
  frozen: [{ nodeId: 'n1', batchId: 'b1', frozenCount: 7, frozenBytes: 3 * 1024 * 1024, expiresAt: '2026-10-21T10:00:00.000Z' }],
};

const onChanged = vi.fn();

async function openFlow(): Promise<void> {
  render(<TariffSelector currentTariffId="sensor-v1" onChanged={onChanged} nodeLabels={{ n1: 'Крыша' }} />);
  const free = (await screen.findByText('Free')).closest('li')!;
  fireEvent.click(free.querySelector('button')!);
}

function badgeOwner(): string | undefined {
  return screen.getByText('текущий').closest('p')?.textContent?.replace('текущий', '');
}

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  onChanged.mockReset();
  api.fetchTariffCatalog.mockResolvedValue(CATALOG);
});

afterEach(cleanup);

describe('DowngradeConfirmDialog — понижение с избытком (#2587 b5)', () => {
  it('без избытка — обычный путь: окна нет, смена без хешей', async () => {
    api.previewTariffDowngrade.mockResolvedValue(plan({ requiresConfirmation: false }));
    api.selectTariff.mockResolvedValue({ ...OK, frozen: undefined });
    await openFlow();
    await screen.findByRole('status');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(api.selectTariff).toHaveBeenCalledWith('free-v1');
  });

  it('повышение — без предпросмотра и без окна', async () => {
    api.selectTariff.mockResolvedValue({ ...OK, toTariffId: 'post-v1', frozen: undefined });
    render(<TariffSelector currentTariffId="sensor-v1" onChanged={onChanged} />);
    fireEvent.click((await screen.findByText('Пункт')).closest('li')!.querySelector('button')!);
    await screen.findByRole('status');
    expect(api.previewTariffDowngrade).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('избыток — окно с числами по узлу; смена не уходит до подтверждения', async () => {
    api.previewTariffDowngrade.mockResolvedValue(plan());
    await openFlow();
    const dialog = await screen.findByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('Крыша');
    expect(dialog.textContent).toContain('Останется 40 записей · уйдёт в архив 7 · ≈3.0 МБ');
    expect(dialog.textContent).toContain('архив хранится 14 дн.');
    expect(dialog.textContent).not.toContain('не измерено');
    expect(api.selectTariff).not.toHaveBeenCalled();
  });

  it('узел с неизмеримыми записями — строка «не измерено: N», без строки «без места в очереди»', async () => {
    const base = plan();
    api.previewTariffDowngrade.mockResolvedValue({
      ...base,
      nodes: [{ ...base.nodes[0]!, keepCount: 4400, freezeCount: 3960, unmeasured: 12 }, base.nodes[1]!],
    });
    await openFlow();
    const dialog = await screen.findByRole('dialog');
    const item = within(dialog).getByText('Крыша').closest('li')!;
    expect(item.textContent).toContain('не измерено: 12');
    expect(item.textContent).not.toContain('без места в очереди');
  });

  it('измерены все, без места в очереди часть (#2629) — строка «без места в очереди: N», «не измерено» нет', async () => {
    const base = plan();
    api.previewTariffDowngrade.mockResolvedValue({
      ...base,
      nodes: [{ ...base.nodes[0]!, keepCount: 4379, freezeCount: 3981, unmeasured: 0, unranked: 8000 }, base.nodes[1]!],
    });
    await openFlow();
    const item = within(await screen.findByRole('dialog')).getByText('Крыша').closest('li')!;
    expect(item.textContent).toContain('без места в очереди: 8000');
    expect(item.textContent).not.toContain('не измерено');
  });

  it('обе цифры больше нуля — обе строки; кабинет без поля unranked — строки нет', async () => {
    const base = plan();
    api.previewTariffDowngrade.mockResolvedValueOnce({
      ...base,
      nodes: [{ ...base.nodes[0]!, unmeasured: 3, unranked: 5 }, base.nodes[1]!],
    });
    await openFlow();
    const item = within(await screen.findByRole('dialog')).getByText('Крыша').closest('li')!;
    expect(item.textContent).toContain('без места в очереди: 5');
    expect(item.textContent).toContain('не измерено: 3');
    cleanup();
    const legacy = { ...base.nodes[0]! } as Partial<(typeof base.nodes)[number]>;
    delete legacy.unranked;
    api.previewTariffDowngrade.mockResolvedValueOnce({ ...base, nodes: [legacy as (typeof base.nodes)[number], base.nodes[1]!] });
    await openFlow();
    expect((await screen.findByRole('dialog')).textContent).not.toContain('без места в очереди');
  });

  it('шапка-итог под aria-describedby: сумма по узлам с избытком (узел без избытка не в счёт), срок и дата', async () => {
    const base = plan();
    api.previewTariffDowngrade.mockResolvedValue({
      ...base,
      nodes: [
        ...base.nodes,
        { nodeId: 'n3', keepCount: 10, keepBytes: 1, freezeCount: 5, freezeBytes: 1024 * 1024, planDigest: 'digest-n3', unmeasured: 0, excess: true },
      ],
    });
    await openFlow();
    const dialog = await screen.findByRole('dialog');
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const summary = document.getElementById(describedBy!);
    expect(summary).not.toBeNull();
    expect(dialog.contains(summary)).toBe(true);
    expect(summary!.textContent!.replace(/\s+/g, ' ')).toMatch(
      /^На 2 узл\. останется 50 · уйдёт в архив 12 записей · ≈4\.0 МБ\. Записи не удаляются сейчас: архив хранится 14 дн\., примерно до 21 октября 2026/,
    );
  });

  it('подтверждение несёт РОВНО показанный planDigest и только узлов с избытком', async () => {
    api.previewTariffDowngrade.mockResolvedValue(plan());
    api.selectTariff.mockResolvedValue(OK);
    await openFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Понизить тариф' }));
    await waitFor(() => expect(api.selectTariff).toHaveBeenCalledTimes(1));
    expect(api.selectTariff).toHaveBeenCalledWith('free-v1', { n1: 'digest-shown-n1' });
  });

  it('успех не показан до ответа «тариф сменён»; во время ожидания — ход и запертые кнопки (#2628)', async () => {
    let resolve!: (v: SelectTariffOutcome) => void;
    api.previewTariffDowngrade.mockResolvedValue(plan());
    api.selectTariff.mockReturnValue(new Promise<SelectTariffOutcome>((r) => (resolve = r)));
    await openFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Понизить тариф' }));
    await waitFor(() => expect(api.selectTariff).toHaveBeenCalled());
    expect(screen.queryByRole('status')).toBeNull();
    expect(onChanged).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-busy')).toBe('true');
    expect(dialog.textContent).toContain('Переносим лишние записи в архив и меняем тариф… это может занять до минуты');
    expect(within(dialog).getByRole('button', { name: 'Отмена' })).toHaveProperty('disabled', true);
    expect(within(dialog).getByRole('button', { name: 'Переходим…' })).toHaveProperty('disabled', true);
    await act(async () => resolve(OK));
    // Итог — в самом окне, окно не исчезает молча: закрывает его человек.
    const status = await within(screen.getByRole('dialog')).findByRole('status');
    // Дата — toLocaleDateString: движок может дописать «г.», поэтому сверка до года.
    expect(status.textContent).toMatch(/^Тариф изменён на «Free»\. В архив ушло 7 записей \(≈3\.0 МБ\), хранится до 21 октября 2026/);
    expect(screen.getByRole('dialog').textContent).not.toContain('Переносим');
    expect(onChanged).toHaveBeenCalledTimes(1);
    const ok = screen.getByRole('button', { name: 'Готово' });
    expect(document.activeElement).toBe(ok);
    fireEvent.click(ok);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(
      /Тариф изменён на «Free»\. В архив ушло 7 записей \(≈3\.0 МБ\), хранится до 21 октября 2026.*Приборов обновлено: 1/,
    );
  });

  it('итог без frozenCount в ответе (кабинет до #2628) — число из показанного плана', async () => {
    api.previewTariffDowngrade.mockResolvedValue(plan());
    api.selectTariff.mockResolvedValue({
      ...OK,
      frozen: [{ nodeId: 'n1', batchId: 'b1', frozenBytes: 3 * 1024 * 1024, expiresAt: '2026-10-21T10:00:00.000Z' }],
    });
    await openFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Понизить тариф' }));
    expect((await screen.findByRole('status')).textContent).toContain('В архив ушло 7 записей');
  });

  it('ход при загрузке плана: строка видна, кнопки «Перейти» заперты, пока предпросмотр не пришёл (#2628)', async () => {
    let resolve!: (v: DowngradePreviewPlan) => void;
    api.previewTariffDowngrade.mockReturnValue(new Promise<DowngradePreviewPlan>((r) => (resolve = r)));
    await openFlow();
    await waitFor(() => expect(api.previewTariffDowngrade).toHaveBeenCalled());
    expect(screen.getByText('Готовим план… это может занять до минуты на больших буферах')).toBeTruthy();
    const post = screen.getByText('Пункт').closest('li')!.querySelector('button')!;
    expect(post.disabled).toBe(true);
    await act(async () => resolve(plan()));
    await screen.findByRole('dialog');
    expect(screen.queryByText('Готовим план… это может занять до минуты на больших буферах')).toBeNull();
  });

  it('ход при пересчёте плана в окне (смена режима) — строка в окне, кнопки заперты', async () => {
    let resolve!: (v: DowngradePreviewPlan) => void;
    api.previewTariffDowngrade
      .mockResolvedValueOnce(plan())
      .mockReturnValueOnce(new Promise<DowngradePreviewPlan>((r) => (resolve = r)));
    api.setDowngradePolicy.mockResolvedValue({ ok: true, policy: { criterion: 'drone-likeness', isDefault: false } });
    await openFlow();
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(dialog.querySelector('select')!, { target: { value: 'drone-likeness' } });
    await waitFor(() => expect(dialog.textContent).toContain('Готовим план…'));
    expect(within(dialog).getByRole('button', { name: 'Переходим…' })).toHaveProperty('disabled', true);
    await act(async () => resolve(plan({ criterion: 'drone-likeness' }, 11)));
    await waitFor(() => expect(screen.getByRole('dialog').textContent).not.toContain('Готовим план…'));
  });

  it.each([
    ['plan_stale', /Тариф не изменён: данные на узле изменились — посмотрите предпросмотр заново/],
    ['media_unavailable', /Тариф не изменён: сервер записей не ответил/],
  ])('freeze_failed/%s — «Тариф не изменён», тариф на странице прежний', async (reason, text) => {
    api.previewTariffDowngrade.mockResolvedValue(plan());
    api.selectTariff.mockResolvedValue({
      ok: false,
      reason: 'freeze_failed',
      frozen: [],
      failures: [{ nodeId: 'n1', reason, detail: 'x' }],
    });
    await openFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Понизить тариф' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(text);
    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).toBeNull();
    expect(badgeOwner()).toBe('Датчик');
    expect(screen.queryByRole('button', { name: 'Посмотреть заново' }) !== null).toBe(reason === 'plan_stale');
  });

  it('смена режима в окне сохраняет режим и пересчитывает числа', async () => {
    api.previewTariffDowngrade.mockResolvedValueOnce(plan()).mockResolvedValueOnce(plan({ criterion: 'drone-likeness' }, 11));
    api.setDowngradePolicy.mockResolvedValue({ ok: true, policy: { criterion: 'drone-likeness', isDefault: false } });
    await openFlow();
    const select = (await screen.findByRole('dialog')).querySelector('select')!;
    fireEvent.change(select, { target: { value: 'drone-likeness' } });
    await waitFor(() => expect(screen.getByRole('dialog').textContent).toContain('уйдёт в архив 11'));
    expect(api.setDowngradePolicy).toHaveBeenCalledWith('drone-likeness');
    expect(api.previewTariffDowngrade).toHaveBeenCalledTimes(2);
  });

  it('клавиатура: фокус на «Отмена», Tab по кругу, Escape закрывает без смены и возвращает фокус', async () => {
    api.previewTariffDowngrade.mockResolvedValue(plan());
    render(<TariffSelector currentTariffId="sensor-v1" onChanged={onChanged} />);
    const opener = (await screen.findByText('Free')).closest('li')!.querySelector('button')!;
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole('dialog');
    const cancel = screen.getByRole('button', { name: 'Отмена' });
    const confirm = screen.getByRole('button', { name: 'Понизить тариф' });
    expect(document.activeElement).toBe(cancel);
    confirm.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(dialog.querySelector('select'));
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirm);
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(api.selectTariff).not.toHaveBeenCalled();
  });
});
