import type {
  CepstralBreakdown,
  DroneDetectionReport,
  DroneDetectorName,
  HarmonicBreakdown,
  SpectralFluxBreakdown,
  TemplateMatchBreakdown,
} from './types.js';

const DETECTOR_LABELS: Record<DroneDetectorName, string> = {
  harmonic: 'Гармонический (harmonic)',
  cepstral: 'Кепстральный (cepstral)',
  'spectral-flux': 'Спектральный поток (spectral-flux)',
  'template-match': 'Сопоставление шаблонов (template-match)',
};

function tickMark(passed: boolean): string {
  return passed ? 'да' : 'нет';
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function appendHarmonicSection(lines: string[], breakdown: HarmonicBreakdown): void {
  lines.push(`  Агрегация: ${breakdown.aggregation}`);
  if (breakdown.sampleConfidenceThreshold !== undefined) {
    lines.push(`  Порог уверенности: ${formatPercent(breakdown.sampleConfidenceThreshold)}`);
  }
  lines.push(
    '  Кадры:',
    '    № | t (мс) | harmonic score | f0 (Гц) | уверенность | дрон',
    '    --+--------+----------------+---------+-------------+-----',
  );
  for (const row of breakdown.frames) {
    const f0 = row.fundamentalHz !== null ? row.fundamentalHz.toFixed(1) : '—';
    lines.push(
      `    ${row.index + 1} | ${row.timestampMs.toFixed(0)} | ${row.maxHarmonicScore.toFixed(3)} | ${f0} | ${formatPercent(row.confidence)} | ${tickMark(row.isDrone)}`,
    );
  }
}

function appendCepstralSection(lines: string[], breakdown: CepstralBreakdown): void {
  lines.push(`  Агрегация: ${breakdown.aggregation}`);
  if (breakdown.sampleConfidenceThreshold !== undefined) {
    lines.push(`  Порог уверенности: ${formatPercent(breakdown.sampleConfidenceThreshold)}`);
  }
  lines.push(
    '  Кадры:',
    '    № | t (мс) | cepstrum peak | f0 (Гц) | уверенность | дрон',
    '    --+--------+---------------+---------+-------------+-----',
  );
  for (const row of breakdown.frames) {
    const f0 = row.fundamentalHz !== null ? row.fundamentalHz.toFixed(1) : '—';
    lines.push(
      `    ${row.index + 1} | ${row.timestampMs.toFixed(0)} | ${row.cepstrumPeak.toFixed(3)} | ${f0} | ${formatPercent(row.confidence)} | ${tickMark(row.isDrone)}`,
    );
  }
}

function appendSpectralFluxSection(lines: string[], breakdown: SpectralFluxBreakdown): void {
  lines.push(`  Агрегация: ${breakdown.aggregation}`);
  if (breakdown.sampleConfidenceThreshold !== undefined) {
    lines.push(`  Порог уверенности: ${formatPercent(breakdown.sampleConfidenceThreshold)}`);
  }
  lines.push(
    '  Кадры:',
    '    № | t (мс) | flux | low energy % | уверенность | дрон',
    '    --+--------+------+--------------+-------------+-----',
  );
  for (const row of breakdown.frames) {
    lines.push(
      `    ${row.index + 1} | ${row.timestampMs.toFixed(0)} | ${row.flux.toFixed(3)} | ${row.lowEnergyPercent.toFixed(1)} | ${formatPercent(row.confidence)} | ${tickMark(row.isDrone)}`,
    );
  }
}

function appendTemplateMatchSection(lines: string[], breakdown: TemplateMatchBreakdown): void {
  const winner = breakdown.winner;
  const winnerName = winner.templateName ?? winner.templateKey;
  lines.push(
    `  Порог minConfidence: ${formatPercent(breakdown.minConfidence)}`,
    `  Победитель: ${winnerName} (${winner.templateKey})`,
    `  Оценка: ${formatPercent(winner.overallScore)} (spectral ${formatPercent(winner.spectralScore)}, temporal ${formatPercent(winner.temporalScore)})`,
    '  Поля шаблона:',
    '    поле | категория | факт | ожидание | match % | вес',
    '    -----+-----------+------+----------+---------+----',
  );
  for (const field of breakdown.fields) {
    lines.push(
      `    ${field.field} | ${field.category} | ${field.actual} | ${field.expected} | ${field.matchPercent.toFixed(1)} | ${field.weight.toFixed(2)}`,
    );
  }
  if (breakdown.topTemplates.length > 0) {
    lines.push('  Top шаблоны:');
    for (const row of breakdown.topTemplates) {
      const name = row.templateName ?? row.templateKey;
      lines.push(`    - ${name}: ${formatPercent(row.score)}`);
    }
  }
}

export function reportExportBasename(report: DroneDetectionReport): string {
  return `drone-detection-report_${report.meta.reportId}`;
}

export function exportDroneDetectionReportJson(report: DroneDetectionReport): string {
  return JSON.stringify(report, null, 2);
}

export function exportDroneDetectionReportTxt(report: DroneDetectionReport): string {
  const { meta, verdicts } = report;
  const lines: string[] = [
    'Отчёт детекторов дрона',
    '======================',
    '',
    `ID отчёта: ${meta.reportId}`,
    `Создан (МСК): ${meta.createdAtMoscow}`,
    `Создан (UTC): ${meta.createdAtIso}`,
    `Схема: ${meta.schemaVersion}`,
    '',
    'Сэмпл:',
    `  ID: ${meta.sampleId}`,
    `  Название: ${meta.sampleTitle ?? '—'}`,
    `  Частота дискретизации: ${meta.sampleRate} Гц`,
    `  Длительность: ${meta.sampleDurationSec.toFixed(2)} с`,
  ];

  if (meta.groundTruthLabel !== undefined) {
    lines.push(`  Ground truth: ${meta.groundTruthLabel}`);
  }

  lines.push('', 'Вердикты детекторов:', '');

  for (const section of verdicts) {
    lines.push(
      `${DETECTOR_LABELS[section.detectorName]}`,
      `  Итог: ${tickMark(section.isDrone)} | уверенность ${formatPercent(section.confidence)}`,
    );
    if (section.reasoning) {
      lines.push(`  Обоснование: ${section.reasoning}`);
    }

    switch (section.breakdown.kind) {
      case 'harmonic':
        appendHarmonicSection(lines, section.breakdown);
        break;
      case 'cepstral':
        appendCepstralSection(lines, section.breakdown);
        break;
      case 'spectral-flux':
        appendSpectralFluxSection(lines, section.breakdown);
        break;
      case 'template-match':
        appendTemplateMatchSection(lines, section.breakdown);
        break;
      default: {
        const exhaustive: never = section.breakdown;
        throw new Error(`Unknown breakdown kind: ${String(exhaustive)}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadDroneDetectionReport(
  report: DroneDetectionReport,
  format: 'json' | 'txt',
): void {
  const basename = reportExportBasename(report);
  if (format === 'json') {
    downloadTextFile(
      `${basename}.json`,
      exportDroneDetectionReportJson(report),
      'application/json',
    );
    return;
  }
  downloadTextFile(
    `${basename}.txt`,
    exportDroneDetectionReportTxt(report),
    'text/plain',
  );
}
