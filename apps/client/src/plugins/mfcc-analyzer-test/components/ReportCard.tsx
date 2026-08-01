/**
 * Карточка вердикта. Спринт `mfcc-plugin-sprint`, блок `mfcc-plugin-ui-screen` (верстальщик).
 *
 * ГЛАВНОЕ РЕШЕНИЕ ВЕРСТАЛЬЩИКА, ради которого карточка вообще отдельным файлом: оговорки
 * живут ВНУТРИ бокса вердикта, а не под ним. «Никогда не в модалке». Зелёная плашка «ЦЕЛЬ
 * ОБНАРУЖЕНА» с оговорками, свёрнутыми в мелкий серый текст ниже, формально показывает всё,
 * а фактически прочитано будет только зелёное.
 *
 * Цвет бокса берётся по УВЕРЕННОСТИ, а не по вердикту. Обнаружение при низкой уверенности
 * не зелёное: зелёный цвет — это утверждение, и утверждать здесь нечего. Сегодня, пока
 * `situationsCalibrated: false`, потолок уверенности — «средняя», и потому зелёного на
 * экране не будет вовсе. Это не недоделка вёрстки, это состояние калибровки, сделанное
 * видимым.
 */
import React from 'react';

import type { MfccReportConfidence, MfccTestReport } from '../buildMfccTestReport';

const VERDICT_WORD: Record<MfccTestReport['verdict'], string> = {
  detected: 'ЦЕЛЬ ОБНАРУЖЕНА',
  not_detected: 'ЦЕЛИ НЕТ',
  inconclusive: 'СУДИТЬ НЕ ПО ЧЕМУ',
};

const CONFIDENCE_WORD: Record<MfccReportConfidence, string> = {
  high: 'уверенность высокая',
  medium: 'уверенность средняя',
  low: 'уверенность низкая',
};

/** Цвет — по уверенности. Зелёное только там, где есть что утверждать. */
function boxTone(report: MfccTestReport): string {
  if (report.verdict === 'inconclusive') return 'border-base-content/30 bg-base-300/50';
  if (report.confidence === 'high') return 'border-success bg-success/10';
  if (report.confidence === 'medium') return 'border-warning bg-warning/10';
  return 'border-base-content/40 bg-base-200/70';
}

export interface ReportCardProps {
  readonly report: MfccTestReport;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report }) => {
  const { summary } = report;

  return (
    <section
      className={`rounded-lg border p-3 space-y-2 ${boxTone(report)}`}
      aria-label={`Вердикт: ${VERDICT_WORD[report.verdict]}, ${CONFIDENCE_WORD[report.confidence]}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold tracking-wide">{VERDICT_WORD[report.verdict]}</span>
        <span className="text-[11px] font-semibold uppercase text-base-content/70">
          {CONFIDENCE_WORD[report.confidence]}
        </span>
      </div>

      <p className="text-xs text-base-content/80">{report.reasoning}</p>

      {report.warnings.length > 0 && (
        <ul
          // Ограничение по высоте, а не сворачивание: список прокручивается, но не исчезает.
          // Три дня подряд читать стену предупреждений никто не станет — поэтому высота
          // ограничена; но ни одна оговорка не спрятана за нажатием.
          className="max-h-24 overflow-y-auto rounded bg-base-100/60 p-2 space-y-1 text-[10px] leading-snug text-base-content/70"
          aria-label="Оговорки к вердикту"
        >
          {report.warnings.map((w) => (
            <li key={w} className="flex gap-1">
              <span aria-hidden="true">·</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="grid grid-cols-3 gap-2 text-[10px] text-base-content/60">
        <div>
          <dt className="uppercase tracking-wide">Прошло</dt>
          <dd className="tabular-nums">
            {summary.passedFrames}/{summary.judgedFrames} ({(summary.passRate * 100).toFixed(0)}%)
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Немых</dt>
          <dd className="tabular-nums">
            {summary.silentFrames}/{summary.totalFrames} ({(summary.silentRate * 100).toFixed(0)}%)
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide">Порог тишины</dt>
          <dd className="tabular-nums">
            {report.magnitudeFloorUsed > 0 ? report.magnitudeFloorUsed.toFixed(3) : 'не замерен'}
          </dd>
        </div>
      </dl>

      <p className="text-[10px] text-base-content/40 tabular-nums">
        настройки свёртки: {report.configHash} · уровень: {report.strictnessUsed}
      </p>
    </section>
  );
};
