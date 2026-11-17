// @vitest-environment jsdom
/**
 * Зубы хоста окна (DoD 1, 2, 5, #2310) — предмет: `OverflowWindowHost.tsx` поверх НАСТОЯЩИХ
 * носителя удержания, контроллера, сервиса библиотеки с memory-бэкендом и ворот удаления.
 *
 * Порчи → красный: нет живого запроса квоты при открытии/повторном старте — красный;
 * чистка без подтверждения (`removeSample` до confirm) — красный;
 * закрытие окна сняло удержание — красный; после чистки нет сводки с числом — красный;
 * вывоз стёр пробы или снял удержание — красный.
 */
import { DeviceBoardModeProvider } from '@membrana/device-board';
import {
  BUFFER_COLLECTION_ID,
  MemoryStorageBackend,
  configureDefaultMediaLibraryService,
  resetDefaultMediaLibraryServiceForTests,
  type MediaLibraryService,
} from '@membrana/media-library-service';
import { BUFFER_OVERFLOW_REASONS } from '@membrana/plugin-contracts';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMembranaStore } from '@membrana/agenda';

import {
  installDeviceOverflowHoldWiring,
  resetDeviceOverflowHoldForTests,
  resetDeviceOverflowHoldWiringForTests,
  type DeviceOverflowHold,
  type OverflowRefusalSnapshot,
} from '@/lib/device-overflow-hold';
import { resetMediaLibraryHubForTests } from '@/lib/mediaLibraryHub';

import { resetOverflowWindowControllerForTests, type OverflowWindowController } from './controller';
import { OverflowHoldPlashka } from './OverflowHoldPlashka';
import { OverflowWindowHost, SAMPLE_LIBRARY_MODULE_ID } from './OverflowWindowHost';
import { OVERFLOW_FREED_TITLE, OVERFLOW_REASON_TEXT, OVERFLOW_WINDOW_TITLE } from './reasonTexts';
import { buildBoardOverflowHoldView, useOverflowHoldBoardView } from './useOverflowHoldBoardView';

const REFUSAL: OverflowRefusalSnapshot = {
  reason: BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL,
  overflowId: 'ovf-host-1',
  overflowAt: '2026-09-06T02:11:00.000Z',
  overflowPolicy: 'stop',
  buffer: { usedBytes: 100, limitBytes: 100 },
  userStorage: { usedBytes: 0, limitBytes: 100 },
};

async function putBufferSamples(backend: MemoryStorageBackend, n: number): Promise<void> {
  for (let i = 0; i < n; i += 1) {
    await backend.putSample(BUFFER_COLLECTION_ID, new Blob([new Uint8Array(64)]), {
      title: `probe-${i}`,
      class: 'test',
      label: 'unlabeled' as never,
      source: 'mic' as never,
      durationSec: 1,
      sampleRate: 48_000,
    });
  }
}

