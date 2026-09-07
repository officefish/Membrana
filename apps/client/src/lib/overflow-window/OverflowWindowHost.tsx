import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';

import { useMembranaStore } from '@membrana/agenda';
import { useDeviceBoardMode } from '@membrana/device-board';
import {
  BUFFER_COLLECTION_ID,
  getDefaultMediaLibraryService,
  type MediaLibraryService,
  type MediaSample,
} from '@membrana/media-library-service';

import { DeletionConfirmDialog } from '@/components/DeletionConfirmDialog';
import { requestClearMediaLibraryBuffer } from '@/lib/mediaLibraryHubBridge';
import { readPersistedPairedCredentials } from '@/lib/resolveMediaLibraryBackend';

import { resolveCabinetMembraneUrl } from './cabinetMembraneUrl';
import { getOverflowWindowController, type OverflowWindowController } from './controller';
import { deltaSinceStop, readBufferLedger, settleClean, type BufferLedgerSnapshot } from './ledger';
import { OverflowWindow } from './OverflowWindow';
import { formatBytes } from './reasonTexts';
import { buildOverflowWindowViewModel, type TariffTransitionsKnowledge } from './viewModel';

export const SAMPLE_LIBRARY_MODULE_ID = 'sample-library';

/**
 * Откуда прибору знать о переходах тарифа: каталог `GET /v1/tariffs` кабинета требует
 * пользовательский Bearer-токен, у прибора есть только узловые учётные данные — источника
 * НЕТ. Честный ответ — `'unknown'`: кнопка ведёт в кабинет на мембрану, где витрина и покажет,
 * есть ли переходы (при факте #2297 — «переходить некуда»). Не выдумываем список.
 */
export const TARIFF_TRANSITIONS_KNOWLEDGE: TariffTransitionsKnowledge = 'unknown';

export interface OverflowWindowHostProps {
  readonly controller?: OverflowWindowController;
  readonly service?: MediaLibraryService;
  /** Тесты/иные оболочки: открыть страницу кабинета. По умолчанию — новая вкладка. */
  readonly openExternal?: (url: string) => void;
}

function defaultOpenExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Хост окна оператора (4/4, #2310) — единственное место, где окно встречает приложение:
 * снимок библиотеки (ЛОКАЛЬНЫЙ — квота повторно не запрашивается, каталог не перечитывается),
 * подтверждение чистки через общие ворота удаления (#2218), переход в библиотеку и в
 * кабинет. Монтируется один раз в `App`; плашка панели записи и бейдж доски — только входы.
 */
export function OverflowWindowHost({
  controller = getOverflowWindowController(),
  service = getDefaultMediaLibraryService(),
  openExternal = defaultOpenExternal,
}: OverflowWindowHostProps): ReactNode {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const subscribeLibrary = useCallback((onChange: () => void) => service.subscribe(onChange), [service]);
  const getLibrarySnapshot = useCallback(() => service.getSnapshot(), [service]);
  const library = useSyncExternalStore(subscribeLibrary, getLibrarySnapshot, getLibrarySnapshot);

  const { isBoardMode, exitBoardMode } = useDeviceBoardMode();
  const selectModule = useMembranaStore((s) => s.selectModule);

  const ledgerNow = useMemo(() => readBufferLedger(library), [library]);

  // База счёта — снимок буфера при первом показе окна по этому ключу; дальше только дельта.
  const baseRef = useRef<{ key: string; ledger: BufferLedgerSnapshot } | null>(null);
  if (state.windowKey !== null && baseRef.current?.key !== state.windowKey) {
    baseRef.current = { key: state.windowKey, ledger: ledgerNow };
  }
  if (state.windowKey === null) {
    baseRef.current = null;
  }
  const base = baseRef.current?.ledger ?? null;

  const [pendingClean, setPendingClean] = useState<{
    readonly samples: readonly MediaSample[];
    readonly promise: { samples: number; bytes: number };
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const pairedDeviceId = useMemo(() => readPersistedPairedCredentials()?.deviceId, []);

  // Окно ушло — вложенное подтверждение не должно пережить его.
  useEffect(() => {
    if (!state.open) setPendingClean(null);
  }, [state.open]);

  const onClose = useCallback(() => controller.close(), [controller]);

  const onExportToCollection = useCallback(() => {
    // Дорога 1: существующий вывоз библиотеки (#2226) — перенос проб из буфера в набор.
    // Окно закрывается, удержание остаётся: снимать его — явное действие после вывоза.
    controller.close();
    if (isBoardMode) exitBoardMode();
    selectModule(SAMPLE_LIBRARY_MODULE_ID);
  }, [controller, exitBoardMode, isBoardMode, selectModule]);

  const onCleanRequest = useCallback(() => {
    const samples = library.samplesByCollection[BUFFER_COLLECTION_ID] ?? [];
    setPendingClean({
      samples,
      promise: { samples: ledgerNow.bufferSamples, bytes: ledgerNow.bufferBytes },
    });
  }, [library.samplesByCollection, ledgerNow.bufferBytes, ledgerNow.bufferSamples]);

  const onConfirmClean = useCallback(async () => {
    if (pendingClean === null) return;
    const before = readBufferLedger(service.getSnapshot());
    setBusy(true);
    try {
      await requestClearMediaLibraryBuffer();
      const after = readBufferLedger(service.getSnapshot());
      controller.setOutcome(settleClean(before, after, pendingClean.promise));
    } finally {
      setBusy(false);
      setPendingClean(null);
    }
  }, [controller, pendingClean, service]);

  const onChangeTariff = useCallback(() => {
    openExternal(resolveCabinetMembraneUrl());
  }, [openExternal]);

  const onResumeByHuman = useCallback(() => controller.releaseByHuman(), [controller]);

  if (!state.open || state.episode === null) return null;

  const vm = buildOverflowWindowViewModel({
    episode: state.episode,
    held: state.held,
    // Состояние узла (`runtime.state`) счётчика «записано до остановки» не несёт — честное
    // «н/д»; ниже, отдельной строкой, окно показывает счёт буфера при остановке (снимок).
    recordedBeforeStop: null,
    tariffTransitions: TARIFF_TRANSITIONS_KNOWLEDGE,
  });
  const sinceStop = base === null ? null : deltaSinceStop(base, ledgerNow);
  const cleanPromise = { samples: ledgerNow.bufferSamples, bytes: ledgerNow.bufferBytes };

  return (
    <>
      <OverflowWindow
        open={state.open}
        vm={vm}
        refusedAttempt={state.refusedAttempt}
        bufferAtStop={base}
        sinceStop={sinceStop}
        outcome={state.outcome}
        cleanPromise={cleanPromise}
        busy={busy}
        suspended={pendingClean !== null}
        onClose={onClose}
        onExportToCollection={onExportToCollection}
        onCleanRequest={onCleanRequest}
        onChangeTariff={onChangeTariff}
        onResumeByHuman={onResumeByHuman}
      />
      {pendingClean !== null ? (
        // Окно оператора лежит на z-70 (над доской z-50); ворота удаления рисуют себя на z-50 —
        // обёртка со своим контекстом наложения поднимает их над окном.
        <div className="relative z-[80]">
          <DeletionConfirmDialog
            open
            title={`Почистить буфер: ${pendingClean.promise.samples} проб · ${formatBytes(pendingClean.promise.bytes)}`}
            samples={pendingClean.samples}
            collections={library.collections}
            declaredTotal={pendingClean.promise.samples}
            deviceId={pairedDeviceId}
            busy={busy}
            onCancel={() => setPendingClean(null)}
            onConfirm={() => void onConfirmClean()}
          />
        </div>
      ) : null}
    </>
  );
}
