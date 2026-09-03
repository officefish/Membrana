/**
 * Область выборки по оси владения.
 *
 * Между осью и хранилищем стоит отдельный разряд `none`. Он существует затем, чтобы «прибор без
 * мембраны» никогда не превращался в ПУСТОЙ фильтр: пустой фильтр в любом хранилище раскрывается
 * в «всё», и молчаливая замена одного другим отдала бы чужую библиотеку целиком. `none` до
 * хранилища не доходит вовсе.
 */

import { isOwned, type OwnershipAxis } from './ownership-axis';

/**
 * Окно дат — единственный дополнительный селектор, который M4 даёт наружу помимо scope владения
 * и пагинации. Потолка ширины окна нет осознанно (цена названа в вердикте), поэтому блок его и
 * не выдумывает.
 */
export interface OwnershipTimeWindow {
  readonly createdFrom?: Date;
  readonly createdTo?: Date;
}

/** Фильтр строк по оси владения. Хранилище-нейтральный: ни Prisma, ни SQL. */
export interface OwnershipSampleFilter extends OwnershipTimeWindow {
  readonly membraneId: string;
}

export type OwnershipSelection =
  | { readonly kind: 'query'; readonly filter: OwnershipSampleFilter }
  | { readonly kind: 'none'; readonly reason: 'device-has-no-membrane' };

/**
 * Строит область выборки по уже разрешённой оси.
 *
 * Вход — ось, а не прибор: испортить выборку можно только испортив ось, а порча оси ловится
 * набором `conformance/ownership-conformance.ts`. Второй двери к владельцу здесь нет.
 */
export function selectionForAxis(
  axis: OwnershipAxis,
  window: OwnershipTimeWindow = {},
): OwnershipSelection {
  if (!isOwned(axis)) {
    return Object.freeze({ kind: 'none', reason: 'device-has-no-membrane' } as const);
  }
  const filter: OwnershipSampleFilter = {
    membraneId: axis.membraneId,
    ...(window.createdFrom !== undefined ? { createdFrom: window.createdFrom } : {}),
    ...(window.createdTo !== undefined ? { createdTo: window.createdTo } : {}),
  };
  return Object.freeze({ kind: 'query', filter: Object.freeze(filter) } as const);
}
