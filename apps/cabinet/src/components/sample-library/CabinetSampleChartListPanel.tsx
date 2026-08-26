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
import { useCallback, useMemo, useState } from 'react';
import {
  LIBRARY_CHART_LIST_CRITERIA,
  LIBRARY_CHART_LIST_VOLUMES,
  dateInputToIsoWindow,
  type LibraryChartListPick,
  type LibraryChartListRunOutcome,
  type MediaLibraryService,
  type MediaSample,
} from '@membrana/media-library-service';
import { selectSample, type SamplePlaybackSnapshot, playSampleNow, togglePlayPause } from '@membrana/sample-playback-service';

export interface CabinetSampleChartListPanelProps {
  readonly service: MediaLibraryService;
  readonly collectionId: string;
  /** Пробы текущей страницы — для имён; выборка несёт адреса, имена живут у библиотеки. */
  readonly knownSamples: readonly MediaSample[];
  readonly playback: SamplePlaybackSnapshot;
  readonly disabled?: boolean;
}

export function CabinetSampleChartListPanel({
  service,
  collectionId,
  knownSamples,
  playback,
  disabled = false,
}: CabinetSampleChartListPanelProps) {
  const [volume, setVolume] = useState<number>(20);
  const [criterion, setCriterion] = useState<string>('loudness-over-floor');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<LibraryChartListRunOutcome | null>(null);

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

  const selection = outcome?.selection ?? null;

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
          <div className="mt-1 max-h-72 overflow-auto rounded border border-base-300">
            <table className="table table-xs">
              <thead>
                <tr>
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
                    <td className="tabular-nums">{p.rank}</td>
                    <td className="max-w-[16rem] truncate">{titleOf(p.sampleId)}</td>
                    <td className="text-right tabular-nums">{p.deltaDb.toFixed(1)}</td>
                    <td className="text-right tabular-nums">{p.peakDb.toFixed(1)}</td>
                    <td>{p.structure}{p.displaced > 0 ? ` · вытеснил ${p.displaced}` : ''}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        aria-label="Воспроизвести"
                        disabled={disabled}
                        onClick={() => handlePlay(p.sampleId)}
                      >
                        ▶
                      </button>
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
