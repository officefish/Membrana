/**
 * Сервис оси владения — исполнитель вердикта M1 в слое выборки треков media.
 *
 * Асимметрия, ради которой сервис существует:
 *   ЧИТАТЬ у прибора без мембраны законно — он просто ничего не показывает по этой оси;
 *   ДЕЙСТВОВАТЬ от имени владельца, которого нет, — нельзя, и отказ обязан быть именованным.
 *
 * `MediaDeviceAccessGuard` тут не при чём: он охрана маршрута («предъявлен ли годный токен»),
 * а не носитель логики «чей трек». Носитель — это.
 */

import { Inject, Injectable } from '@nestjs/common';

import {
  assertOwnershipProvenance,
  isOwned,
  resolveDeviceOwnership,
  type DeviceOwnershipRow,
  type OwnershipAxis,
} from './ownership-axis';
import { MembraneOwnerRequiredError } from './ownership-errors';
import { selectionForAxis, type OwnershipTimeWindow } from './ownership-scope';
import {
  OWNERSHIP_SAMPLE_READER,
  type OwnershipSampleReader,
  type OwnershipSampleRow,
} from './ownership-sample-reader';

export interface OwnedSamplesQuery extends OwnershipTimeWindow {
  readonly page: number;
  readonly limit: number;
}

export interface OwnedSamplesPage {
  readonly items: readonly OwnershipSampleRow[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  /**
   * `empty` — не «ничего не нашлось», а «оси владения у прибора нет». Разряды разные, и дверь
   * вольна показать их одинаково; слить их ЗДЕСЬ значило бы потерять различие насовсем.
   */
  readonly scope: 'membrane' | 'empty';
}

@Injectable()
export class LibraryOwnershipService {
  constructor(
    @Inject(OWNERSHIP_SAMPLE_READER) private readonly reader: OwnershipSampleReader,
  ) {}

  /** Ответ «чей трек» — ровно одной дорогой. */
  ownershipOf(device: DeviceOwnershipRow): OwnershipAxis {
    return resolveDeviceOwnership(device);
  }

  /**
   * Выборка по оси владения.
   *
   * Прибор без мембраны → ПУСТОЕ МНОЖЕСТВО, а не отказ. И читатель хранилища при этом не
   * вызывается ни разу: обращения с несуществующим владельцем не бывает даже неудачного.
   */
  async listOwnedSamples(
    device: DeviceOwnershipRow,
    query: OwnedSamplesQuery,
  ): Promise<OwnedSamplesPage> {
    const axis = this.ownershipOf(device);
    assertOwnershipProvenance(axis);

    const page = Math.max(1, Math.trunc(query.page));
    const limit = Math.max(1, Math.trunc(query.limit));
    const selection = selectionForAxis(axis, query);

    if (selection.kind === 'none') {
      return { items: [], total: 0, page, limit, scope: 'empty' };
    }

    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.reader.count(selection.filter),
      this.reader.findPage(selection.filter, { skip, take: limit }),
    ]);
    return { items, total, page, limit, scope: 'membrane' };
  }

  /**
   * Владелец под операцию, которая без него бессмысленна: выдача ключа, счётчик квоты на
   * мембрану, мембранный выключатель срока.
   *
   * Возвращает `membraneId` или бросает. Третьего исхода — тихого `null` — нет намеренно:
   * вызывающий принял бы его за «ничего не нашлось».
   */
  requireMembraneOwner(device: DeviceOwnershipRow, operation: string): string {
    const axis = this.ownershipOf(device);
    assertOwnershipProvenance(axis);
    if (!isOwned(axis)) {
      throw new MembraneOwnerRequiredError(axis.deviceId, operation);
    }
    return axis.membraneId;
  }
}
