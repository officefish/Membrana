/**
 * Проекция тарифной сетки на существующий провод прав
 * (S3 плана интеграции; заседание `tariff-grid`, ратифицировано владельцем 29.07).
 *
 * Вердикт M2: сетка — **единственный автор** прав, а `entitledTariffSkus` —
 * её **проекция**, не источник истины. Имя поля в проводе живёт (потребители не
 * переписываются), но значение выводится из матрицы. **Двойная запись запрещена:**
 * до переключения (шаг S9) значение даёт адаптер от легаси, после — сетка; никогда
 * оба сразу.
 *
 * Инвариант стыка, который стережёт зуб `projection_sync`:
 *   `wire.entitledTariffSkus ≡ P_catalog(grid, sku)`
 *
 * Модуль ЧИСТЫЙ: без fs, сети и Nest — источник данных передаёт вызывающий.
 */

import type { TariffGridDocument, TariffSku } from './tariff-grid';
import { isFullyGranted, resolveEntitlement } from './tariff-resolve';

/** Кто сейчас даёт значение проводу. Ровно один — третьего состояния нет. */
export type ProjectionAuthor = 'grid' | 'legacy';

/** Слепок легаси-носителя: то, что лежит в колонке тарифа сегодня. */
export interface LegacyTariffSnapshot {
  readonly tariffId: string;
  readonly entitledTariffSkus: readonly string[];
}

/** Значение для провода + честное имя автора (кто его дал). */
export interface ProjectedEntitlements {
  readonly tariffId: string;
  readonly entitledTariffSkus: readonly string[];
  readonly author: ProjectionAuthor;
}

/**
 * Каталог-срез матрицы: идентификаторы каталогов, доступных тарифу.
 *
 * Берутся только **полностью доступные** права рода `catalog` — право с
 * невыполненным условием каталога не открывает (вердикт M3: делать можно лишь
 * при `isFullyGranted`). Порядок детерминирован сортировкой: провод не должен
 * дрожать от перестановки ключей в документе.
 */
export function projectCatalogSlice(grid: TariffGridDocument, sku: TariffSku): readonly string[] {
  const out = new Set<string>();
  for (const def of grid?.registry ?? []) {
    if (def.kind !== 'catalog') continue;
    const decision = resolveEntitlement(grid, sku, def.id);
    if (!isFullyGranted(decision)) continue;
    if (decision.value?.kind === 'catalog') out.add(decision.value.catalogId);
  }
  return [...out].sort();
}

/**
 * Адаптер легаси → та же форма, что даёт сетка (anti-corruption, вердикт M8).
 * Нужен до переключения: потребители уже читают одну форму, автор ещё прежний.
 */
export function adaptLegacy(snapshot: LegacyTariffSnapshot): ProjectedEntitlements {
  return {
    tariffId: snapshot.tariffId,
    entitledTariffSkus: [...snapshot.entitledTariffSkus].sort(),
    author: 'legacy',
  };
}

/**
 * ЕДИНСТВЕННАЯ точка, где рождается значение для провода.
 *
 * Автор один и назван явно: включён режим сетки — значение из матрицы, иначе —
 * адаптер легаси. Двойной записи не бывает по построению: функция возвращает
 * одно значение с одним именем автора, а не сливает два источника.
 *
 * @param grid документ сетки (`undefined` — сетки нет, работает легаси)
 * @param snapshot слепок легаси-носителя
 * @param gridMode переключение на сетку как на источник истины (шаг S9)
 */
export function projectEntitlements(
  grid: TariffGridDocument | undefined,
  snapshot: LegacyTariffSnapshot,
  gridMode: boolean,
): ProjectedEntitlements {
  if (!gridMode || !grid) return adaptLegacy(snapshot);
  return {
    tariffId: snapshot.tariffId,
    entitledTariffSkus: projectCatalogSlice(grid, snapshot.tariffId),
    author: 'grid',
  };
}

/** Находка рассинхрона: провод разошёлся с проекцией матрицы. */
export interface ProjectionFinding {
  readonly toothId: 'projection_sync';
  readonly where: string;
  readonly reason: string;
}

/**
 * Зуб `projection_sync`: то, что уехало в провод, обязано совпадать с проекцией
 * матрицы — иначе у прав появился второй автор. Сверяется только в режиме сетки:
 * до переключения легаси законно даёт своё (это и есть адаптер, а не дрейф).
 */
export function projectionFindings(
  grid: TariffGridDocument | undefined,
  wire: ProjectedEntitlements,
): readonly ProjectionFinding[] {
  if (wire.author !== 'grid' || !grid) return [];
  const expected = projectCatalogSlice(grid, wire.tariffId);
  const actual = [...wire.entitledTariffSkus].sort();
  if (expected.length === actual.length && expected.every((v, i) => v === actual[i])) return [];
  return [
    {
      toothId: 'projection_sync',
      where: `${wire.tariffId}.entitledTariffSkus`,
      reason:
        `провод несёт [${actual.join(', ')}], матрица даёт [${expected.join(', ')}] — ` +
        'у прав появился второй автор',
    },
  ];
}
