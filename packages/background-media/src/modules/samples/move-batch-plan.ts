/**
 * Планировщик массового вывоза проб из буфера в набор — чистая функция, без базы и без Nest.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫМ ФАЙЛОМ. «Поместится 70%» — не ответ, пока не сказано КАКИЕ 70%. Порядок
 * переноса и отбор влезающих — единственная содержательная часть этой работы, и она обязана
 * быть проверяема без прибора, без прода и без Prisma. Сервис ниже (`SamplesService.moveBatch`)
 * только читает строки и применяет решение, принятое здесь.
 *
 * ================= КОНТРАКТ ПОРЯДКА (закреплён зубом `move-batch-plan.test.ts`) =================
 *
 * 1. ПОРЯДОК ПЕРЕНОСА — СТАРЕЙШИЕ ПЕРВЫМИ: `createdAt` по возрастанию, при равенстве времени —
 *    `sampleId` по возрастанию лексикографически. Ровно так, не «как отдал драйвер базы».
 *
 *    Почему старейшие: буфер прибора — архив вещдоков, а не очередь. Проба, дожившая в буфере
 *    до полной остановки, уже доказала, что её никто не убрал; свежая запись — чаще шум
 *    последних минут. Вывозим то, что дороже потерять.
 *
 *    Почему `sampleId` вторым ключом, а не «и так не бывает»: 1057 проб прибора `9e86ec85`
 *    писались очередями, и совпадение метки времени у двух проб — обычное дело, а не край.
 *    Без второго ключа сортировка не определена, и dryRun с настоящим прогоном имели бы право
 *    разойтись на равных временах. Это и есть та щель, через которую окно показало бы человеку
 *    одно множество, а перенеслось бы другое.
 *
 * 2. НЕ ВЛЕЗШАЯ ПРОБА НЕ ЗАПИРАЕТ ОЧЕРЕДЬ. Проба, не влезающая в остаток оси, остаётся с
 *    причиной `no-space`, а обход ПРОДОЛЖАЕТСЯ: следующая, поменьше, поедет. Так вывозится
 *    больше байт за одно действие — ровно то, чего просил владелец («перенести все»).
 *    Правило «остановиться на первой не влезшей» было бы проще на словах, но оставляло бы
 *    место незанятым при одной крупной пробе в начале.
 *
 * 3. ОДНО МНОЖЕСТВО НА ДВА ПРОГОНА. Функция чистая и не смотрит на `dryRun`: при неизменном
 *    состоянии оси и тех же входах план и исполнение выбирают одно и то же множество
 *    побайтово. `dryRun` в сервисе решает лишь, применять ли результат, а не как считать.
 *
 * 4. МЕСТО СУДИТ ОДИН ПРЕДИКАТ. Вместимость проверяется `axisRefuses` из
 *    `buffer-overflow-refusal.ts` — тем же, что отбивает загрузку одиночной пробы. Второго
 *    судьи одного инварианта здесь нет намеренно: два судьи — это два контракта.
 */
import { axisRefuses, type QuotaAxis } from './buffer-overflow-refusal';

/**
 * Потолок пачки за один вызов — ОБЪЯВЛЕН, а не подразумевается: он уезжает в ответе полем
 * `maxBatch`, чтобы окно умело листать, не угадывая предел по 400-й ошибке.
 *
 * Число выбрано выше живого случая (1057 проб прибора `9e86ec85`), чтобы вывоз полного буфера
 * младшего тарифа проходил одним действием — листание понадобится лишь тарифу, которого ещё
 * нет. Потолок нужен не производительностью (перенос идёт одним `updateMany`, см. сервис), а
 * границей входа: неограниченный список адресов — это открытая дверь для запроса на миллион
 * строк.
 */
export const MAX_MOVE_BATCH_SAMPLES = 2000;

/** Причина, по которой проба осталась в буфере. Закрытый набор — UI разбирает по нему. */
export const MOVE_BATCH_STAY_REASONS = ['no-space', 'not-found', 'not-in-buffer'] as const;
export type MoveBatchStayReason = (typeof MOVE_BATCH_STAY_REASONS)[number];

/** Строка базы в том виде, в каком её судит планировщик: адрес, вес, время, где лежит. */
export interface MoveBatchRow {
  readonly sampleId: string;
  readonly sizeBytes: number;
  /** Время создания. Миллисекунды эпохи — сравнение без часовых поясов и без `Date`-арифметики. */
  readonly createdAtMs: number;
  /** Лежит ли проба СЕЙЧАС в буфере прибора (`collection.kind === 'buffer'`). */
  readonly inBuffer: boolean;
}

