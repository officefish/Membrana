import { useEffect, useState } from 'react';

import { fpr, pct, provenanceStamp, type BenchmarkSummary } from '@/lib/quality';
import { fetchBenchmarkSummary, type QualityFetch } from '@/lib/qualityApi';

/**
 * Борд «Детекторы: trends vs yamnet» (#454, QC2): агрегаты канонического
 * бенчмарк-прогона (матрица ошибок + P/R/FPR/F1) с провенансом в шапке —
 * консилиум quality-control-contour: каждое число несёт происхождение.
 */
export function DetectorCompareBoard() {
  const [result, setResult] = useState<QualityFetch<BenchmarkSummary> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchBenchmarkSummary().then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (result === null) {
    return (
      <div className="flex justify-center py-8" aria-busy="true">
        <span className="loading loading-spinner text-primary" aria-label="Загрузка сводки" />
      </div>
    );
  }
  if (result.state === 'forbidden') {
    return <p role="alert" className="text-sm text-warning">Сводка доступна с уровня «оператор».</p>;
  }
  if (result.state === 'empty') {
    return (
      <p className="text-sm text-base-content/70">
        Office ждёт сводку канонического прогона: журнал в памяти и сбрасывается перезапуском —
        отправить свежую можно командой <code>yarn benchmark:push</code>.
      </p>
    );
  }
  if (result.state === 'error') {
    return <p role="alert" className="text-sm text-error">Office недоступен — сводка не получена. Обновите страницу позже.</p>;
  }

  const { report } = result.data;
  const benchmarked = report.detectors.filter((d) => d.metrics);
  const scaffolds = report.detectors.filter((d) => !d.metrics);

  return (
    <div className="space-y-4">
      <p className="text-sm text-base-content/70">
        Прогон {provenanceStamp(report.generatedAt)} · корпус {report.datasetVersion} ·{' '}
        {report.sampleCount} сэмплов
      </p>
      <div className="overflow-x-auto">
        <table className="table table-sm">
          <thead>
            <tr>
              <th scope="col">Детектор</th>
              <th scope="col">Семья</th>
              <th scope="col">TP</th>
              <th scope="col">FP</th>
              <th scope="col">FN</th>
              <th scope="col">TN</th>
              <th scope="col">P</th>
              <th scope="col">R</th>
              <th scope="col">FPR</th>
              <th scope="col">F1</th>
            </tr>
          </thead>
          <tbody>
            {benchmarked.map((d) => (
              <tr key={d.name}>
                <td className="font-medium">{d.name}</td>
                <td>{d.family}</td>
                <td className="tabular-nums">{d.metrics!.tp}</td>
                <td className="tabular-nums">{d.metrics!.fp}</td>
                <td className="tabular-nums">{d.metrics!.fn}</td>
                <td className="tabular-nums">{d.metrics!.tn}</td>
                <td className="tabular-nums">{pct(d.metrics!.precision)}</td>
                <td className="tabular-nums">{pct(d.metrics!.recall)}</td>
                <td className="tabular-nums">{pct(fpr(d.metrics!))}</td>
                <td className="tabular-nums">{pct(d.metrics!.f1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {scaffolds.length > 0 && (
        <p className="text-xs text-base-content/50">
          Без прогона (scaffold): {scaffolds.map((d) => d.name).join(', ')}.
        </p>
      )}
      <p className="text-xs text-base-content/50">
        Канон выбора «основной vs объяснимый бэкап» — DETECTOR_BENCHMARK.md; борд показывает
        зафиксированный прогон, новые прогоны не запускает.
      </p>
    </div>
  );
}
