import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MembraneView } from '@/api/membrane';
import { NodesPage } from '@/pages/NodesPage';

/**
 * Зубы #2632 g8c (тезис Т3 шторма 08.10): сервер отказывает в удалении узла, пока у прибора есть
 * замороженный архив (409 `node_has_frozen_archive`, g8b). Кабинет обязан показать объяснение со
 * сроком и ссылку на архив прибора, а не строку ошибки. Удаление идёт настоящим `deleteNode`
 * через подменённый `fetch` — так проверен и разбор 409 клиентом, и реакция страницы.
 */
const api = vi.hoisted(() => ({
  fetchMembraneMe: vi.fn(),
  fetchArchiveBatches: vi.fn(),
}));
vi.mock('@/api/membrane', async (orig) => ({
  ...(await orig<typeof import('@/api/membrane')>()),
  fetchMembraneMe: api.fetchMembraneMe,
}));
vi.mock('@/api/downgradeArchive', async (orig) => ({
  ...(await orig<typeof import('@/api/downgradeArchive')>()),
  fetchArchiveBatches: api.fetchArchiveBatches,
}));
// Живая связь с узлами и журнал — свои ручки и сокеты, к зубу не относятся.
vi.mock('@/lib/useCabinetNodeRuntime', () => ({
  useCabinetNodeRuntime: () => ({
    connection: 'connected',
    states: {},
    captures: {},
    scenarioLists: {},
    isDeviceLive: () => false,
    captureDevice: vi.fn(),
    releaseDevice: vi.fn(),
    run: vi.fn(),
    stop: vi.fn(),
    selectScenario: vi.fn(),
  }),
}));
vi.mock('@/lib/useCabinetNodesJournalPreview', () => ({
  useCabinetNodesJournalPreview: () => ({ getPreview: () => ({ lastTrack: null, loading: false }) }),
}));
vi.mock('@/components/nodes/NodeLastTrackPreview', () => ({ NodeLastTrackPreview: () => null }));

const MEMBRANE = {
  membrane: {
    id: 'm1',
    tariff: { id: 'free-v1', name: 'Free', userStorageQuotaBytes: '1', bufferQuotaBytes: '1', datasetCatalogId: 'ds', maxActiveKeysPerNode: 1, maxNodesPerMembrane: 1 },
    createdAt: '2026-10-01T00:00:00.000Z',
    bufferPolicy: {},
  },
  nodes: [
    {
      id: 'n1',
      label: 'Крыша',
      createdAt: '2026-10-01T00:00:00.000Z',
      accessKeys: [],
      device: null,
    },
  ],
  node: null,
} as unknown as MembraneView;

function stubDeleteResponse(status: number, body: unknown) {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function clickDelete() {
  const button = await screen.findByRole('button', { name: 'Удалить' });
  await act(async () => {
    fireEvent.click(button);
  });
}

beforeEach(() => {
  api.fetchMembraneMe.mockResolvedValue(MEMBRANE);
  api.fetchArchiveBatches.mockResolvedValue([]);
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  api.fetchMembraneMe.mockReset();
  api.fetchArchiveBatches.mockReset();
});

describe('NodesPage — отказ удаления узла с замороженным архивом (#2632 g8c)', () => {
  it('409 node_has_frozen_archive → объяснение со сроком и ссылка на архив прибора, без строки ошибки', async () => {
    const fetchMock = stubDeleteResponse(409, {
      code: 'node_has_frozen_archive',
      message: 'У прибора есть замороженный архив',
      nodeId: 'n1',
      mediaDeviceId: 'dev-1',
      batchCount: 1,
      nearestExpiresAt: '2099-11-05T10:00:00.000Z',
    });
    render(<NodesPage onOpenJournal={() => {}} onOpenDeviceBoard={() => {}} />);
    await clickDelete();

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/v1/nodes/n1'), expect.objectContaining({ method: 'DELETE' }));
    const refusal = await screen.findByTestId('node-delete-refusal');
    expect(refusal.textContent).toContain('у прибора есть архив');
    expect(refusal.textContent).toContain('Удаление станет возможно после');
    expect(refusal.textContent).toContain('2099');

    // Ссылка ведёт на панель архива этого узла, и цель на странице есть (порча: битый якорь → красный).
    const link = screen.getByRole('link', { name: 'Открыть архив прибора' });
    expect(link.getAttribute('href')).toBe('#node-archive-n1');
    expect(document.getElementById('node-archive-n1')).not.toBeNull();

    // Отказ — не авария: общей строки ошибки нет; архив перечитан, чтобы панель показала партию.
    expect(screen.queryByText('У прибора есть замороженный архив')).toBeNull();
    expect(api.fetchArchiveBatches).toHaveBeenCalledTimes(2);
    // Узел на месте: страница не перечитывалась как после удаления.
    expect(api.fetchMembraneMe).toHaveBeenCalledTimes(1);
  });

  it('срок архива уже прошёл → «после очистки», а не дата из прошлого', async () => {
    stubDeleteResponse(409, { code: 'node_has_frozen_archive', nearestExpiresAt: '2020-01-01T00:00:00.000Z' });
    render(<NodesPage onOpenJournal={() => {}} onOpenDeviceBoard={() => {}} />);
    await clickDelete();

    const refusal = await screen.findByTestId('node-delete-refusal');
    expect(refusal.textContent).toContain('Срок архива истёк');
    expect(refusal.textContent).not.toContain('2020');
  });

  it('иной отказ (503 media недоступна) → прежняя строка ошибки, объяснения про архив нет', async () => {
    stubDeleteResponse(503, { genus: 'unreachable', message: 'Не удалось проверить архив прибора — узел не удалён, повторите позже' });
    render(<NodesPage onOpenJournal={() => {}} onOpenDeviceBoard={() => {}} />);
    await clickDelete();

    expect(await screen.findByText('Не удалось проверить архив прибора — узел не удалён, повторите позже')).toBeTruthy();
    expect(screen.queryByTestId('node-delete-refusal')).toBeNull();
  });

  it('409 с другим кодом (лимит) → строка ошибки, не объяснение про архив', async () => {
    stubDeleteResponse(409, { message: 'Node limit reached' });
    render(<NodesPage onOpenJournal={() => {}} onOpenDeviceBoard={() => {}} />);
    await clickDelete();

    expect(await screen.findByText('Node limit reached')).toBeTruthy();
    expect(screen.queryByTestId('node-delete-refusal')).toBeNull();
  });
});
