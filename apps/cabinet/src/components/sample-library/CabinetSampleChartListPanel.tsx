/**
 * Панель отбора чарт-листа в КАБИНЕТНОЙ библиотеке — близнец Studio-панели (#2110).
 *
 * Слово владельца 24.08: библиотека в Studio и в кабинете — близнецы, функционал в оба. Общее
 * ядро (словари, перевод дат в поясе человека) — в `@membrana/media-library-service`; здесь
 * только заказ у сервера и показ, как и в Studio.
 *
 * ОТБОР СЧИТАЕТ СЕРВЕР. Панель заказывает прогон витрины `membrana.showcase.library-chart-list`
 * по ТЕКУЩЕЙ коллекции узла (какая выбрана в сайдбаре — по той и отбор: буфер так буфер, набор
 * так набор) тем же сервисом, которым кабинет читает библиотеку узла. Мер и порогов здесь нет.
 *
 * РАСКЛАДКА — ЖУРНАЛЬНЫЙ ОБРАЗЕЦ: виджет под основным блоком, настройки строкой сверху виджета.
 * Отказ отбора показывается СЛОВАМИ отказа, а не пустой таблицей: «в этот промежуток записей
 * нет» и «критерий не выбран» — разные события.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LIBRARY_CHART_LIST_CRITERIA,
  LIBRARY_CHART_LIST_VOLUMES,
  SELECT_ALL_SHOWN_LABEL,
  allShownPicked,
  bulkDeleteLabel,
  dateInputToIsoWindow,
  forgetPicks,
  pickedShownIds,
  toggleAllShown,
  togglePick,
  type LibraryChartListPick,
  type LibraryChartListRunOutcome,
  type MediaLibraryService,
  type Collection,
  type MediaSample,
} from '@membrana/media-library-service';
import { selectSample, type SamplePlaybackSnapshot, playSampleNow, togglePlayPause } from '@membrana/sample-playback-service';

import { CabinetSampleRowActions } from '@/components/sample-library/CabinetSampleRowActions';

export interface CabinetSampleChartListPanelProps {
  readonly service: MediaLibraryService;
  readonly collectionId: string;
  /** Пробы текущей страницы — для имён; выборка несёт адреса, имена живут у библиотеки. */
  readonly knownSamples: readonly MediaSample[];
  readonly playback: SamplePlaybackSnapshot;
  readonly disabled?: boolean;
  /**
   * Действия над пробой — ТЕ ЖЕ глаголы сервиса, что у строки списка (#2188). Панель их не
   * заводит: выборка есть вид на те же пробы, и вторая правда о наборе здесь была бы ложью.
   */
  readonly moveTargets?: readonly Collection[];
  readonly canMutate?: boolean;
  readonly onMove?: (sampleId: string, toId: string) => Promise<void> | void;
  readonly onExport?: (sampleId: string) => void;
  readonly onRemove?: (sampleId: string) => Promise<void> | void;
  /**
   * Удаление ПАЧКОЙ (#2250). Отдельный глагол, а не цикл по `onRemove`: цикл открыл бы окно
   * подтверждения на каждую запись и превратил защиту в череду вопросов, которые перестают
   * читать. Список уходит в одно окно и в один вызов сервера, где частичный отказ называет
   * отказанные записи поимённо.
   */
  readonly onRemoveMany?: (sampleIds: readonly string[]) => Promise<void> | void;
}

