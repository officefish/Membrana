/**
 * Перевод адресов ленты в адреса блобов. Блок c5c спринта `chart-list-plugin`.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Объявление интерфейса модуля честно говорит: `deviceId` в элементе ленты
 * ОТСУТСТВУЕТ, а блоб media адресуется парой `(deviceId, sampleId)`. Половина адреса есть в ленте,
 * вторая половина — в таблицах, из которых лента собрана: `mediaDeviceId` лежит и в
 * `TelemetryReport`, и в `TelemetryLiveRecord`. Замерено по схеме, не предположено.
 *
 * ПОЧЕМУ НЕ ДОБАВИТЬ `deviceId` В ЛЕНТУ. Лента — форма показа журнала, и расширять её ради
 * потребности одного плагина значило бы гнуть модуль под плагина — ровно то, что Т1 шторма
 * называет болезнью первого плагина (`session-digest` подогнал под себя дом, канал и род).
 * Перевод живёт у того, кому он нужен.
 *
 * РАЗНЫЕ УСТРОЙСТВА В ОДНОМ ЗАДАНИИ — ЗАКОННЫЙ СЛУЧАЙ. Журнал не ограничен одним устройством, а
 * прогон media идёт по коллекции ОДНОГО устройства. Поэтому перевод отдаёт задания, РАЗБИТЫЕ по
 * устройствам, а не одно: склеить их значило бы измерить чужую коллекцию.
 */

/** Строка-источник: то, что известно о записи ленты до показа. */
export interface EntrySampleRow {
  readonly entryId: string;
  readonly mediaDeviceId: string | null;
  readonly sampleId: string | null;
}

/** Задание одному устройству: его коллекция и набор проб. */
export interface DeviceSampleTask {
  readonly deviceId: string;
  readonly sampleIds: readonly string[];
  /** Обратный перевод: по адресу блоба вернуть адрес записи ленты. */
  readonly entryOf: ReadonlyMap<string, string>;
}

export interface EntrySampleSplit {
  readonly tasks: readonly DeviceSampleTask[];
  /** Записи, у которых звука нет вовсе: род `report` либо трек без пробы. */
  readonly withoutSound: readonly string[];
  /** Записи, у которых нет устройства: адрес блоба неполон, измерить нечем. */
  readonly withoutDevice: readonly string[];
}

/**
 * Разбить записи по устройствам.
 *
 * Отброшенные НЕ исчезают: они возвращаются списками, и вызывающий может сказать человеку, почему
 * из двухсот записей измерено сто семьдесят. Молча уронить их значило бы отдать неполный результат
 * как полный.
 */
export function splitByDevice(rows: readonly EntrySampleRow[]): EntrySampleSplit {
  const byDevice = new Map<string, { sampleIds: string[]; entryOf: Map<string, string> }>();
  const withoutSound: string[] = [];
  const withoutDevice: string[] = [];

  for (const r of rows) {
    if (!r.sampleId) {
      withoutSound.push(r.entryId);
      continue;
    }
    if (!r.mediaDeviceId) {
      withoutDevice.push(r.entryId);
      continue;
    }
    let bucket = byDevice.get(r.mediaDeviceId);
    if (!bucket) {
      bucket = { sampleIds: [], entryOf: new Map() };
      byDevice.set(r.mediaDeviceId, bucket);
    }
    // Повтор пробы в задании — не ошибка вызывающего, а следствие ленты: две записи могут
    // ссылаться на один блоб. Мерить его дважды незачем.
    if (!bucket.entryOf.has(r.sampleId)) {
      bucket.sampleIds.push(r.sampleId);
      bucket.entryOf.set(r.sampleId, r.entryId);
    }
  }

  const tasks = [...byDevice.entries()].map(([deviceId, b]) => ({
    deviceId,
    sampleIds: b.sampleIds,
    entryOf: b.entryOf as ReadonlyMap<string, string>,
  }));
  return { tasks, withoutSound, withoutDevice };
}
