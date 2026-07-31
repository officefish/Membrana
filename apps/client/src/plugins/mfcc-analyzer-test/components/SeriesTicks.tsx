/**
 * Ход серии клетками: по одной на замер. Образец — `FrameTicks` порогового детектора на
 * быстром преобразовании; взят по слову владельца («у fft плагина были ячейки с галочками,
 * было более наглядно видно как идёт тест»).
 *
 * ЧЕМ ОТЛИЧАЕТСЯ ОТ ОБРАЗЦА, и почему. У образца два исхода замера: прошёл или нет. Здесь их
 * ТРИ — прошёл, не прошёл, немой. Немой не сливается ни с одним из двух: он вообще не
 * судился и в знаменатель серии не идёт. Показать его как «не прошёл» значило бы соврать в
 * пользу строгости, как «прошёл» — в пользу цели; поэтому у него свой знак и свой цвет.
 */
import React from 'react';

import type { MfccFrameResult } from '../types';

export interface SeriesTicksProps {
  readonly total: number;
  readonly taken: readonly MfccFrameResult[];
  readonly isCollecting: boolean;
}

function tone(state: MfccFrameResult['state'] | undefined, isCurrent: boolean): string {
  if (state === 'passed') return 'bg-success/20 border-2 border-success text-success';
  if (state === 'failed') return 'bg-error/20 border-2 border-error text-error';
  if (state === 'silent') return 'bg-base-300 border-2 border-base-content/30 text-base-content/50';
  if (isCurrent) return 'bg-primary/30 border border-primary/50 animate-pulse text-base-content';
  return 'bg-base-300 border border-base-300 text-base-content/40';
}

function mark(state: MfccFrameResult['state'] | undefined, index: number): string {
  if (state === 'passed') return '✓';
  if (state === 'failed') return '✗';
  if (state === 'silent') return '·';
  return String(index + 1);
}

function title(state: MfccFrameResult['state'] | undefined, isCurrent: boolean): string {
  if (state === 'passed') return 'Замер в воротах';
  if (state === 'failed') return 'Замер вне ворот';
  if (state === 'silent') return 'Немой замер — не судился, в знаменатель не идёт';
  return isCurrent ? 'Текущий замер' : 'Ожидание';
}

export const SeriesTicks: React.FC<SeriesTicksProps> = ({ total, taken, isCollecting }) => (
  <div
    className="flex flex-wrap justify-center gap-1"
    role="list"
    aria-label="Ход серии замеров"
  >
    {Array.from({ length: total }).map((_, index) => {
      const state = taken[index]?.state;
      const isCurrent = isCollecting && index === taken.length;
      return (
        <div
          key={index}
          role="listitem"
          aria-label={`Замер ${index + 1} из ${total}: ${title(state, isCurrent)}`}
          title={title(state, isCurrent)}
          className={`flex h-8 w-8 min-h-10 min-w-10 items-center justify-center rounded-md font-mono text-xs tabular-nums transition-all duration-200 ${tone(state, isCurrent)}`}
        >
          {mark(state, index)}
        </div>
      );
    })}
  </div>
);
