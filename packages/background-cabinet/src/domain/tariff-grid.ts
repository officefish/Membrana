/**
 * Тарифная сетка — носитель прав (заседание `tariff-grid`, ратифицировано владельцем 29.07).
 *
 * Сетка НЕ набор колонок на тарифе, а versioned декларативный контракт:
 * `EntitlementRegistry` (какие права вообще бывают) + матрица `SKU × entitlementId`.
 * Истина живёт на сервере — этот пакет и есть её автор (вердикт M1: home = сервер).
 * Клиент получает проекцию и читает её чистой функцией (`resolveEntitlement` — шаг S2).
 *
 * **Пять родов права** живут закрытым union'ом, а не сводятся к числу или флагу.
 * Роды разной природы: право вызвать инструмент проверяется в момент вызова, право
 * производить — в момент создания и НИКОГДА в момент существования (вердикт M5).
 *
 * **Deny-by-default:** нет ячейки, неизвестный id, несовпадение рода → права нет.
 * Полнота обязательна: для каждого тарифа и каждого объявленного права — ячейка
 * (зуб `matrix_complete`). Пустая клетка не «пока не решили», а дыра в контракте.
 *
 * Размещение: домен кабинета, а не `@membrana/core` — правки core закрыты профилем
 * разрешений сессии. Форма нужна и клиенту, но приходит она туда **проекцией по
 * проводу** (S2/S3), а не общим импортом: клиент не автор сетки (вердикт M2).
 * Модуль ЧИСТЫЙ: без Nest, fs и сети — иначе его нельзя ни проверить, ни переиспользовать.
 */

/** Идентификатор тарифа (SKU): `free-v1`, `checkpoint-v1`, `observatory-v1`. */
export type TariffSku = string;

/** Идентификатор права в реестре: `storage.hot`, `instrument.mfcc`, `produce.own`. */
export type EntitlementId = string;

/** Род права. Закрытый список: новый род — правка контракта, а не тихое поле. */
export type EntitlementKind = 'quota' | 'catalog' | 'instrument' | 'gated' | 'produce';

/** Единица потолка. Закрытая: «штуки» и «байты» ведут себя по-разному. */
export type QuotaUnit = 'bytes' | 'count';

/** Виды производимого пользователем — ограничитель права `produce` (вердикт M5). */
export type ProduceScope = 'dataset_index' | 'own_detection' | 'scenario_on_own';

/** Числовой потолок: устройства, объём памяти, число пользовательских сценариев. */
export interface QuotaValue {
  readonly kind: 'quota';
  /** Потолок. Матрица задаёт ТОЛЬКО его; занятое — серверное состояние (вердикт M4). */
  readonly limit: number;
  readonly unit: QuotaUnit;
}

/** Ссылка на каталог: словарь звуков, набор системных сценариев. */
export interface CatalogValue {
  readonly kind: 'catalog';
  readonly catalogId: string;
}

/** Инструмент: узел, плагин, анализатор. Право вызова, проверяется при вызове. */
export interface InstrumentValue {
  readonly kind: 'instrument';
  readonly enabled: boolean;
}

/**
 * Возможность с предусловием: право по тарифу есть, но применимо лишь при
 * выполненном условии (пеленг — при построенной сети). Факт условия считает
 * СВОЙ контур, не сетка: здесь только ссылка (вердикт M3).
 */
export interface GatedValue {
  readonly kind: 'gated';
  readonly enabled: boolean;
  readonly preconditionId: string;
}

/**
 * Право производить своё: индексировать датасет, строить сценарии на своих
 * детекциях. Способность, а не квота: числом не ограничивается (для числа —
 * отдельная строка рода `quota`). Пустой `scope` = все известные виды.
 */
export interface ProduceValue {
  readonly kind: 'produce';
  readonly enabled: boolean;
  readonly scope?: readonly ProduceScope[];
}

/** Значение ячейки матрицы — один из пяти родов. */
export type EntitlementValue =
  | QuotaValue
  | CatalogValue
  | InstrumentValue
  | GatedValue
  | ProduceValue;

/** Определение права в реестре: что это и какого оно рода. */
export interface EntitlementDefinition {
  readonly id: EntitlementId;
  readonly kind: EntitlementKind;
  /** Ключ подписи для витрины: UI не выдумывает имя из id. */
  readonly titleKey: string;
  /** Зачем право существует — читает человек, не машина. */
  readonly description?: string;
}

/** Реестр: какие права вообще бывают. Ячейка вне реестра — неизвестный id. */
export type EntitlementRegistry = readonly EntitlementDefinition[];

