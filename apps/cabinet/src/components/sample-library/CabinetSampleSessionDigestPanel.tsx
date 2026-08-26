/**
 * Панель «Разбор сеанса» в КАБИНЕТНОЙ библиотеке — близнец Studio-панели (#2039).
 *
 * Одна форма, разный транспорт: свод считает тот же отчёт `membrana.report.session-digest`
 * тем же сервисом, которым кабинет читает пробы узла. Два списка — опорные (тональные) и
 * негативный материал (широкополосные, не выброшены) — с прослушиванием; паспорт с поимённым
 * списком порогов, которых слух ещё не называл. Ядро отчёта не трогается.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  dateInputToIsoWindow,
  type MediaLibraryService,
  type MediaSample,
  type SessionDigestRunOutcome,
  type SessionDigestSound,
} from '@membrana/media-library-service';
import { selectSample, type SamplePlaybackSnapshot, playSampleNow, togglePlayPause } from '@membrana/sample-playback-service';

export interface CabinetSampleSessionDigestPanelProps {
  readonly service: MediaLibraryService;
  readonly collectionId: string;
  readonly knownSamples: readonly MediaSample[];
  readonly playback: SamplePlaybackSnapshot;
  readonly disabled?: boolean;
}

const fmtSec = (s: number) => `${s.toFixed(1)} с`;

export function CabinetSampleSessionDigestPanel({
  service,
  collectionId,
  knownSamples,
  playback,
  disabled = false,
}: CabinetSampleSessionDigestPanelProps) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SessionDigestRunOutcome | null>(null);

  const titleOf = useMemo(() => {
    const byId = new Map(knownSamples.map((s) => [s.id, s.title]));
    return (sound: SessionDigestSound) => byId.get(sound.sampleId) ?? sound.title ?? sound.sampleId;
  }, [knownSamples]);

  const handleDigest = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setOutcome(await service.requestSessionDigest(collectionId, dateInputToIsoWindow(fromDate, toDate)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [service, collectionId, fromDate, toDate]);

  const play = useCallback(
    (sound: SessionDigestSound) =>
      // Клик «играть» играет, а не только выбирает (#2177): половина без второй — тот дефект,
      // что владелец нашёл на проде 26.08.
      void playSampleNow(
        { id: sound.sampleId, title: titleOf(sound), collectionId },
        { select: selectSample, toggle: togglePlayPause },
      ),
    [collectionId, titleOf],
  );

  const list = (title: string, sounds: readonly SessionDigestSound[], shortfall: number) => (
    <div className="mt-2">
      <h4 className="text-xs font-semibold">
        {title} — {sounds.length}{shortfall > 0 ? ` (до полного списка не хватило ${shortfall})` : ''}
      </h4>
      {sounds.length === 0 ? (
        <p className="text-xs text-base-content/60">пусто</p>
      ) : (
        <div className="max-h-64 overflow-auto rounded border border-base-300">
          <table className="table table-xs">
            <thead>
              <tr><th>#</th><th>Название</th><th>Отрезок</th><th className="text-right">Пик</th><th>Похожих</th><th /></tr>
            </thead>
            <tbody>
              {sounds.map((s, i) => (
                <tr key={`${s.sampleId}-${s.startSec}`} className={playback.selectedSampleId === s.sampleId ? 'bg-primary/10' : undefined}>
                  <td className="tabular-nums">{i + 1}</td>
                  <td className="max-w-[16rem] truncate">{titleOf(s)}</td>
                  <td className="tabular-nums text-xs">{fmtSec(s.startSec)}–{fmtSec(s.endSec)}</td>
                  <td className="text-right tabular-nums">{s.peakDb.toFixed(1)}</td>
                  <td className="tabular-nums">{s.similarDropped > 0 ? `вытеснил ${s.similarDropped}` : '—'}</td>
                  <td><button type="button" className="btn btn-ghost btn-xs" aria-label="Воспроизвести" disabled={disabled} onClick={() => play(s)}>▶</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <section className="rounded-lg border border-base-300 bg-base-200/40 p-3" role="region" aria-label="Разбор сеанса">
      <div className="flex flex-wrap items-end gap-2">
        <h3 className="mr-auto text-sm font-semibold">Разбор сеанса</h3>
        <label className="form-control">
          <span className="label-text text-xs">Ночь с</span>
          <input type="date" className="input input-bordered input-xs" value={fromDate} disabled={disabled} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="form-control">
          <span className="label-text text-xs">по</span>
          <input type="date" className="input input-bordered input-xs" value={toDate} disabled={disabled} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <button type="button" className="btn btn-primary btn-xs" disabled={busy || disabled} onClick={() => void handleDigest()}>
          {busy ? 'Разбираем…' : 'Разобрать сеанс'}
        </button>
      </div>

      {error ? <div className="alert alert-error mt-2 py-1 text-xs" role="alert">{error}</div> : null}
      {outcome?.refusal ? (
        <div className="alert alert-warning mt-2 py-1 text-xs" role="status">Свод отказал: {outcome.refusal.detail}</div>
      ) : null}

      {outcome && !outcome.refusal ? (
        <>
          <p className="mt-2 text-xs text-base-content/60">
            Треков {outcome.window.tracksSeen} · в окне {outcome.window.tracksInWindow} · событий {outcome.eventsFound}
            {' · '}фон {outcome.floor.value.toFixed(1)} дБ{outcome.floor.measured ? '' : ' (не измерен)'}
          </p>
          <p className="text-xs text-base-content/60">
            Паспорт: кадр {outcome.passport.frameSize} · Δ {outcome.passport.deltaDb} дБ · порог похожести {outcome.passport.minDistanceRatio} · плоскостность ≤ {outcome.passport.flatnessCeiling}
            {outcome.passport.provisional.length > 0 ? (
              <> · <span title="Пороги, которых слух ещё не называл: рабочая точка кода, не замер">слухом не названы: {outcome.passport.provisional.join(', ')}</span></>
            ) : null}
          </p>
          {list('Опорные (тональные)', outcome.references, outcome.shortfall.references)}
          {list('Негативный материал (широкополосные)', outcome.negatives, outcome.shortfall.negatives)}
        </>
      ) : null}
    </section>
  );
}
