/**
 * Панель «Дубли набора» в библиотеке Studio (#2109) — пятая в ряду панелей библиотеки.
 *
 * ПАРЫ СЧИТАЕТ СЕРВЕР: панель заказывает витрину `membrana.showcase.library-duplicates` по
 * ТЕКУЩЕМУ набору и показывает группы «представитель + похожие». Мер и порогов здесь нет.
 *
 * ПОКАЗАТЬ И ЖДАТЬ СЛОВА — предмет панели, а не оговорка. Порог унаследован от отбора без
 * перепроверки для стирания (паспорт витрины говорит это словом, панель его печатает).
 * Поэтому: пары рядом · «послушать подряд» одним кликом (представитель, затем похожие) ·
 * «удалить» ТОЛЬКО на похожем, ТОЛЬКО по клику, ТОЛЬКО с подтверждением. Никакого «удалить
 * все дубли» — одна кнопка на одну пробу, и цена ошибки остаётся ценой одной пробы.
 *
 * Отсев слеп ко времени (замер 23.08): рядом с каждой пробой печатается её момент — человек
 * видит соседство по времени первым, отсев его не видит вовсе.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMediaLibrary } from '@membrana/media-library-service';
import type {
  LibraryDuplicateGroup,
  LibraryDuplicateRef,
  LibraryDuplicatesRunOutcome,
} from '@membrana/media-library-service';
import {
  dateInputToIsoWindow,
} from '@membrana/media-library-service';
import {
  getSamplePlaybackSnapshot,
  playSequence,
  selectSample,
  subscribeSamplePlayback,
  togglePlayPause,
  useSamplePlayback,
} from '@membrana/sample-playback-service';

export interface SampleLibraryDuplicatesPanelProps {
  readonly moduleId: string;
  readonly collectionId: string;
}

const fmtAt = (ms: number) => (ms > 0 ? new Date(ms).toLocaleString() : '—');

export const SampleLibraryDuplicatesPanel: React.FC<SampleLibraryDuplicatesPanelProps> = ({
  moduleId: _moduleId,
  collectionId,
}) => {
  const { service, snapshot } = useMediaLibrary();
  const playback = useSamplePlayback();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<LibraryDuplicatesRunOutcome | null>(null);
  // #2181: набор сменился — прежний отчёт больше не про него. Сбрасываем СРАЗУ, не дожидаясь
  // ответа: иначе числа прошлого набора выдают себя за новые всё время загрузки.
  useEffect(() => {
    setOutcome(null);
  }, [collectionId]);
  const [sequenceNote, setSequenceNote] = useState<string | null>(null);
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const titleOf = useMemo(() => {
    const byId = new Map((snapshot.samplesByCollection[collectionId] ?? []).map((s) => [s.id, s.title]));
    return (sampleId: string) => byId.get(sampleId) ?? sampleId;
  }, [snapshot.samplesByCollection, collectionId]);

  const handleFind = useCallback(async () => {
    setBusy(true);
    setError(null);
    setRemoved(new Set());
    try {
      setOutcome(await service.requestLibraryDuplicates(collectionId, dateInputToIsoWindow(fromDate, toDate)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [service, collectionId, fromDate, toDate]);

  /** Послушать группу подряд: представитель, затем похожие по времени. Общее ядро близнецов. */
  const handleListen = useCallback(
    async (group: LibraryDuplicateGroup) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setSequenceNote('слушаем подряд…');
      const targets = [group.keeper, ...group.duplicates]
        .filter((r) => !removed.has(r.sampleId))
        .map((r) => ({ id: r.sampleId, title: titleOf(r.sampleId), collectionId }));
      const out = await playSequence(
        { select: selectSample, play: togglePlayPause, subscribe: subscribeSamplePlayback, snapshot: getSamplePlaybackSnapshot },
        targets,
        ac.signal,
      );
      setSequenceNote(
        out.stoppedBy === 'complete'
          ? `прослушано ${out.played} из ${targets.length}`
          : out.stoppedBy === 'error'
            ? `остановлено на «${titleOf(out.failedSampleId ?? '')}»: ${out.error ?? 'ошибка'}`
            : null,
      );
    },
    [collectionId, removed, titleOf],
  );

  /** Удалить ОДНУ похожую пробу — по клику, с подтверждением. Представителя удалить нельзя. */
  const handleRemove = useCallback(
    async (ref: LibraryDuplicateRef) => {
      if (!window.confirm(`Удалить «${titleOf(ref.sampleId)}» (${fmtAt(ref.at)})? Действие необратимо.`)) return;
      setError(null);
      try {
        await service.removeSample(ref.sampleId);
        setRemoved((prev) => new Set([...prev, ref.sampleId]));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [service, titleOf],
  );

  const report = outcome?.report ?? null;

  return (
    <section className="rounded-lg border border-base-300 bg-base-200/40 p-3" role="region" aria-label="Дубли набора">
      <div className="flex flex-wrap items-end gap-2">
        <h3 className="mr-auto text-sm font-semibold">Дубли набора</h3>
        <label className="form-control">
          <span className="label-text text-xs">С даты</span>
          <input type="date" className="input input-bordered input-xs" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="form-control">
          <span className="label-text text-xs">По дату</span>
          <input type="date" className="input input-bordered input-xs" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <button type="button" className="btn btn-primary btn-xs" disabled={busy} onClick={() => void handleFind()}>
          {busy ? 'Ищем…' : 'Найти дубли'}
        </button>
      </div>

      {error ? <div className="alert alert-error mt-2 py-1 text-xs" role="alert">{error}</div> : null}
      {report?.refusal ? (
        <div className="alert alert-warning mt-2 py-1 text-xs" role="status">Поиск отказал: {report.refusal.detail}</div>
      ) : null}

      {outcome && report && !report.refusal ? (
        <>
          <p className="mt-2 text-xs text-base-content/60">
            В наборе {outcome.inSet} · в промежутке {outcome.inWindow} · измерено {outcome.measured} · похожих найдено {report.duplicatesFound}
            {' · '}порог {report.passport.minDistanceRatio} — <span title="Порог взят у отбора без перепроверки для стирания: решает слух, не число">унаследован от отбора</span>
          </p>
          {sequenceNote ? <p className="text-xs text-base-content/60" role="status">{sequenceNote}</p> : null}
          {report.groups.length === 0 ? (
            <p className="mt-2 text-xs">Похожих не нашлось — набор разнороден.</p>
          ) : (
            <div className="mt-1 max-h-96 overflow-auto rounded border border-base-300">
              <table className="table table-xs">
                <thead>
                  <tr><th>Группа</th><th>Название</th><th>Момент</th><th className="text-right">Δ дБ</th><th /></tr>
                </thead>
                <tbody>
                  {report.groups.map((g, gi) => (
                    <React.Fragment key={g.keeper.sampleId}>
                      <tr className="bg-base-300/40">
                        <td className="tabular-nums">{gi + 1}</td>
                        <td className="max-w-[16rem] truncate font-medium">{titleOf(g.keeper.sampleId)} <span className="text-base-content/50">— представитель</span></td>
                        <td className="tabular-nums text-xs">{fmtAt(g.keeper.at)}</td>
                        <td className="text-right tabular-nums">{g.keeper.deltaDb.toFixed(1)}</td>
                        <td>
                          <button type="button" className="btn btn-ghost btn-xs" onClick={() => void handleListen(g)}>
                            послушать подряд ({1 + g.duplicates.filter((d) => !removed.has(d.sampleId)).length})
                          </button>
                        </td>
                      </tr>
                      {g.duplicates.map((d) => (
                        <tr key={d.sampleId} className={removed.has(d.sampleId) ? 'opacity-40 line-through' : playback.selectedSampleId === d.sampleId ? 'bg-primary/10' : undefined}>
                          <td />
                          <td className="max-w-[16rem] truncate pl-6">{titleOf(d.sampleId)}</td>
                          <td className="tabular-nums text-xs">{fmtAt(d.at)}</td>
                          <td className="text-right tabular-nums">{d.deltaDb.toFixed(1)}</td>
                          <td className="whitespace-nowrap">
                            <button type="button" className="btn btn-ghost btn-xs" aria-label="Воспроизвести" onClick={() => void selectSample({ id: d.sampleId, title: titleOf(d.sampleId), collectionId })}>▶</button>
                            {!removed.has(d.sampleId) ? (
                              <button type="button" className="btn btn-ghost btn-xs text-error" onClick={() => void handleRemove(d)}>удалить</button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
};
