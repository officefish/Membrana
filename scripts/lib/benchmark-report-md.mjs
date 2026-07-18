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

  lines.push('', AUTO_END, '');
  return lines.join('\n');
}