export function CabinetSampleChartListPanel({
  service,
  collectionId,
  knownSamples,
  playback,
  disabled = false,
  moveTargets = [],
  canMutate = false,
  onMove,
  onExport,
  onRemove,
  onRemoveMany,
}: CabinetSampleChartListPanelProps) {
  const [volume, setVolume] = useState<number>(20);
  const [criterion, setCriterion] = useState<string>('loudness-over-floor');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<LibraryChartListRunOutcome | null>(null);
  // #2181: набор сменился — прежний отчёт больше не про него. Сбрасываем СРАЗУ, не дожидаясь
  // ответа: иначе числа прошлого набора выдают себя за новые всё время загрузки.
  useEffect(() => {
    setOutcome(null);
  }, [collectionId]);

  const titleOf = useMemo(() => {
    // Кабинет листает пробы страницами: имя есть только у проб текущей страницы. Проба с другой
    // страницы показывается адресом — честнее, чем «без названия», и играется тем же адресом.
    const byId = new Map(knownSamples.map((s) => [s.id, s.title]));
    return (sampleId: string) => byId.get(sampleId) ?? sampleId;
  }, [knownSamples]);

  const handleGenerate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const window = dateInputToIsoWindow(fromDate, toDate);
      setOutcome(await service.requestLibraryChartList(collectionId, { volume, criterion, ...window }));
    } catch (e) {
      // Ошибка канала — не пустая выборка: прежний результат остаётся, отказ словом.
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [service, collectionId, volume, criterion, fromDate, toDate]);

  const handlePlay = useCallback(
    (sampleId: string) => {
      void playSampleNow(
        { id: sampleId, title: titleOf(sampleId), collectionId },
        { select: selectSample, toggle: togglePlayPause },
      ).then((played) => {
        // Отказ не глотается: проба могла не загрузиться, и молчание кнопки — тот самый
        // дефект приёмки 26.08, только в другом месте.
        if (!played) setError('Проба не загрузилась — играть нечего');
      });
    },
    [collectionId, titleOf],
  );

  /**
   * Строка выборки после действия обязана сказать ПРАВДУ (#2188, класс stale outcome #2181).
   *
   * Перенесённая проба ушла в другой набор, стёртая исчезла — в выборке ТЕКУЩЕГО набора их
   * больше нет. Оставить строку значило бы «успех, и всё как было»: человек увидел бы тост об
   * успехе и ту же строку на месте, и не понял бы, случилось ли что-нибудь.
   */
  const dropFromSelection = useCallback((sampleId: string) => {
    setOutcome((prev) =>
      prev
        ? {
            ...prev,
            inSet: Math.max(0, prev.inSet - 1),
            selection: { ...prev.selection, picks: prev.selection.picks.filter((p) => p.sampleId !== sampleId) },
          }
        : prev,
    );
  }, []);

  const selection = outcome?.selection ?? null;

  /**
   * Отбор строк живёт В ПАНЕЛИ, а решения о нём — в ядре (`bulk-selection.ts`). Держать
   * состояние в модуле значило бы дать двум близнецам два разных отбора; держать решения в
   * панели — дать им два разных правила. Здесь только «что отмечено сейчас».
   */
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const shownIds = useMemo(() => (selection?.picks ?? []).map((p) => p.sampleId), [selection]);
  const pickedShown = useMemo(() => pickedShownIds(picked, shownIds), [picked, shownIds]);

  const removeManyGated = useCallback(async () => {
    if (!onRemoveMany || pickedShown.length === 0) return;
    const going = [...pickedShown];
    await onRemoveMany(going);
    // Ушедшие уходят и из показа, и из отбора: «успех, и всё как было» — тот же класс
    // stale outcome (#2181), что чинили для одиночного действия.
    for (const id of going) dropFromSelection(id);
    setPicked((prev) => forgetPicks(prev, going));
  }, [dropFromSelection, onRemoveMany, pickedShown]);

  return (
    <section
      className="rounded-lg border border-base-300 bg-base-200/40 p-3"
      role="region"
      aria-label="Отбор чарт-листа"
    >
      <div className="flex flex-wrap items-end gap-2">
        <h3 className="mr-auto text-sm font-semibold">Отбор чарт-листа</h3>
        <label className="form-control">
          <span className="label-text text-xs">Объём</span>
          <select
            className="select select-bordered select-xs"
            value={volume}
            disabled={disabled}
            onChange={(e) => setVolume(Number(e.target.value))}
          >
            {LIBRARY_CHART_LIST_VOLUMES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="form-control">
          <span className="label-text text-xs">Критерий</span>
          <select
            className="select select-bordered select-xs"
            value={criterion}
            disabled={disabled}
            onChange={(e) => setCriterion(e.target.value)}
          >
            {LIBRARY_CHART_LIST_CRITERIA.map((c) => (
              <option key={c.value} value={c.value}>{c.title}</option>
            ))}
          </select>
        </label>
        <label className="form-control">
          <span className="label-text text-xs">С даты</span>
          <input
            type="date"
            className="input input-bordered input-xs"
            value={fromDate}
            disabled={disabled}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>
        <label className="form-control">
          <span className="label-text text-xs">По дату</span>
          <input
            type="date"
            className="input input-bordered input-xs"
            value={toDate}
            disabled={disabled}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn-primary btn-xs"
          disabled={busy || disabled}
          onClick={() => void handleGenerate()}
        >
          {busy ? 'Отбор…' : 'Собрать выборку'}
        </button>
      </div>

      {error ? (
        <div className="alert alert-error mt-2 py-1 text-xs" role="alert">{error}</div>
      ) : null}

      {selection?.refusal ? (
        <div className="alert alert-warning mt-2 py-1 text-xs" role="status">
          Отбор отказал: {selection.refusal.detail}
        </div>
      ) : null}

      {outcome && !selection?.refusal ? (
        <>
          <p className="mt-2 text-xs text-base-content/60">
            В наборе {outcome.inSet} · в промежутке {outcome.inWindow} · измерено {outcome.measured}
            {selection && selection.shortfall > 0 ? ` · до объёма не хватило ${selection.shortfall}` : ''}
          </p>
          {canMutate && onRemoveMany ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  checked={allShownPicked(picked, shownIds)}
                  disabled={shownIds.length === 0}
                  onChange={() => setPicked((prev) => toggleAllShown(prev, shownIds))}
                />
                <span>{SELECT_ALL_SHOWN_LABEL}</span>
              </label>
              <button
                type="button"
                className="btn btn-error btn-xs"
                disabled={pickedShown.length === 0}
                onClick={() => void removeManyGated()}
              >
                {bulkDeleteLabel(pickedShown.length)}
              </button>
            </div>
          ) : null}
          <div className="mt-1 max-h-72 overflow-auto rounded border border-base-300">
            <table className="table table-xs">
              <thead>
                <tr>
                  {canMutate && onRemoveMany ? <th className="w-8" /> : null}
                  <th>#</th>
                  <th>Название</th>
                  <th className="text-right">Δ дБ</th>
                  <th className="text-right">Пик</th>
                  <th>Структура</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {selection?.picks.map((p: LibraryChartListPick) => (
                  <tr
                    key={p.sampleId}
                    className={playback.selectedSampleId === p.sampleId ? 'bg-primary/10' : undefined}
                  >
                    {canMutate && onRemoveMany ? (
                      <td>
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          aria-label={`Выбрать ${titleOf(p.sampleId)}`}
                          checked={picked.has(p.sampleId)}
                          onChange={() => setPicked((prev) => togglePick(prev, p.sampleId))}
                        />
                      </td>
                    ) : null}
                    <td className="tabular-nums">{p.rank}</td>
                    <td className="max-w-[16rem] truncate">{titleOf(p.sampleId)}</td>
                    <td className="text-right tabular-nums">{p.deltaDb.toFixed(1)}</td>
                    <td className="text-right tabular-nums">{p.peakDb.toFixed(1)}</td>
                    <td>{p.structure}{p.displaced > 0 ? ` · вытеснил ${p.displaced}` : ''}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          aria-label="Воспроизвести"
                          disabled={disabled}
                          onClick={() => handlePlay(p.sampleId)}
                        >
                          ▶
                        </button>
                        <CabinetSampleRowActions
                          sampleId={p.sampleId}
                          title={titleOf(p.sampleId)}
                          disabled={disabled}
                          moveTargets={moveTargets}
                          canMutate={canMutate}
                          {...(onExport ? { onExport } : {})}
                          {...(onMove
                            ? {
                                onMove: (id: string, toId: string) => {
                                  void Promise.resolve(onMove(id, toId)).then(() => dropFromSelection(id));
                                },
                              }
                            : {})}
                          {...(onRemove
                            ? {
                                onRemove: (id: string) => {
                                  void Promise.resolve(onRemove(id)).then(() => dropFromSelection(id));
                                },
                              }
                            : {})}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
