// @vitest-environment jsdom
/**
 * Зубы хоста окна (DoD 1, 2, 5, #2310) — предмет: `OverflowWindowHost.tsx` поверх НАСТОЯЩИХ
 * носителя удержания, контроллера, сервиса библиотеки с memory-бэкендом и ворот удаления.
 *
 * Порчи → красный: второй запрос квоты при построении окна (`getQuota`/`refresh` > 0 после
 * открытия) — красный; чистка без подтверждения (`removeSample` до confirm) — красный;
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
import { OverflowWindowHost, SAMPLE_LIBRARY_MODULE_ID } from './OverflowWindowHost';

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
  let refresh: ReturnType<typeof vi.spyOn>;
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
    refresh = vi.spyOn(service, 'refresh');
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

  it('окно строится из эпизода + статуса: ноль getQuota и ноль refresh при открытии', () => {
    mount();
    expect(screen.queryByTestId('overflow-window')).toBeNull();
    act(() => {
      expect(hold.activateFromServer(REFUSAL)).toBe('entered');
    });
    expect(screen.getByTestId('overflow-window').getAttribute('data-overflow-key')).toBe('ovf-host-1');
    expect(getQuota).toHaveBeenCalledTimes(0);
    expect(refresh).toHaveBeenCalledTimes(0);
    // Счёт буфера при остановке — из ЛОКАЛЬНОГО снимка: 2 пробы.
    expect(screen.getByTestId('overflow-buffer-at-stop').textContent).toMatch(/^2 проб/u);
    expect(screen.getByTestId('overflow-road-clean').textContent).toContain('уйдёт 2 проб');
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

  it('«Возобновить запись» — явное действие: release(human), окно остаётся для чтения', () => {
    mount();
    act(() => void hold.activateFromServer(REFUSAL));
    fireEvent.click(screen.getByTestId('overflow-resume'));
    expect(hold.isHeld()).toBe(false);
    expect(screen.getByTestId('overflow-released')).toBeTruthy();
    expect(getQuota).toHaveBeenCalledTimes(0);
  });
});
