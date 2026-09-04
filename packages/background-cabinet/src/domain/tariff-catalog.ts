/**
 * КАТАЛОГ ВЫБИРАЕМЫХ ТАРИФОВ (#2281).
 *
 * Витрина отвечает на один вопрос: «что владелец мембраны может выбрать прямо сейчас». Ответ не
 * совпадает ни с одним из двух списков по отдельности, и это несущее наблюдение:
 *
 * - в СЕТКЕ (`docs/tariffs/tariff-grid.json`) живут ранг и продуктовое имя; по ней судит
 *   `decideTransition`, и тариф без строки в сетке отказывается как `unknown_target_tariff`;
 * - в БАЗЕ живут числа и внешний ключ `Membrane.tariffId`; тариф без строки в базе нельзя
 *   присвоить вообще — запись упала бы нарушением ссылочной целостности, то есть пятисоткой.
 *
 * Показать объединение значило бы предложить выбор, который откажет или сломается. Поэтому
 * каталог — ПЕРЕСЕЧЕНИЕ, и расхождение двух списков не прячется, а выпадает из витрины.
 *
 * Модуль ЧИСТЫЙ: ни базы, ни файловой системы. Пересечение — это правило, а не запрос.
 */
import { type TariffGridDocument } from './tariff-grid';

/** Тариф в базе — ровно те поля, которые витрина показывает. */
export interface TariffRecord {
  readonly id: string;
  readonly userStorageQuotaBytes: bigint;
  readonly bufferQuotaBytes: bigint;
  readonly maxNodesPerMembrane: number;
  readonly maxUserWorkspaces: number;
}

/** Строка витрины. Числа — строками: `bigint` не переживает JSON. */
export interface TariffCatalogItem {
  readonly id: string;
  /** Человеческое имя из сетки — она автор продуктовых имён, база хранит машинный id. */
  readonly name: string;
  readonly rank: number;
  /** Тариф мембраны на момент запроса. */
  readonly current: boolean;
  readonly userStorageQuotaBytes: string;
  readonly bufferQuotaBytes: string;
  readonly maxNodesPerMembrane: number;
  readonly maxUserWorkspaces: number;
}

/**
 * Витрина: тарифы, существующие И в сетке, И в базе, по возрастанию ранга.
 *
 * Текущий тариф помечается, но НЕ вычёркивается: витрина обязана показать, где владелец стоит.
 * Отказ на попытку выбрать его же — дело домена перехода (`same_tariff`), а не витрины; вычеркни
 * его здесь — и второе мнение о том же правиле разъехалось бы с первым.
 */
export function buildTariffCatalog(
  grid: TariffGridDocument,
  records: readonly TariffRecord[],
  currentTariffId: string,
): TariffCatalogItem[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  return grid.rows
    .flatMap((row) => {
      const record = byId.get(row.sku);
      if (!record) return [];
      return [
        {
          id: row.sku,
          name: row.productName,
          rank: row.rank,
          current: row.sku === currentTariffId,
          userStorageQuotaBytes: record.userStorageQuotaBytes.toString(),
          bufferQuotaBytes: record.bufferQuotaBytes.toString(),
          maxNodesPerMembrane: record.maxNodesPerMembrane,
          maxUserWorkspaces: record.maxUserWorkspaces,
        },
      ];
    })
    .sort((a, b) => a.rank - b.rank);
}