export interface MoveBatchStay {
  readonly sampleId: string;
  readonly reason: MoveBatchStayReason;
}

export interface MoveBatchPlanNumbers {
  readonly willMove: number;
  readonly willStay: number;
  readonly moveBytes: number;
  readonly stayBytes: number;
}

export interface MoveBatchDecision {
  /** Адреса в ПОРЯДКЕ ПЕРЕНОСА — старейшие первыми. */
  readonly moveIds: readonly string[];
  readonly stayed: readonly MoveBatchStay[];
  readonly plan: MoveBatchPlanNumbers;
}

/**
 * Решение о пачке: кто поедет, кто останется и почему.
 *
 * `requested` читается в порядке заказа; повтор адреса в списке — один и тот же предмет, и
 * второй раз он не считается (иначе `willStay` соврал бы числом). Порядок `stayed`: сперва
 * ненайденные и не-из-буфера в порядке заказа, затем `no-space` в порядке переноса — тоже
 * детерминированный, чтобы ответ двух одинаковых вызовов совпадал побайтово.
 *
 * `stayBytes` считается только по тем, чей вес сервер знает: у `not-found` веса нет, и
 * придумывать ноль как «вес» нельзя — он бы утонул в сумме молча. Такие пробы входят в
 * `willStay` счётом, но не в `stayBytes` байтами.
 */
export function planMoveBatch(input: {
  readonly requested: readonly string[];
  readonly rows: ReadonlyMap<string, MoveBatchRow>;
  readonly targetAxis: QuotaAxis;
}): MoveBatchDecision {
  const seen = new Set<string>();
  const candidates: MoveBatchRow[] = [];
  const stayed: MoveBatchStay[] = [];

  for (const sampleId of input.requested) {
    if (seen.has(sampleId)) continue;
    seen.add(sampleId);
    const row = input.rows.get(sampleId);
    if (!row) {
      stayed.push({ sampleId, reason: 'not-found' });
      continue;
    }
    if (!row.inBuffer) {
      // Уже вывезена (в том числе прошлым вызовом этой же пачки) или никогда не была в буфере.
      // Молчаливый пропуск здесь был бы ложью в числах: человек просил её перенести.
      stayed.push({ sampleId, reason: 'not-in-buffer' });
      continue;
    }
    candidates.push(row);
  }

  // Порядок переноса. Сравнение полное: при равном времени решает адрес — сортировка
  // определена на любых входах, и два прогона не имеют права разойтись.
  candidates.sort(
    (a, b) =>
      a.createdAtMs - b.createdAtMs ||
      (a.sampleId < b.sampleId ? -1 : a.sampleId > b.sampleId ? 1 : 0),
  );

  const moveIds: string[] = [];
  const noSpace: MoveBatchStay[] = [];
  let usedBytes = input.targetAxis.usedBytes;

  for (const row of candidates) {
    const axisNow: QuotaAxis = { usedBytes, limitBytes: input.targetAxis.limitBytes };
    if (axisRefuses(axisNow, row.sizeBytes)) {
      noSpace.push({ sampleId: row.sampleId, reason: 'no-space' });
      continue;
    }
    moveIds.push(row.sampleId);
    usedBytes += row.sizeBytes;
  }

  const allStayed = [...stayed, ...noSpace];
  return {
    moveIds,
    stayed: allStayed,
    // Числа считает `tallyMoveBatch` — тот же счёт, которым сервис отчитывается о РЕАЛЬНОМ
    // исходе. Одна арифметика на план и на итог: иначе «влезет 740» и «перенесено 740»
    // складывались бы двумя разными сложениями и имели бы право разойтись.
    plan: tallyMoveBatch(moveIds, allStayed, input.rows),
  };
}

/**
 * Счёт по готовому разделению. Единственное место, где складываются байты пачки.
 *
 * `stayBytes` — только по тем, чей вес сервер знает. У `not-found` веса нет, и подставлять ноль
 * нельзя: он утонул бы в сумме молча и «осталось 0 байт» читалось бы как «всё вывезено».
 * Такие пробы входят в `willStay` счётом, но не в `stayBytes` байтами.
 */
export function tallyMoveBatch(
  moved: readonly string[],
  stayed: readonly MoveBatchStay[],
  rows: ReadonlyMap<string, MoveBatchRow>,
): MoveBatchPlanNumbers {
  let moveBytes = 0;
  for (const sampleId of moved) moveBytes += rows.get(sampleId)?.sizeBytes ?? 0;
  let stayBytes = 0;
  for (const stay of stayed) stayBytes += rows.get(stay.sampleId)?.sizeBytes ?? 0;
  return { willMove: moved.length, willStay: stayed.length, moveBytes, stayBytes };
}
