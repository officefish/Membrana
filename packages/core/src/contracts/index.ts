/**
 * Доменные контракты — общие интерфейсы, на которые опираются модули.
 */

import type { Entity, Id, Result } from '../types/index.js';
import type { DomainError } from '../errors/index.js';

/** Базовый контракт репозитория для произвольной сущности. */
export interface Repository<T extends Entity> {
  findById(id: Id): Promise<Result<T, DomainError>>;
  findAll(): Promise<Result<readonly T[], DomainError>>;
  save(entity: T): Promise<Result<T, DomainError>>;
  delete(id: Id): Promise<Result<void, DomainError>>;
}

/** Подписка на доменные события. */
export interface EventSubscription {
  unsubscribe(): void;
}

/** Шина событий. */
export interface EventBus {
  publish<E extends DomainEvent>(event: E): void;
  subscribe<E extends DomainEvent>(
    type: E['type'],
    handler: (event: E) => void,
  ): EventSubscription;
}

/** Базовое доменное событие. */
export interface DomainEvent {
  readonly type: string;
  readonly occurredAt: number;
  readonly payload: unknown;
}

export type {
  SyncedTimestamp,
  TimeSyncProvider,
  TdoaResult,
} from './acoustic-network.js';
