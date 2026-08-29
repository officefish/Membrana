/**
 * Панель «Дубли набора» в КАБИНЕТНОЙ библиотеке — близнец Studio-панели (#2109).
 *
 * Одна форма, разный транспорт: пары считает та же витрина `membrana.showcase.library-duplicates`,
 * «послушать подряд» — то же ядро `playSequence`, удаление — через хук библиотеки кабинета
 * (`onRemove`), чтобы страница перечиталась и тост сказал словом, как у остальных удалений.
 *
 * ПОКАЗАТЬ И ЖДАТЬ СЛОВА: порог унаследован (паспорт печатается), «удалить» — только на похожем,
 * только по клику, только с подтверждением, по одной пробе.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  dateInputToIsoWindow,
  type LibraryDuplicateGroup,
  type LibraryDuplicateRef,
  type LibraryDuplicatesRunOutcome,
  type MediaLibraryService,
  type MediaSample,
} from '@membrana/media-library-service';
import {
  getSamplePlaybackSnapshot,
  playSequence,
  selectSample,
  subscribeSamplePlayback,
  togglePlayPause,
  type SamplePlaybackSnapshot,
} from '@membrana/sample-playback-service';

export interface CabinetSampleDuplicatesPanelProps {
  readonly service: MediaLibraryService;
  readonly collectionId: string;
  readonly knownSamples: readonly MediaSample[];
  readonly playback: SamplePlaybackSnapshot;
  /** Удаление одной пробы — глагол хука библиотеки: он перечитает страницу и скажет тостом. */
  readonly onRemove: (sampleId: string) => void | Promise<void>;
  readonly disabled?: boolean;
}

const fmtAt = (ms: number) => (ms > 0 ? new Date(ms).toLocaleString() : '—');

export function CabinetSampleDuplicatesPanel({
  service,
  collectionId,
  knownSamples,
  playback,
  onRemove,
  disabled = false,
}: CabinetSampleDuplicatesPanelProps) {
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
    const byId = new Map(knownSamples.map((s) => [s.id, s.title]));
    return (sampleId: string) => byId.get(sampleId) ?? sampleId;
  }, [knownSamples]);

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

  const handleRemove = useCallback(
    async (ref: LibraryDuplicateRef) => {
      // Подтверждение живёт в окне удаления страницы (#2218), не здесь: иначе человек
      // отвечает на два вопроса подряд, и сильный из них теряется за слабым.
      await onRemove(ref.sampleId);
      setRemoved((prev) => new Set([...prev, ref.sampleId]));
    },
    [onRemove, titleOf],
  );

  const report = outcome?.report ?? null;

  return (
    <section className="rounded-lg border border-base-300 bg-base-200/40 p-3" role="region" aria-label="Дубли набора">
      <div className="flex flex-wrap items-end gap-2">
        <h3 className="mr-auto text-sm font-semibold">Дубли набора</h3>
        <label className="form-control">
          <span className="label-text text-xs">С даты</span>
          <input type="date" className="input input-bordered input-xs" value={fromDate} disabled={disabled} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="form-control">
          <span className="label-text text-xs">По дату</span>
          <input type="date" className="input input-bordered input-xs" value={toDate} disabled={disabled} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <button type="button" className="btn btn-primary btn-xs" disabled={busy || disabled} onClick={() => void handleFind()}>
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
                          <button type="button" className="btn btn-ghost btn-xs" disabled={disabled} onClick={() => void handleListen(g)}>
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
                            <button type="button" className="btn btn-ghost btn-xs" aria-label="Воспроизвести" disabled={disabled} onClick={() => void selectSample({ id: d.sampleId, title: titleOf(d.sampleId), collectionId })}>▶</button>
                            {!removed.has(d.sampleId) ? (
                              <button type="button" className="btn btn-ghost btn-xs text-error" disabled={disabled} onClick={() => void handleRemove(d)}>удалить</button>
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
}
