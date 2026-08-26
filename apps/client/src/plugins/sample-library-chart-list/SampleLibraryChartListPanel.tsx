/**
 * Панель отбора чарт-листа в библиотеке (#2110) — четвёртая в ряду панелей библиотеки.
 *
 * ОТБОР СЧИТАЕТ СЕРВЕР. Панель заказывает прогон витрины `membrana.showcase.library-chart-list`
 * по ТЕКУЩЕМУ набору (какой выбран в сайдбаре — по тому и отбор: буфер так буфер) и показывает
 * выборку. Мер и порогов здесь нет — вторая правда о звуке не заводится.
 *
 * РАСКЛАДКА — ЖУРНАЛЬНЫЙ ОБРАЗЕЦ: настройки строкой сверху (как сайдбар-настройки у журнала
 * кабинета), результат таблицей ниже. Отказ отбора показывается СЛОВАМИ отказа, а не пустой
 * таблицей: «в этот промежуток записей нет» и «критерий не выбран» — разные события.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { useMediaLibrary } from '@membrana/media-library-service';
import type { LibraryChartListPick, LibraryChartListRunOutcome } from '@membrana/media-library-service';
import { selectSample, useSamplePlayback, playSampleNow, togglePlayPause } from '@membrana/sample-playback-service';

import { dateInputToIsoWindow } from './types';

const VOLUMES = [20, 60, 100, 200] as const;
const CRITERIA = [
  { value: 'loudness-over-floor', title: 'Громче фона' },
  { value: 'spectral-variety', title: 'Разнообразие звука' },
  { value: 'drone-likeness', title: 'Похожесть на дрон' },
] as const;

export interface SampleLibraryChartListPanelProps {
  readonly moduleId: string;
  /** Текущий набор — его выбирает сайдбар библиотеки, панель выбор не дублирует. */
  readonly collectionId: string;
}

export const SampleLibraryChartListPanel: React.FC<SampleLibraryChartListPanelProps> = ({
  moduleId: _moduleId,
  collectionId,
}) => {
  const { service, snapshot } = useMediaLibrary();
  const playback = useSamplePlayback();

  const [volume, setVolume] = useState<number>(20);
  const [criterion, setCriterion] = useState<string>('loudness-over-floor');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<LibraryChartListRunOutcome | null>(null);

  /** Название пробы — из снапшота набора: выборка несёт адреса, имена живут у библиотеки. */
  const titleOf = useMemo(() => {
    const byId = new Map(
      (snapshot.samplesByCollection[collectionId] ?? []).map((s) => [s.id, s.title]),
    );
    return (sampleId: string) => byId.get(sampleId) ?? sampleId;
  }, [snapshot.samplesByCollection, collectionId]);

  const handleGenerate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const window = dateInputToIsoWindow(fromDate, toDate);
      setOutcome(await service.requestLibraryChartList(collectionId, { volume, criterion, ...window }));
    } catch (e) {
      // Ошибка канала — не пустая выборка: прежний результат остаётся на экране, отказ словом.
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [service, collectionId, volume, criterion, fromDate, toDate]);

  const handlePlay = useCallback(
    (sampleId: string) => {
      // Проигрыватель хочет цель с именем — берём её из снапшота набора, как основной список.
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
    <section className="rounded-lg border border-base-300 bg-base-200/40 p-3">
      <div className="flex flex-wrap items-end gap-2">
        <h3 className="mr-auto text-sm font-semibold">Отбор чарт-листа</h3>
        <label className="form-control">
          <span className="label-text text-xs">Объём</span>
          <select
            className="select select-bordered select-xs"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          >
            {VOLUMES.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="form-control">
          <span className="label-text text-xs">Критерий</span>
          <select
            className="select select-bordered select-xs"
            value={criterion}
            onChange={(e) => setCriterion(e.target.value)}
          >
            {CRITERIA.map((c) => (
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
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>
        <label className="form-control">
          <span className="label-text text-xs">По дату</span>
          <input
            type="date"
            className="input input-bordered input-xs"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>
        <button type="button" className="btn btn-primary btn-xs" disabled={busy} onClick={() => void handleGenerate()}>
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
          <div className="mt-1 max-h-64 overflow-auto rounded border border-base-300">
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
                  <tr key={p.sampleId} className={playback.selectedSampleId === p.sampleId ? 'bg-primary/10' : undefined}>
                    <td className="tabular-nums">{p.rank}</td>
                    <td className="max-w-[14rem] truncate">{titleOf(p.sampleId)}</td>
                    <td className="text-right tabular-nums">{p.deltaDb.toFixed(1)}</td>
                    <td className="text-right tabular-nums">{p.peakDb.toFixed(1)}</td>
                    <td>{p.structure}{p.displaced > 0 ? ` · вытеснил ${p.displaced}` : ''}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        aria-label="Воспроизвести"
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
};
