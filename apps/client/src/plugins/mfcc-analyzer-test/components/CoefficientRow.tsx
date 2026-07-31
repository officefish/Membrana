/**
 * Строка одного кепстрального коэффициента: номер, коридор калибровки и — у судимых —
 * положение замеренного значения внутри коридора.
 *
 * Спринт `mfcc-plugin-sprint`, блок `mfcc-plugin-ui-screen` (верстальщик).
 *
 * РЕШЕНИЕ ВЕРСТАЛЬЩИКА: коридоры показываются ВСЕ двадцать четыре, судимые выделены. «Четыре
 * видны с первого взгляда, остальные — для проверки, что их не забыли». Показать только
 * четыре значило бы спрятать главный результат калибровки: что их отобрали из двадцати
 * четырёх.
 *
 * ТОЛЬКО ЧТЕНИЕ, И ЭТО ВИДНО ПО ФОРМЕ. У порогового детектора на быстром преобразовании
 * границы правятся полями ввода. Здесь нельзя: пресет приходит калибровкой и меняется через
 * git. Поэтому коридор нарисован ДОРОЖКОЙ, а не полем — «паттерн документа, который читается
 * как факт, а не как управляемое». Отключённое поле ввода читалось бы как «поле, которое
 * почему-то не редактируется», то есть как поломка.
 *
 * ТОЧКИ У НЕСУДИМЫХ НЕТ, И НЕ ПОТОМУ ЧТО СПРЯТАЛИ. Кадр несёт значения ТОЛЬКО судимых
 * коэффициентов (`judgedValues` в порядке `judgedCoefficients`) — остальные не измерялись,
 * раз в счёт не идут. Пустая дорожка честна: значения нет, а не оно скрыто.
 */
import React from 'react';

export interface CoefficientRowProps {
  readonly index: number;
  readonly min: number;
  readonly max: number;
  /** Замеренное значение. `null` — коэффициент не судится, значения нет. */
  readonly value: number | null;
  readonly isJudged: boolean;
}

/** Положение значения на дорожке в долях её ширины; за краями — прижато к краю. */
function positionInBand(value: number, min: number, max: number): number {
  if (!(max > min)) return 0.5;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

export const CoefficientRow: React.FC<CoefficientRowProps> = ({
  index,
  min,
  max,
  value,
  isJudged,
}) => {
  const inBand = value !== null && value >= min && value <= max;
  const label =
    value === null
      ? `Коэффициент ${index}, не судится, коридор от ${min.toFixed(1)} до ${max.toFixed(1)}`
      : `Коэффициент ${index}, судится, значение ${value.toFixed(1)}, ` +
        `коридор от ${min.toFixed(1)} до ${max.toFixed(1)}, ` +
        (inBand ? 'в коридоре' : 'вне коридора');

  return (
    <div
      className={`flex items-center gap-1.5 px-1 py-0.5 rounded ${
        isJudged ? 'bg-base-content/5 font-semibold' : ''
      }`}
      aria-label={label}
    >
      <span className="w-8 shrink-0 text-[10px] tabular-nums text-base-content/60">
        {isJudged ? '◆' : ' '}c{index}
      </span>

      {/* Дорожка коридора. aria-hidden: всё сказано в aria-label строки, дублировать нечего. */}
      <span
        className="relative h-1.5 flex-1 rounded-full bg-base-content/10"
        aria-hidden="true"
      >
        {value !== null && (
          <span
            className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
              inBand ? 'bg-success' : 'bg-error'
            }`}
            style={{ left: `${positionInBand(value, min, max) * 100}%` }}
          />
        )}
      </span>

      <span className="w-24 shrink-0 text-right text-[10px] tabular-nums text-base-content/40">
        {min.toFixed(1)}…{max.toFixed(1)}
      </span>
      <span
        className={`w-12 shrink-0 text-right text-[10px] tabular-nums ${
          value === null ? 'text-base-content/25' : inBand ? 'text-success' : 'text-error'
        }`}
      >
        {value === null ? '—' : value.toFixed(1)}
      </span>
    </div>
  );
};
