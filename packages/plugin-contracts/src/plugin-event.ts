/**
 * Событие повода и три минимальных payload первой волны — M4_VERDICT (#1961).
 *
 * Минимум зафиксирован комнатой (реплика Математика, итоговая таблица): идентификатор объекта
 * и временная метка. Дом при испускании вправе нести больше — контракт называет пол, не потолок.
 * Здесь НЕТ payload для «запроса»: `request` использует тот же `PluginTrigger` и тот же
 * `PluginContext`, отдельного типа повода канал не создаёт.
 */
import type { PluginTrigger } from './triggers.js';

export interface IPluginEvent<T = unknown> {
  readonly trigger: PluginTrigger;
  readonly occurredAt: Date;
  readonly payload: T;
}

export interface JournalEntryCreatedPayload {
  readonly entryId: string;
  readonly occurredAt: Date;
}

export interface CollectionCreatedPayload {
  readonly collectionId: string;
  readonly occurredAt: Date;
}

export interface SampleAddedPayload {
  readonly collectionId: string;
  readonly sampleId: string;
  readonly occurredAt: Date;
}
