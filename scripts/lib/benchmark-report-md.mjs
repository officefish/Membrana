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

  if (Array.isArray(report.ensembles) && report.ensembles.length > 0) {
    lines.push(...renderEnsembleSection(report));
  }

  // Без хвостового '' — остаток документа за маркером и так начинается с переноса;
  // хвостовой перенос добавлял по пустой строке за каждый прогон (4 к 30.09).
  lines.push('', AUTO_END);
  return lines.join('\n');
}

/**
 * Строки ансамбля — отдельным блоком, а не строками общей таблицы: у них нет задержек
 * (слияние пост-фактум) и другой порог (combinedScore ≥ 0.5 моста, а не собственный
 * порог детектора), и класть их в одну таблицу с одиночными значило бы сравнивать F1 по
 * разным правилам вердикта. ROC-AUC порога не требует — по нему и предикат.
 */
function renderEnsembleSection(report) {
  const ensembles = report.ensembles;
  const num = (v) => (v == null ? '—' : v.toFixed(3));
  const threshold = ensembles[0].threshold;
  const heldOut = ensembles[0].heldOut;
  const fusion = report.ensembleFusion;
  const lines = [
    '',
    '### Ансамбль — слияние пост-фактум (`fuseDetectorConfidences`)',
    '',
    '> Строки ниже НЕ гоняют детекторы заново: сырые confidence одиночных строк выше сливаются',
    '> тем же ядром, что живой ансамбль Студии (`createCombinedStreamDetectors` → `EnsembleProducer`),',
    ...(fusion
      ? [`> судья — экспорт \`${fusion.exportName}\` из \`${fusion.source}\` (замок на поведение: ${fusion.behaviourLock}),`]
      : []),
    '> веса 1 у каждого источника — как в живом коде. `live` = harmonic + cepstral + spectral-flux + yamnet.',
    `> Вердикт для F1 — \`combinedScore ≥ ${threshold}\` (порог моста device-board); \`ROC-AUC\` порога не требует.`,
    '> F1 у `yamnet solo` на этом пороге — не его рабочая точка (clip-score yamnet мал по абсолюту,',
    '> собственный порог 0.01 — строка yamnet выше); сравнимая величина между строками — ROC-AUC.',
    '',
    `#### Весь тот же корпус, что у одиночных строк (${report.sampleCount} файлов)`,
    '',
    '| ансамбль | источники | ROC-AUC | PR-AUC | F1 | P_d | P_fa | TP | FP | FN | TN |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  const row = (e, m) =>
    `| ${e.name} | ${e.sources.join(' + ')} | ${num(m.rocAuc)} | ${num(m.prAuc)} | ${formatPct(m.f1)} | ${formatPct(m.pd)} | ${formatPct(m.pfa)} | ${m.tp} | ${m.fp} | ${m.fn} | ${m.tn} |`;
  for (const e of ensembles) lines.push(row(e, e.metrics));

  if (heldOut) {
    lines.push(
      '',
      `#### Отложенная часть — split: ${heldOut.label} (${heldOut.sampleCount} файлов)`,
      '',
      '> Калибровка DSP (`calibrate-detectors.mjs`) и шаблон DRONE_TIGHT сняты на `train`; эту часть',
      '> они не видели. Порог yamnet 0.01 выбирался по всему корпусу (ND3) — на ROC-AUC это не влияет.',
      '> Веса ансамбля не настраивались ни на чём.',
      '',
      '| ансамбль | источники | ROC-AUC | PR-AUC | F1 | P_d | P_fa | TP | FP | FN | TN |',
      '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    );
    for (const e of ensembles) lines.push(row(e, e.heldOut.metrics));
  } else {
    lines.push('', '> Отложенной части нет: в манифесте ни одной записи со `split: val`.');
  }

  const p = report.ensemblePredicate;
  if (p) {
    const verdict = (c) =>
      c == null
        ? '—'
        : c.liveBeatsSolo === null
          ? 'не посчитан'
          : `live ${num(c.live)} vs yamnet solo ${num(c.yamnetSolo)} → **${c.liveBeatsSolo ? 'live бьёт solo' : 'live НЕ бьёт solo'}**`;
    lines.push(
      '',
      `**Предикат** (назван до чисел, прикидка §5): «${p.rule}». Весь корпус: ${verdict(p.all)}. ` +
        `Отложенная часть: ${verdict(p.heldOut)}. Не бьёт — состав живого списка меняется вторым PR ` +
        '(решение владельца); бьёт — веса остаются, следующий шаг — разметка своих записей.',
    );
  }
  return lines;
}
