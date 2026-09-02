/**
 * Порт чтения треков по оси владения.
 *
 * Узкий намеренно. В проекции строки — идентичность и область (`id`, `deviceId`, `collectionId`,
 * `createdAt`) и НИЧЕГО из полезной нагрузки: ни `storageRef`, ни `notes`, ни поля временного
 * ключа. Ось владения отвечает «чей трек и какие треки», а не «чем его открыть»; ключ навешивает
 * дверь поверх уже отобранных строк.
 *
 * `deviceId` и `collectionId` в проекции ЕСТЬ — они адресация и группировка, и наружу они нужны
 * (M2 сохранил внутренние пути). Владельцем они при этом не служат никогда: см.
 * `conformance/ownership-conformance.ts`.
 */

import type { OwnershipSampleFilter } from './ownership-scope';

export interface OwnershipSampleRow {
  readonly id: string;
  readonly deviceId: string;
  readonly collectionId: string;
  readonly createdAt: Date;
}

export interface OwnershipPageRequest {
  readonly skip: number;
  readonly take: number;
}

export interface OwnershipSampleReader {
  count(filter: OwnershipSampleFilter): Promise<number>;
  findPage(
    filter: OwnershipSampleFilter,
    page: OwnershipPageRequest,
  ): Promise<readonly OwnershipSampleRow[]>;
}

/** Токен внедрения. Реализацию вносит сборка, не блок: в изоляции блок Prisma не тянет. */
export const OWNERSHIP_SAMPLE_READER = Symbol.for('membrana.library-ownership.sample-reader');
