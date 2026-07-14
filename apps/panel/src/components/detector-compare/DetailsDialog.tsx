import { useEffect, useRef } from 'react';
import {
  DETECTOR_LABELS,
  formatScore,
  verdictWord,
  type CompareSample,
  type DetectorKey,
} from '@/lib/detectorCompare';

/** Поля details trends-вердикта, которые показываем таблицей (см. экспортёр). */
interface TrendsField {
  field: string;
  category: string;
  actual: string;
  expected: string;
  matchPercent: number;
}

interface NamedScore {
  name: string;
  score: number;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Попап «подробнее» (видение владельца): метрики + пояснение, на основании
 * чего детектор решил. Нативный <dialog> — Esc и фокус-ловушка из коробки.
 */
export function DetailsDialog({
  sample,
  detector,
  onClose,
}: {
  sample: CompareSample;
  detector: DetectorKey;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const verdict = sample.detectors[detector];

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const details = verdict.details;
  const trendsFields = detector === 'trends' ? asArray<TrendsField>(details.fields) : [];
  const topClasses = detector === 'yamnet' ? asArray<NamedScore>(details.topClasses) : [];
  const droneClasses = detector === 'yamnet' ? asArray<NamedScore>(details.droneClassScores) : [];

  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      aria-label={`Подробности вердикта ${DETECTOR_LABELS[detector]} по треку ${sample.id}`}
    >
      <div className="modal-box max-w-2xl">
        <h3 className="text-lg font-semibold">
          {DETECTOR_LABELS[detector]} — {sample.id}
        </h3>
        <p className="mt-1 text-sm">
          Вердикт: <span className="font-medium">{verdictWord(verdict.isDrone)}</span>
          {', '}
          скор <span className="tabular-nums">{formatScore(verdict.confidence)}</span>
          {typeof details.threshold === 'number' && (
            <>
              {' '}
              (порог <span className="tabular-nums">{formatScore(details.threshold)}</span>)
            </>
          )}
        </p>

        <p className="mt-3 rounded-lg bg-base-200 p-3 text-sm" data-testid="explanation">
          {verdict.explanation}
        </p>

        {detector === 'trends' && (
          <div className="mt-3 overflow-x-auto">
            <table className="table table-xs">
              <caption className="text-left text-xs text-base-content/60">
                Совпадение с шаблоном {String(details.templateKey ?? '')}: спектр{' '}
                <span className="tabular-nums">{Math.round(Number(details.spectralScore ?? 0))}</span>/100,
                темпоральность{' '}
                <span className="tabular-nums">{Math.round(Number(details.temporalScore ?? 0))}</span>/100,
                окон анализа: <span className="tabular-nums">{Number(details.windows ?? 0)}</span>
              </caption>
              <thead>
                <tr>
                  <th>Поле</th>
                  <th>Факт</th>
                  <th>Ожидание шаблона</th>
                  <th className="text-right">Совпадение</th>
                </tr>
              </thead>
              <tbody>
                {trendsFields.map((f) => (
                  <tr key={f.field}>
                    <td>{f.field}</td>
                    <td>{f.actual}</td>
                    <td>{f.expected}</td>
                    <td className="text-right tabular-nums">{f.matchPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {detector === 'yamnet' && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium">Топ-классы клипа</h4>
              <ul className="mt-1 text-sm">
                {topClasses.map((c) => (
                  <li key={c.name} className="flex justify-between gap-2">
                    <span>{c.name}</span>
                    <span className="tabular-nums">{c.score}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium">Дрон-классы (агрегируются в скор)</h4>
              <ul className="mt-1 text-sm">
                {droneClasses.map((c) => (
                  <li key={c.name} className="flex justify-between gap-2">
                    <span>{c.name}</span>
                    <span className="tabular-nums">{c.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="modal-action">
          <button type="button" className="btn btn-sm" onClick={() => ref.current?.close()}>
            Закрыть
          </button>
        </div>
      </div>
    </dialog>
  );
}