describe('OverflowWindowHost', () => {
  let hold: DeviceOverflowHold;
  let controller: OverflowWindowController;
  let backend: MemoryStorageBackend;
  let service: MediaLibraryService;
  let getQuota: ReturnType<typeof vi.spyOn>;
  let refreshQuota: ReturnType<typeof vi.spyOn>;
  let removeSample: ReturnType<typeof vi.spyOn>;
  const openExternal = vi.fn();
  const selectModule = vi.fn();

  beforeEach(async () => {
    resetMediaLibraryHubForTests();
    resetDeviceOverflowHoldWiringForTests();
    hold = resetDeviceOverflowHoldForTests();
    installDeviceOverflowHoldWiring(hold);
    controller = resetOverflowWindowControllerForTests(hold);
    backend = new MemoryStorageBackend({ limitBytes: 10_000, backend: 'server', serverReachable: true });
    service = configureDefaultMediaLibraryService(backend);
    await putBufferSamples(backend, 2);
    await service.refresh();
    getQuota = vi.spyOn(backend, 'getQuota');
    refreshQuota = vi.spyOn(service, 'refreshQuota');
    removeSample = vi.spyOn(backend, 'removeSample');
    openExternal.mockReset();
    selectModule.mockReset();
    // Стор agenda персистит в storage, которого в jsdom нет — подменяем действие на объекте
    // состояния, не через setState.
    vi.spyOn(useMembranaStore.getState(), 'selectModule').mockImplementation(selectModule);
  });

  afterEach(() => {
    cleanup();
    controller.dispose();
    resetDeviceOverflowHoldWiringForTests();
    resetDefaultMediaLibraryServiceForTests();
    vi.restoreAllMocks();
  });

  function mount() {
    return render(
      <DeviceBoardModeProvider>
        <OverflowWindowHost controller={controller} service={service} openExternal={openExternal} />
      </DeviceBoardModeProvider>,
    );
  }

  it('#2444: при открытии шкала живая, а снимок остановки остаётся рядом', async () => {
    getQuota.mockResolvedValue({
      usedBytes: 30,
      limitBytes: 300,
      bufferUsedBytes: 20,
      bufferLimitBytes: 200,
      backend: 'server',
      serverReachable: true,
    });
    mount();
    expect(screen.queryByTestId('overflow-window')).toBeNull();
    act(() => {
      expect(hold.activateFromServer(REFUSAL)).toBe('entered');
    });
    expect(screen.getByTestId('overflow-window').getAttribute('data-overflow-key')).toBe('ovf-host-1');
    await waitFor(() => expect(refreshQuota).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('overflow-axis-buffer').textContent).toContain('лимит 200 B'));
    expect(screen.getByTestId('overflow-axis-buffer-at-stop').textContent).toContain('лимит 100 B');
    // Счёт буфера при остановке — из ЛОКАЛЬНОГО снимка: 2 пробы.
    expect(screen.getByTestId('overflow-buffer-at-stop').textContent).toMatch(/^2 проб/u);
    expect(screen.getByTestId('overflow-road-clean').textContent).toContain('уйдёт 2 проб');
  });

  it('#2444: каждая отбитая попытка перечитывает квоту, но удержание сама не снимает', async () => {
    getQuota.mockResolvedValue({
      usedBytes: 30,
      limitBytes: 300,
      bufferUsedBytes: 20,
      bufferLimitBytes: 200,
      backend: 'server',
      serverReachable: true,
    });
    mount();
    act(() => void hold.activateFromServer(REFUSAL));
    await waitFor(() => expect(refreshQuota).toHaveBeenCalledTimes(1));

    getQuota.mockResolvedValue({
      usedBytes: 30,
      limitBytes: 600,
      bufferUsedBytes: 20,
      bufferLimitBytes: 400,
      backend: 'server',
      serverReachable: true,
    });
    act(() => {
      expect(hold.refuseStart({ source: 'board', what: 'запись сценария' })).toBe(true);
    });

    await waitFor(() => expect(refreshQuota).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId('overflow-axis-buffer').textContent).toContain('лимит 400 B'));
    expect(screen.getByTestId('overflow-axis-buffer-at-stop').textContent).toContain('лимит 100 B');
    expect(hold.isHeld()).toBe(true);
  });

  it('закрытие крестиком не снимает удержание; плашка/бейдж поднимают то же окно', () => {
    mount();
    act(() => void hold.activateFromServer(REFUSAL));
    fireEvent.click(screen.getByRole('button', { name: /Закрыть окно/u }));
    expect(screen.queryByTestId('overflow-window')).toBeNull();
    expect(hold.isHeld()).toBe(true);
    act(() => void controller.openForCurrentEpisode());
    expect(screen.getByTestId('overflow-window').getAttribute('data-overflow-key')).toBe('ovf-host-1');
  });

  it('«Почистить» — только через ворота удаления: до подтверждения ничего не удалено', async () => {
    mount();
    act(() => void hold.activateFromServer(REFUSAL));
    fireEvent.click(screen.getByTestId('overflow-road-clean'));
    // Удаление асинхронно: даём микрозадачам и таймерам пройти, прежде чем судить «не удалено».
    await act(async () => {
      await new Promise((r) => setTimeout(r, 25));
    });
    // Поверх — ворота удаления; окно оператора приостановлено (aria-hidden) и из role-запроса
    // честно выпадает, но в DOM остаётся тем же окном того же id.
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: /Почистить буфер: 2 проб/u })).toBeTruthy();
    expect(screen.getByTestId('overflow-window').getAttribute('aria-hidden')).toBe('true');
    expect(removeSample).not.toHaveBeenCalled();
    expect(hold.isHeld()).toBe(true);
    // Отмена — окно оператора снова видимо, буфер цел.
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByTestId('overflow-window').getAttribute('aria-hidden')).toBeNull();
    expect(removeSample).not.toHaveBeenCalled();
  });

  it('подтверждённая чистка: удалено 2, сводка с числом, удержание снято очисткой (не закрытием)', async () => {
    mount();
    act(() => void hold.activateFromServer(REFUSAL));
    fireEvent.click(screen.getByTestId('overflow-road-clean'));
    // Две записи разом — ворота требуют второго движения (галочка «понимаю»), это их правило.
    fireEvent.click(screen.getByRole('checkbox'));
    const confirm = screen.getByRole<HTMLButtonElement>('button', { name: /^Удалить 2$/u });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(screen.getByTestId('overflow-outcome')).toBeTruthy());
    expect(screen.getByTestId('overflow-outcome').textContent).toContain('Удалено из буфера: 2 проб');
    expect(screen.getByTestId('overflow-outcome').textContent).not.toContain('расхождение');
    expect(removeSample).toHaveBeenCalledTimes(2);
    expect(hold.isHeld()).toBe(false);
    expect(screen.getByTestId('overflow-released')).toBeTruthy();
    expect(screen.getByTestId('overflow-since-stop').textContent).toContain('удалено 2');
  });

  it('«Вывезти в набор» ведёт в библиотеку: окно закрыто, пробы целы, удержание остаётся', () => {
    mount();
    act(() => void hold.activateFromServer(REFUSAL));
    fireEvent.click(screen.getByTestId('overflow-road-export'));
    expect(selectModule).toHaveBeenCalledWith(SAMPLE_LIBRARY_MODULE_ID);
    expect(screen.queryByTestId('overflow-window')).toBeNull();
    expect(removeSample).not.toHaveBeenCalled();
    expect(hold.isHeld()).toBe(true);
  });

  it('«Сменить тариф» открывает кабинет (страница мембраны — раздел по умолчанию)', () => {
    mount();
    act(() => void hold.activateFromServer(REFUSAL));
    fireEvent.click(screen.getByTestId('overflow-road-tariff'));
    expect(openExternal).toHaveBeenCalledTimes(1);
    expect(String(openExternal.mock.calls[0]?.[0])).toMatch(/^https?:\/\//u);
  });

  it('«Возобновить запись» — явное действие: release(human), окно остаётся для чтения', async () => {
    mount();
    act(() => void hold.activateFromServer(REFUSAL));
    await waitFor(() => expect(getQuota).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('overflow-resume'));
    expect(hold.isHeld()).toBe(false);
    expect(screen.getByTestId('overflow-released')).toBeTruthy();
    expect(getQuota).toHaveBeenCalledTimes(1);
  });

  /**
   * #2538, porcha P1 (красная на стволе d364ef64): список коллекций не прочитан, а квота читается —
   * окно обязано показать НОВЫЙ предел сервера. На стволе хост звал полный refresh(), который
   * падал до квоты, и окно показывало старый предел как живой (512 МБ при сервере 2 ГБ).
   */
  it('#2538 P1: список проб не прочитан, а квота читается — окно показывает новый предел, без списков', async () => {
    getQuota.mockResolvedValue({
      usedBytes: 0,
      limitBytes: 400,
      bufferUsedBytes: 95,
      bufferLimitBytes: 400,
      backend: 'server',
      serverReachable: true,
    });
    const listCollections = vi.spyOn(backend, 'listCollections').mockRejectedValue(new Error('Media-server network error'));
    mount();
    act(() => {
      expect(hold.activateFromServer(REFUSAL)).toBe('entered');
    });
    await waitFor(() => expect(screen.getByTestId('overflow-axis-buffer').textContent).toContain('лимит 400 B'));
    expect(getQuota).toHaveBeenCalledTimes(1);
    expect(listCollections).not.toHaveBeenCalled();
    expect(screen.getByTestId('overflow-quota-read').getAttribute('data-quota-fresh')).toBe('true');
    expect(screen.getByTestId('overflow-quota-read').textContent).toContain('предел сервера прочитан');
  });

  it('#2538: сервер не ответил — числа прежние, строка «снимок от …», суждения «освобождено» нет', async () => {
    getQuota.mockResolvedValue({
      usedBytes: 0,
      limitBytes: 0,
      bufferUsedBytes: 0,
      bufferLimitBytes: 0,
      backend: 'server',
      serverReachable: false,
    });
    mount();
    act(() => void hold.activateFromServer(REFUSAL));
    await waitFor(() => expect(getQuota).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByTestId('overflow-quota-read').getAttribute('data-quota-fresh')).toBe('false'),
    );
    // Прежний предел снимка (10 000 B) остаётся на шкале, помеченный как снимок.
    expect(screen.getByTestId('overflow-axis-buffer').textContent).toContain('лимит 9.8 KB');
    expect(screen.getByTestId('overflow-quota-read').textContent).toContain('показан снимок от');
    expect(screen.getByTestId('overflow-held').getAttribute('data-overflow-standing')).toBe('unknown');
    expect(hold.isHeld()).toBe(true);
  });
});

