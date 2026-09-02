/**
 * СТАБ. Замещает хранилище треков соседнего блока на время изолированной фазы.
 *
 * В производственный граф не входит: ни один непроверочный файл модуля его не импортирует
 * (проверяемо грепом по каталогу). К интеграции — удалить или исключить из сборки; стаб,
 * доживший до прода, есть дефект интеграции (регламент Cowork, п. 3 hard rules).
 *
 * Стаб намеренно держит В ОДНОЙ таблице треки разных приборов и разных мембран: иначе зуб
 * «прибор с мембраной видит только свои треки» не проверял бы ничего.
 */

import type { OwnershipSampleFilter } from '../ownership-scope';
import type {
  OwnershipPageRequest,
  OwnershipSampleReader,
  OwnershipSampleRow,
} from '../ownership-sample-reader';

export interface StubSampleRecord extends OwnershipSampleRow {
  /** Мембрана, которой принадлежит прибор трека. У бесхозного прибора — `null`. */
  readonly membraneId: string | null;
}

export class InMemoryOwnershipSampleReader implements OwnershipSampleReader {
  readonly calls: { count: number; findPage: number } = { count: 0, findPage: 0 };
  readonly seenFilters: OwnershipSampleFilter[] = [];

  constructor(private readonly rows: readonly StubSampleRecord[]) {}

  private match(filter: OwnershipSampleFilter): readonly StubSampleRecord[] {
    return this.rows
      .filter((row) => row.membraneId === filter.membraneId)
      .filter((row) => filter.createdFrom === undefined || row.createdAt >= filter.createdFrom)
      .filter((row) => filter.createdTo === undefined || row.createdAt <= filter.createdTo)
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async count(filter: OwnershipSampleFilter): Promise<number> {
    this.calls.count += 1;
    this.seenFilters.push(filter);
    return this.match(filter).length;
  }

  async findPage(
    filter: OwnershipSampleFilter,
    page: OwnershipPageRequest,
  ): Promise<readonly OwnershipSampleRow[]> {
    this.calls.findPage += 1;
    this.seenFilters.push(filter);
    return this.match(filter)
      .slice(page.skip, page.skip + page.take)
      .map(({ id, deviceId, collectionId, createdAt }) => ({
        id,
        deviceId,
        collectionId,
        createdAt,
      }));
  }
}
