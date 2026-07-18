import { formatMs, formatPct } from './benchmark-metrics.mjs';

const AUTO_START = '<!-- BENCHMARK:auto:start -->';
const AUTO_END = '<!-- BENCHMARK:auto:end -->';

/**
 * @param {string} existingMd
 * @param {{ generatedAt: string; datasetVersion: string; detectors: object[] }} report
 */
export function patchDetectorBenchmarkMd(existingMd, report) {
  const block = renderAutoBlock(report);
  if (!existingMd.includes(AUTO_START) || !existingMd.includes(AUTO_END)) {
    throw new Error(
      `DETECTOR_BENCHMARK.md must contain ${AUTO_START} and ${AUTO_END}`,
    );
  }
  const start = existingMd.indexOf(AUTO_START);
  const end = existingMd.indexOf(AUTO_END) + AUTO_END.length;
  return `${existingMd.slice(0, start)}${block}${existingMd.slice(end)}`;
}

function renderAutoBlock(report) {
  // Ярлык сплита обязан быть честным: до ADR-0006 строка печаталась как
  // «test-split: N файлов» даже когда test-сплита в манифесте нет вовсе и
  // мерился весь корпус, включая train.
  const splitLabel = report.splitFallback
    ? `ВЕСЬ корпус (test-split отсутствует): ${report.sampleCount} файлов`
    : `test-split: ${report.sampleCount} файлов`;
  const cfg = report.config;
  const configLine =
    cfg == null
      ? null
      : cfg.mode === 'live'
        ? `> **Конфигурация:** боевая (\`${cfg.source}\`)` +
          (cfg.detectorsCalibrated?.length
            ? ` — калиброваны: ${cfg.detectorsCalibrated.join(', ')}`
            : '')
        : `> **Конфигурация:** ⚠ ОТЛАДОЧНАЯ — ${cfg.source}; не поведение боевой поверхности`;

  const lines = [
    AUTO_START,
    '',
    `> **Автогенерация:** \`yarn benchmark:detectors\` · ${report.generatedAt}`,
    `> **Датасет:** ${report.datasetVersion} · ${splitLabel}`,
    ...(configLine ? [configLine] : []),
    ...(report.splitFallback
      ? ['> **⚠ Внимание:** цифры получены НЕ на тестовом сплите — корпус содержит train-сэмплы.']
      : []),
    '',
    '### Результаты последнего прогона',
    '',
    '| name | family | TP | FP | FN | TN | precision | recall | F1 | latency p50 (ms) | latency p95 (ms) | статус |',
    '|------|--------|----|----|----|----|-----------|--------|-----|------------------|------------------|--------|',
  ];

  // Приор-независимый блок печатается ПОСЛЕ основной таблицы, чтобы не менять
  // её форму: гейт 85/90 живёт на precision/recall и правится отдельным
  // решением владельца, а не побочным эффектом этой правки.

  for (const d of report.detectors) {
    const m = d.metrics;
    if (m == null) {
      lines.push(
        `| ${d.name} | ${d.family} | — | — | — | — | — | — | — | — | — | ${d.status} |`,
      );
      continue;
    }
    lines.push(
      `| ${d.name} | ${d.family} | ${m.tp} | ${m.fp} | ${m.fn} | ${m.tn} | ${formatPct(m.precision)} | ${formatPct(m.recall)} | ${formatPct(m.f1)} | ${formatMs(m.latencyP50Ms)} | ${formatMs(m.latencyP95Ms)} | ${d.status} |`,
    );
  }

  const scored = report.detectors.filter((d) => d.metrics?.pfa != null);
  if (scored.length > 0) {
    lines.push(
      '',
      '### Приор-независимые метрики',
      '',
      '> `P_d` и `P_fa` считаются ВНУТРИ своего класса и от состава корпуса не зависят.',
      '> `ROC-AUC` тоже приор-независима; `PR-AUC` — нет, её можно сравнивать только',
      '> между прогонами с одинаковым балансом (доля дронов в этом прогоне указана ниже).',
      '',
      '| name | P_d (recall) | P_d 95% CI | P_fa | P_fa 95% CI | ROC-AUC | PR-AUC |',
      '| --- | --- | --- | --- | --- | --- | --- |',
    );
    for (const d of scored) {
      const m = d.metrics;
      const ci = (v) => (v == null ? '—' : `${formatPct(v.low)}–${formatPct(v.high)}`);
      const num = (v) => (v == null ? '—' : v.toFixed(3));
      lines.push(
        `| ${d.name} | ${formatPct(m.pd)} | ${ci(m.pdCI)} | ${formatPct(m.pfa)} | ${ci(m.pfaCI)} | ${num(m.rocAuc)} | ${num(m.prAuc)} |`,
      );
    }

    const share = scored[0].metrics.positiveShare;
    const ladder = scored[0].metrics.precisionByPrior ?? [];
    if (ladder.length > 0) {
      lines.push(
        '',
        `Доля дронов в прогоне: **${formatPct(share)}** — PR-AUC выше относится к этому балансу.`,
        '',
        '#### Precision как функция приора',
        '',
        '> Precision СМЕШИВАЕТ классы, поэтому одной цифры не существует: она зависит от',
        '> того, как часто дрон встречается в потоке. Рабочую точку выбирает владелец —',
        '> код приор НЕ назначает. Ряд ниже пересчитан из `P_d`/`P_fa` этого прогона.',
        '',
        `| name | ${ladder.map((p) => p.ratio).join(' | ')} |`,
        `| --- | ${ladder.map(() => '---').join(' | ')} |`,
      );
      for (const d of scored) {
        const row = d.metrics.precisionByPrior ?? [];
        lines.push(`| ${d.name} | ${row.map((p) => formatPct(p.precision)).join(' | ')} |`);
      }
    }
  }

  lines.push('', AUTO_END, '');
  return lines.join('\n');
}