/**
 * #2533 — входы вне окна (бейдж доски, плашка панели) читают живую ось из снимка сервиса
 * библиотеки, без второго запроса квоты. Зуб живёт здесь, рядом с хостом: та же сборка
 * настоящих носителя, контроллера и сервиса с memory-бэкендом.
 *
 * Порчи → красный: заголовок бейджа «полон» при живом буфере ниже порога стража — красный;
 * остаток бейджа из снимка остановки при живой оси — красный; плашка панели без тона — красный.
 */
describe('#2533: бейдж доски и плашка панели — место по живой оси', () => {
  let hold: DeviceOverflowHold;
  let controller: OverflowWindowController;
  let backend: MemoryStorageBackend;
  let service: MediaLibraryService;

  function BoardViewProbe() {
    const view = useOverflowHoldBoardView();
    if (view === null) return <span data-testid="board-view-none" />;
    return (
      <span data-testid="board-view" data-tone={view.tone} data-remaining={view.remainingText}>
        {view.headline}
      </span>
    );
  }

  beforeEach(async () => {
    resetMediaLibraryHubForTests();
    resetDeviceOverflowHoldWiringForTests();
    hold = resetDeviceOverflowHoldForTests();
    installDeviceOverflowHoldWiring(hold);
    controller = resetOverflowWindowControllerForTests(hold);
    backend = new MemoryStorageBackend({ limitBytes: 10_000, backend: 'server', serverReachable: true });
    service = configureDefaultMediaLibraryService(backend);
    await putBufferSamples(backend, 2);
    await service.refresh();
  });

  afterEach(() => {
    cleanup();
    controller.dispose();
    resetDeviceOverflowHoldWiringForTests();
    resetDefaultMediaLibraryServiceForTests();
    vi.restoreAllMocks();
  });

  it('строитель: живая ось ниже порога → слово об освобождённом месте, тон warning, остаток живой; выше → «полон», error', () => {
    const episode = { ...REFUSAL, source: 'server' as const, enteredAtMs: 1, owner: null, policy: 'stop' as const };
    const freed = buildBoardOverflowHoldView(
      episode,
      { usedBytes: 0, limitBytes: 100, backend: 'server', serverReachable: true, bufferUsedBytes: 0, bufferLimitBytes: 100 },
      () => {},
    );
    expect(freed.headline).toBe(OVERFLOW_FREED_TITLE);
    expect(freed.tone).toBe('warning');
    expect(freed.remainingText).toBe('свободно 100 B из 100 B');
    const full = buildBoardOverflowHoldView(
      episode,
      { usedBytes: 0, limitBytes: 100, backend: 'server', serverReachable: true, bufferUsedBytes: 96, bufferLimitBytes: 100 },
      () => {},
    );
    expect(full.headline).toBe(`${OVERFLOW_WINDOW_TITLE} · ${OVERFLOW_REASON_TEXT.device_buffer_full}`);
    expect(full.tone).toBe('error');
    expect(full.remainingText).toBe('свободно 4 B из 100 B');
    // Живой оси нет — остаток из снимка остановки, слово о факте прежнее.
    const blind = buildBoardOverflowHoldView(episode, null, () => {});
    expect(blind.headline).toBe(full.headline);
    expect(blind.remainingText).toBe('свободно 0 B из 100 B');
  });

  it('хук и плашка: удержание при живом буфере 1 % → жёлтая плашка со словом о месте; после перечитанной квоты 96 % → красная «полон»', async () => {
    const getQuota = vi.spyOn(backend, 'getQuota');
    render(
      <>
        <BoardViewProbe />
        <OverflowHoldPlashka />
      </>,
    );
    expect(screen.getByTestId('board-view-none')).toBeTruthy();
    expect(screen.queryByTestId('overflow-hold-plashka')).toBeNull();

    act(() => {
      expect(hold.activateFromServer(REFUSAL)).toBe('entered');
    });
    // Снимок сервиса: 2 пробы по 64 B из 10 000 → место есть; удержание при этом не снято.
    expect(screen.getByTestId('board-view').textContent).toBe(OVERFLOW_FREED_TITLE);
    expect(screen.getByTestId('board-view').getAttribute('data-tone')).toBe('warning');
    expect(screen.getByTestId('board-view').getAttribute('data-remaining')).toContain('из 9.8 KB');
    const plashka = screen.getByTestId('overflow-hold-plashka');
    expect(plashka.className).toContain('alert-warning');
    expect(plashka.textContent).toContain(OVERFLOW_FREED_TITLE);
    expect(hold.isHeld()).toBe(true);

    getQuota.mockResolvedValue({
      usedBytes: 0,
      limitBytes: 10_000,
      bufferUsedBytes: 9_600,
      bufferLimitBytes: 10_000,
      backend: 'server',
      serverReachable: true,
    });
    await act(async () => {
      await service.refresh();
    });
    await waitFor(() => expect(screen.getByTestId('board-view').getAttribute('data-tone')).toBe('error'));
    expect(screen.getByTestId('board-view').textContent).toBe(
      `${OVERFLOW_WINDOW_TITLE} · ${OVERFLOW_REASON_TEXT.device_buffer_full}`,
    );
    expect(screen.getByTestId('overflow-hold-plashka').className).toContain('alert-error');
  });
});
