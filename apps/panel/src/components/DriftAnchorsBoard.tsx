import { useEffect, useState } from 'react';

import {
  ageLabel,
  anchorLabel,
  compareProdMain,
  VERDICT_LABELS,
  type DriftAnchorRecord,
} from '@/lib/quality';
import { fetchDriftDigest, type QualityFetch } from '@/lib/qualityApi';

/**
 * Борд «Дрейф-якоря» (#454, QC1): записи office-журнала drift-anchor с
 * происхождением каждого числа (detectorVersion, takenAt + возраст). Вердикты
 * вынесены продюсерами (чистая computeDrift) — борд только показывает.
 */

const VERDICT_BADGE: Record<DriftAnchorRecord['verdict'], string> = {
  ok: 'badge-success',
  drift: 'badge-warning',
  broken: 'badge-error',
};

function ProdMainLine({ records }: { records: DriftAnchorRecord[] }) {
  const cmp = compareProdMain(records);
  if (cmp.state === 'insufficient') {
    return (
      <p className="text-sm text-base-content/60">
        Сравнение prod↔main: недостаточно записей (нужны оба code-якоря).
      </p>
    );
  }
  if (cmp.state === 'match') {
    return (
      <p className="text-sm">
        Сравнение prod↔main: <span className="badge badge-success badge-sm align-middle">совпадают</span>{' '}
        <code className="text-xs">{cmp.detectorVersion}</code>
      </p>
    );
  }
  return (
    <p className="text-sm">
      Сравнение prod↔main: <span className="badge badge-error badge-sm align-middle">разошлись</span>{' '}
      CI <code className="text-xs">{cmp.ci}</code> · office <code className="text-xs">{cmp.schedule}</code>
    </p>
  );
}

export function DriftAnchorsBoard() {
  const [result, setResult] = useState<QualityFetch<DriftAnchorRecord[]> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchDriftDigest().then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (result === null) {
    return (
      <div className="flex justify-center py-8" aria-busy="true">
        <span className="loading loading-spinner text-primary" aria-label="Загрузка записей" />
      </div>
    );
  }
  if (result.state === 'error') {
    return <p role="alert" className="text-sm text-error">Office недоступен — записи не получены. Обновите страницу позже.</p>;
  }
  if (result.state === 'empty' || result.state === 'forbidden') {
    return (
      <p className="text-sm text-base-content/70">
        Записей пока нет: журнал живёт в памяти office и сбрасывается его перезапуском —
        появятся после ближайшего прогона продюсеров (CI-гейт или ночной cron).
      </p>
    );
  }

  const now = new Date();
  return (
    <div className="space-y-4">
      <ProdMainLine records={result.data} />
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th scope="col">Якорь</th>
              <th scope="col">Вердикт</th>
              <th scope="col">Δ</th>
              <th scope="col">Версия детекторов</th>
              <th scope="col">Снято</th>
            </tr>
          </thead>
          <tbody>
            {result.data.map((rec) => (
              <tr key={`${rec.anchorKind}:${rec.anchorSource}`}>
                <td>{anchorLabel(rec)}</td>
                <td>
                  <span className={`badge badge-sm ${VERDICT_BADGE[rec.verdict]}`}>
                    {VERDICT_LABELS[rec.verdict]}
                  </span>
                </td>
                <td className="tabular-nums">{rec.delta.toFixed(4)}</td>
                <td><code className="text-xs">{rec.detectorVersion}</code></td>
                <td className="whitespace-nowrap text-base-content/70">{ageLabel(rec.takenAt, now)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-base-content/50">
        Вердикты вынесены детерминированной computeDrift на продюсерах; office — только транспорт (ADR 0004).
      </p>
    </div>
  );
}
