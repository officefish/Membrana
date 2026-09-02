/**
 * Исполняемые стабы СОСЕДЕЙ — строго в своей зоне (правило изоляции 3 регламента коворка).
 *
 * Замещают то, чего в стволе нет и что блок `key-ttl` строить не вправе: блок настроек срока в
 * кабинете, хранилище ключа мембраны (`prisma/schema.prisma` — общий файл) и строку списка
 * проб, которую собирает соседний блок контракта.
 *
 * Стабы в интеграционную ветку не мёржатся; стаб, доживший до прода, — дефект интеграции.
 */
import type {
  TrackKeySecretRecord,
  TrackKeyStore,
  TrackKeyTtlSettingsStore,
} from '../track-key.generator';
import type { StoredTrackKeyTtl } from '../track-key-ttl';

/**
 * Снимок настроек срока по мембранам. Ключ словаря — ТОЛЬКО `membraneId`: второй оси
 * (набор, род, проба) в стабе нет намеренно — её нет и в вердикте M3.
 */
export function stubSettingsStore(
  byMembrane: Record<string, StoredTrackKeyTtl> = {},
): TrackKeyTtlSettingsStore & { set(membraneId: string, value: StoredTrackKeyTtl): void } {
  const table = new Map<string, StoredTrackKeyTtl>(Object.entries(byMembrane));
  return {
    async read(membraneId: string): Promise<StoredTrackKeyTtl> {
      // Отсутствие записи — законное состояние: человек не открывал блок настроек.
      return table.has(membraneId) ? table.get(membraneId) : undefined;
    },
    set(membraneId: string, value: StoredTrackKeyTtl): void {
      table.set(membraneId, value);
    },
  };
}

/** Хранилище секрета мембраны в памяти — замещает таблицу, которой в стволе нет. */
export function stubKeyStore(): TrackKeyStore & { snapshot(): TrackKeySecretRecord[] } {
  const table = new Map<string, TrackKeySecretRecord>();
  return {
    async read(membraneId: string): Promise<TrackKeySecretRecord | null> {
      return table.get(membraneId) ?? null;
    },
    async createIfAbsent(record: TrackKeySecretRecord): Promise<TrackKeySecretRecord> {
      // Тело без `await` внутри — значит неделимо относительно других задач: стаб держит ту
      // же атомарность, которую в проде даст уникальный ключ таблицы.
      const existing = table.get(record.membraneId);
      if (existing) return existing;
      table.set(record.membraneId, record);
      return record;
    },
    async replace(record: TrackKeySecretRecord): Promise<void> {
      table.set(record.membraneId, record);
    },
    snapshot(): TrackKeySecretRecord[] {
      return [...table.values()];
    },
  };
}

/** Род набора в media — приёмный лоток это `buffer` (prisma `CollectionKind`). */
export type StubCollectionKind = 'buffer' | 'user' | 'system';

/**
 * Строка списка проб — то, во что соседний блок контракта кладёт ключ. Имя поля с ключом
 * здесь НЕ назначается (запрещено до Phase 3): стаб несёт только то, что нужно блоку `key-ttl`,
 * то есть на какой пробе какого рода набора выдаётся ссылка.
 */
export interface StubSampleRow {
  readonly id: string;
  readonly collectionId: string;
  readonly collectionKind: StubCollectionKind;
  readonly membraneId: string | null;
}

export const stubSampleRow = (over: Partial<StubSampleRow> = {}): StubSampleRow => ({
  id: 'sample-1',
  collectionId: 'named-set',
  collectionKind: 'user',
  membraneId: 'membrane-1',
  ...over,
});

/** Детерминированные часы: владелец времени — вызывающий, не машина. */
export function fixedClock(start: string | Date): (() => Date) & { advance(seconds: number): void } {
  let at = new Date(start).getTime();
  const clock = (): Date => new Date(at);
  return Object.assign(clock, {
    advance(seconds: number): void {
      at += seconds * 1000;
    },
  });
}