/** Строка матрицы: права одного тарифа. */
export interface TariffGridRow {
  readonly sku: TariffSku;
  /** Продуктовое имя («Датчик»); id — машинное, имя — человеческое. */
  readonly productName: string;
  /** Ранг для сравнения тарифов: повышение — рост ранга (вердикт M6). */
  readonly rank: number;
  readonly cells: Readonly<Record<EntitlementId, EntitlementValue>>;
}

/** Документ сетки целиком — то, что автор пишет, а проекция отражает. */
export interface TariffGridDocument {
  /** Версия формы. Смена — ломающее изменение контракта, не косметика. */
  readonly version: number;
  readonly registry: EntitlementRegistry;
  readonly rows: readonly TariffGridRow[];
}

/** Имена зубов формы — вердикт M7 требует называть зуб при каждом срабатывании. */
export type TariffGridToothId =
  | 'matrix_complete'
  | 'unknown_entitlement_id'
  | 'kind_mismatch'
  | 'grid_shape';

/** Находка проверки формы: имя зуба + адрес + человеческая причина. */
export interface TariffGridFinding {
  readonly toothId: TariffGridToothId;
  readonly where: string;
  readonly reason: string;
}

/** Соответствует ли значение объявленному роду. */
export function valueMatchesKind(value: EntitlementValue | undefined, kind: EntitlementKind): boolean {
  return value?.kind === kind;
}

/**
 * Проверка формы документа — основание зубов `matrix_complete`,
 * `unknown_entitlement_id`, `kind_mismatch`, `grid_shape`.
 *
 * Находки возвращаются ПОИМЁННО, а не булевым «плохо»: молчаливый отказ и
 * молчаливый зелёный запрещены одинаково. Пустой массив = форма честна.
 */
export function validateTariffGrid(doc: TariffGridDocument): readonly TariffGridFinding[] {
  const findings: TariffGridFinding[] = [];

  if (
    doc == null ||
    typeof doc !== 'object' ||
    !Array.isArray((doc as TariffGridDocument).rows) ||
    !Array.isArray((doc as TariffGridDocument).registry)
  ) {
    return [
      {
        toothId: 'grid_shape',
        where: '(документ)',
        reason: 'документ сетки не несёт registry и rows — форма нечитаема',
      },
    ];
  }

  const kindById = new Map<EntitlementId, EntitlementKind>();
  for (const def of doc.registry) {
    if (kindById.has(def.id)) {
      findings.push({
        toothId: 'grid_shape',
        where: `registry.${def.id}`,
        reason: 'право объявлено в реестре дважды — id обязан быть уникален',
      });
    }
    kindById.set(def.id, def.kind);
  }

  const seenSku = new Set<TariffSku>();
  for (const row of doc.rows) {
    if (seenSku.has(row.sku)) {
      findings.push({
        toothId: 'grid_shape',
        where: `rows.${row.sku}`,
        reason: 'тариф встречается в матрице дважды',
      });
    }
    seenSku.add(row.sku);

    const cells: Readonly<Record<EntitlementId, EntitlementValue>> = row.cells ?? {};

    // Полнота: право объявлено — ячейка обязана быть у КАЖДОГО тарифа.
    for (const def of doc.registry) {
      if (!(def.id in cells)) {
        findings.push({
          toothId: 'matrix_complete',
          where: `${row.sku}.${def.id}`,
          reason: 'ячейки нет: право объявлено в реестре, но у тарифа не заполнено',
        });
        continue;
      }
      if (!valueMatchesKind(cells[def.id], def.kind)) {
        findings.push({
          toothId: 'kind_mismatch',
          where: `${row.sku}.${def.id}`,
          reason: `род ячейки «${cells[def.id]?.kind}» ≠ род реестра «${def.kind}»`,
        });
      }
    }

    // Обратная сторона: ячейка без определения — неизвестный id.
    for (const id of Object.keys(cells)) {
      if (!kindById.has(id)) {
        findings.push({
          toothId: 'unknown_entitlement_id',
          where: `${row.sku}.${id}`,
          reason: 'ячейка ссылается на право, которого нет в реестре',
        });
      }
    }
  }

  return findings;
}

/** Полна и честна ли форма — короткий предикат поверх находок. */
export function isTariffGridValid(doc: TariffGridDocument): boolean {
  return validateTariffGrid(doc).length === 0;
}

/** Строка тарифа по SKU. `undefined` — не бросаем: решение принимает вызывающий. */
export function findRow(doc: TariffGridDocument, sku: TariffSku): TariffGridRow | undefined {
  return doc.rows.find((r) => r.sku === sku);
}
