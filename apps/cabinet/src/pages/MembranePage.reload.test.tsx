import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MembraneView } from '@/api/membrane';
import type { DowngradePreviewPlan, SelectTariffOutcome, TariffCatalogView } from '@/api/tariff';
import { MembranePage } from '@/pages/MembranePage';

/**
 * Зуб #2628: «после „Понизить тариф“ минуту ничего не происходит, затем окно закрывается без
 * сообщения». Корень — перечитка мембраны после смены: страница ставила спиннер ВМЕСТО себя и
 * размонтировала окно вместе с итогом. На стволе до #2628 итога после перечитки нет — красный.
 */
const api = vi.hoisted(() => ({
  fetchMembraneMe: vi.fn(),
  fetchTariffCatalog: vi.fn(),
  previewTariffDowngrade: vi.fn(),
  selectTariff: vi.fn(),
}));
vi.mock('@/api/membrane', async (orig) => ({ ...(await orig<typeof import('@/api/membrane')>()), fetchMembraneMe: api.fetchMembraneMe }));
vi.mock('@/api/tariff', async (orig) => ({
  ...(await orig<typeof import('@/api/tariff')>()),
  fetchTariffCatalog: api.fetchTariffCatalog,
  previewTariffDowngrade: api.previewTariffDowngrade,
  selectTariff: api.selectTariff,
}));
// Соседние карточки ходят в свои ручки — к зубу не относятся.
vi.mock('@/components/membrane/BufferOverflowPolicyCard', () => ({ BufferOverflowPolicyCard: () => null }));
vi.mock('@/components/membrane/DowngradeKeepCard', () => ({ DowngradeKeepCard: () => null }));

function membrane(tariffId: string, name: string): MembraneView {
  return {
    membrane: {
      id: 'm1',
      tariff: { id: tariffId, name, userStorageQuotaBytes: '1', bufferQuotaBytes: '1', datasetCatalogId: 'ds', maxActiveKeysPerNode: 1 },
      createdAt: '2026-10-01T00:00:00.000Z',
      bufferPolicy: {},
    },
    nodes: [{ id: 'n1', label: 'Крыша' }],
    node: null,
  } as unknown as MembraneView;
}

const CATALOG = (current: string): TariffCatalogView => ({
  currentTariffId: current,
  items: [
    { id: 'free-v1', name: 'Free', rank: 1, current: current === 'free-v1', userStorageQuotaBytes: '1', bufferQuotaBytes: '1', maxNodesPerMembrane: 1, maxUserWorkspaces: 1 },
    { id: 'sensor-v1', name: 'Датчик', rank: 2, current: current === 'sensor-v1', userStorageQuotaBytes: '2', bufferQuotaBytes: '2', maxNodesPerMembrane: 2, maxUserWorkspaces: 2 },
  ],
});

const PLAN: DowngradePreviewPlan = {
  ok: true,
  downgrade: true,
  fromTariffId: 'sensor-v1',
  toTariffId: 'free-v1',
  criterion: 'loudness-over-floor',
  retentionDays: 14,
  expiresAtEstimate: '2026-10-21T10:00:00.000Z',
  requiresConfirmation: true,
  nodes: [{ nodeId: 'n1', keepCount: 4379, keepBytes: 1, freezeCount: 3981, freezeBytes: 2 * 1024 ** 3, planDigest: 'd1', unmeasured: 0, excess: true }],
};

const OK: SelectTariffOutcome = {
  ok: true,
  fromTariffId: 'sensor-v1',
  toTariffId: 'free-v1',
  contextSync: { updated: 1, failed: 0 },
  frozen: [{ nodeId: 'n1', batchId: 'b1', frozenCount: 3981, frozenBytes: 2 * 1024 ** 3, expiresAt: '2026-10-21T10:00:00.000Z' }],
};

afterEach(cleanup);

describe('MembranePage — перечитка после понижения не снимает окно с итогом (#2628)', () => {
  it('после смены страница перечитана, а окно с итогом на месте до «Готово»', async () => {
    api.fetchMembraneMe.mockResolvedValueOnce(membrane('sensor-v1', 'Датчик')).mockResolvedValue(membrane('free-v1', 'Free'));
    api.fetchTariffCatalog.mockImplementation(async () => CATALOG(api.fetchMembraneMe.mock.calls.length > 1 ? 'free-v1' : 'sensor-v1'));
    api.previewTariffDowngrade.mockResolvedValue(PLAN);
    api.selectTariff.mockResolvedValue(OK);

    render(<MembranePage />);
    fireEvent.click((await screen.findByText('Free')).closest('li')!.querySelector('button')!);
    fireEvent.click(await screen.findByRole('button', { name: 'Понизить тариф' }));

    const status = await within(await screen.findByRole('dialog')).findByRole('status');
    // Перечитка мембраны прошла (второй вызов) — и окно с итогом пережило её.
    await act(async () => {
      await Promise.resolve();
    });
    expect(api.fetchMembraneMe).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('dialog').contains(status)).toBe(true);
    expect(status.textContent).toMatch(/Тариф изменён на «Free»\. В архив ушло 3981 записей \(≈2\.0 ГБ\), хранится до 21 октября 2026/);

    fireEvent.click(screen.getByRole('button', { name: 'Готово' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('status').textContent).toContain('В архив ушло 3981 записей');
  });
});
