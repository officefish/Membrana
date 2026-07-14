import { useEffect, useMemo, useState } from 'react';
import {
  DETECTOR_LABELS,
  FILTER_LABELS,
  applyFilter,
  formatPct,
  parseCompareReport,
  sortByConfidence,
  type CompareFilter,
  type CompareReport,
  type CompareSample,
  type DetectorKey,
  type SortDirection,
} from '@/lib/detectorCompare';
import { stopPlayback } from '@/lib/comparePlayback';
import { CompareTable } from './CompareTable';
import { DetailsDialog } from './DetailsDialog';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; report: CompareReport };

const FILTERS: readonly CompareFilter[] = ['all', 'drone', 'not-drone', 'disagree'];

/** Сводка P/R/F1/FPR обоих детекторов — без неё оператор считает в уме. */
function SummaryHeader({ report }: { report: CompareReport }) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-xs max-w-xl" aria-label="Сводные метрики детекторов на корпусе">
        <thead>
          <tr>
            <th>Детектор</th>
            <th className="text-right">Precision</th>
            <th className="text-right">Recall</th>
            <th className="text-right">F1</th>
            <th className="text-right">FPR</th>
          </tr>
        </thead>
        <tbody>
          {(['trends', 'yamnet'] as const).map((key) => {
            const m = report.summary[key];
            return (
              <tr key={key}>
                <td className="font-medium">{DETECTOR_LABELS[key]}</td>
                <td className="text-right tabular-nums">{formatPct(m.precision)}</td>
                <td className="text-right tabular-nums">{formatPct(m.recall)}</td>
                <td className="text-right tabular-nums">{m.f1 == null ? '—' : m.f1.toFixed(3)}</td>
                <td className="text-right tabular-nums">{formatPct(m.fpr)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Борд «Детекторы: trends DRONE_TIGHT vs yamnet» (#452) — витрина read-only
 * над артефактом экспортёра. Данные публичны (те же числа в открытом репо);
 * operator-гейт раздела — UX, не защита (консилиум detector-compare-board).
 */
export function DetectorCompareSection() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [filter, setFilter] = useState<CompareFilter>('all');
  const [sortDetector, setSortDetector] = useState<DetectorKey>('trends');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [details, setDetails] = useState<{ sample: CompareSample; detector: DetectorKey } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/compare-data/latest.json')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Артефакт сравнения недоступен (HTTP ${response.status})`);
        }
        return parseCompareReport(await response.json());
      })
      .then((report) => {
        if (cancelled) return;
        setState(report.samples.length === 0 ? { status: 'empty' } : { status: 'ready', report });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Не удалось загрузить артефакт',
        });
      });
    return () => {
      cancelled = true;
      stopPlayback();
    };
  }, []);

  const visibleSamples = useMemo(
    () =>
      state.status === 'ready'
        ? sortByConfidence(applyFilter(state.report.samples, filter), sortDetector, sortDirection)
        : [],
    [state, filter, sortDetector, sortDirection],
  );

  if (state.status === 'loading') {
    return (
      <div className="flex justify-center py-16" aria-busy="true">
        <span className="loading loading-spinner loading-lg text-primary" aria-label="Загрузка сравнения" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="alert alert-error" role="alert">
        <span>Ошибка загрузки данных сравнения: {state.message}</span>
      </div>
    );
  }

  if (state.status === 'empty') {
    return (
      <p className="py-16 text-center text-base-content/60">
        Артефакт сравнения пуст — прогоните <code>yarn detector:compare:export</code>.
      </p>
    );
  }

  const { report } = state;

  return (
    <section aria-label="Сравнение детекторов trends и yamnet">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Детекторы: trends (DRONE_TIGHT) vs yamnet</h2>
          <p className="text-sm text-base-content/60">
            Корпус {report.corpus.name} · {report.corpus.sampleCount} треков · прогон{' '}
            {new Date(report.generatedAt).toLocaleDateString('ru-RU')}
          </p>
        </div>
        <SummaryHeader report={report} />
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="join" role="group" aria-label="Фильтр треков по разметке корпуса">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`btn join-item btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          Сортировка по уверенности:
          <select
            className="select select-bordered select-sm"
            value={sortDetector}
            onChange={(e) => setSortDetector(e.target.value as DetectorKey)}
            aria-label="Детектор для сортировки"
          >
            <option value="trends">{DETECTOR_LABELS.trends}</option>
            <option value="yamnet">{DETECTOR_LABELS.yamnet}</option>
          </select>
        </label>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
          aria-label={
            sortDirection === 'desc' ? 'Сейчас уверенные сверху — переключить' : 'Сейчас уверенные снизу — переключить'
          }
        >
          {sortDirection === 'desc' ? '↓ уверенные сверху' : '↑ уверенные снизу'}
        </button>

        <span className="text-xs text-base-content/50" aria-live="polite">
          показано {visibleSamples.length} из {report.samples.length}
        </span>
      </div>

      <CompareTable
        samples={visibleSamples}
        playingId={playingId}
        onPlayingChange={setPlayingId}
        onDetails={(sample, detector) => setDetails({ sample, detector })}
      />

      {details && (
        <DetailsDialog
          sample={details.sample}
          detector={details.detector}
          onClose={() => setDetails(null)}
        />
      )}
    </section>
  );
}
