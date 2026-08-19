/**
 * Очередь заданий полевого узла (ADR-0027 Р1; блок b3 firebat-node-device, #1998).
 *
 * ЭФЕМЕРНАЯ очередь: живёт в процессе media, переживает только процесс — после рестарта
 * оператор повторяет задание (решение резчика 19.08, docs/discussions/firebat-node-device-b3.md).
 * Таблица появится только при требовании переживать рестарт — это будет следующая ревизия.
 *
 * Границы: одна очередь на устройство; потолок MAX_QUEUED заданий (переполнение роняет
 * самое старое queued); lease с TTL — не сданное задание возвращается в queued.
 * Словарь исходов опроса закрыт в ADR-0027 Р4: `ok | stale_key | backoff`. Здесь рождаются
 * `ok` и `backoff` (пустая очередь при частом опросе · переполнение); `stale_key` рождается
 * только в NodeKeyGuard. `backoff` — поле тела ответа, не HTTP-статус.
 */
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export const POLL_OUTCOMES = ['ok', 'stale_key', 'backoff'] as const;
export type PollOutcome = (typeof POLL_OUTCOMES)[number];

export const TASK_STATES = ['queued', 'leased', 'done', 'failed'] as const;
export type TaskState = (typeof TASK_STATES)[number];

/** Закрытый словарь видов заданий этого спринта. Расширение — правкой здесь, не строкой с узла. */
export const TASK_KINDS = ['capture', 'diagnostics'] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export interface NodeTask {
  taskId: string;
  deviceId: string;
  kind: TaskKind;
  /** Для capture: сколько секунд снимать и в какую коллекцию класть. */
  seconds?: number;
  collectionId?: string;
  /** Объявленное оператором — уходит в meta записи как есть (измеренное меряет сервер, #1950). */
  declared?: Record<string, unknown>;
  state: TaskState;
  createdAt: Date;
  leasedAt: Date | null;
  leaseUntil: Date | null;
  finishedAt: Date | null;
  /** Исход исполнения от узла: ok/ошибка словом и ссылка на принятую запись. */
  result: { ok: boolean; sampleId?: string; error?: string } | null;
}

export interface EnqueueInput {
  kind: TaskKind;
  seconds?: number;
  collectionId?: string;
  declared?: Record<string, unknown>;
}

export type LeaseResult =
  | { outcome: 'ok'; task: NodeTask | null }
  | { outcome: 'backoff'; task: null; retryAfterMs: number; reason: 'empty_queue_frequent_poll' };

export type EnqueueResult =
  | { outcome: 'ok'; task: NodeTask; dropped: string | null }
  | { outcome: 'backoff'; reason: 'queue_full'; retryAfterMs: number };

export type CompleteResult =
  | { outcome: 'ok'; task: NodeTask }
  | { outcome: 'not_leased'; taskId: string }
  | { outcome: 'unknown_task'; taskId: string };

export interface TaskQueueOptions {
  maxQueued?: number;
  leaseTtlMs?: number;
  /** Пустой опрос чаще этого интервала → backoff (защита от горячего цикла поллера). */
  minEmptyPollIntervalMs?: number;
  now?: () => Date;
}

export const TASK_QUEUE_DEFAULTS = { maxQueued: 100, leaseTtlMs: 30_000, minEmptyPollIntervalMs: 2_000 } as const;

@Injectable()
export class TaskQueueService {
  private readonly queues = new Map<string, NodeTask[]>();
  private readonly lastEmptyPoll = new Map<string, number>();
  private readonly maxQueued: number;
  private readonly leaseTtlMs: number;
  private readonly minEmptyPollIntervalMs: number;
  private readonly now: () => Date;

  constructor(opts: TaskQueueOptions = {}) {
    this.maxQueued = opts.maxQueued ?? TASK_QUEUE_DEFAULTS.maxQueued;
    this.leaseTtlMs = opts.leaseTtlMs ?? TASK_QUEUE_DEFAULTS.leaseTtlMs;
    this.minEmptyPollIntervalMs = opts.minEmptyPollIntervalMs ?? TASK_QUEUE_DEFAULTS.minEmptyPollIntervalMs;
    this.now = opts.now ?? (() => new Date());
  }

  private queueOf(deviceId: string): NodeTask[] {
    let q = this.queues.get(deviceId);
    if (!q) {
      q = [];
      this.queues.set(deviceId, q);
    }
    return q;
  }

  /** Просроченные lease возвращаются в queued — узел мог упасть посреди съёмки. */
  private reclaimExpired(q: NodeTask[]): void {
    const t = this.now().getTime();
    for (const task of q) {
      if (task.state === 'leased' && task.leaseUntil && task.leaseUntil.getTime() <= t) {
        task.state = 'queued';
        task.leasedAt = null;
        task.leaseUntil = null;
      }
    }
  }

  /** Оператор ставит задание устройству. Переполнение — backoff оператору, самое старое queued роняется только если потолок уже полон queued. */
  enqueue(deviceId: string, input: EnqueueInput): EnqueueResult {
    const q = this.queueOf(deviceId);
    this.reclaimExpired(q);
    const queued = q.filter((x) => x.state === 'queued');
    let dropped: string | null = null;
    if (queued.length >= this.maxQueued) {
      const oldest = queued[0]!;
      q.splice(q.indexOf(oldest), 1);
      dropped = oldest.taskId;
    }
    const task: NodeTask = {
      taskId: randomUUID(),
      deviceId,
      kind: input.kind,
      seconds: input.seconds,
      collectionId: input.collectionId,
      declared: input.declared,
      state: 'queued',
      createdAt: this.now(),
      leasedAt: null,
      leaseUntil: null,
      finishedAt: null,
      result: null,
    };
    q.push(task);
    return { outcome: 'ok', task, dropped };
  }

  /** Узел забирает одно задание из головы очереди; пустая очередь при частом опросе — backoff. */
  lease(deviceId: string): LeaseResult {
    const q = this.queueOf(deviceId);
    this.reclaimExpired(q);
    const next = q.find((x) => x.state === 'queued');
    const nowMs = this.now().getTime();
    if (!next) {
      const last = this.lastEmptyPoll.get(deviceId);
      this.lastEmptyPoll.set(deviceId, nowMs);
      if (last !== undefined && nowMs - last < this.minEmptyPollIntervalMs) {
        return { outcome: 'backoff', task: null, retryAfterMs: this.minEmptyPollIntervalMs, reason: 'empty_queue_frequent_poll' };
      }
      return { outcome: 'ok', task: null };
    }
    this.lastEmptyPoll.delete(deviceId);
    next.state = 'leased';
    next.leasedAt = new Date(nowMs);
    next.leaseUntil = new Date(nowMs + this.leaseTtlMs);
    return { outcome: 'ok', task: next };
  }

  /** Узел сдаёт результат. Сдать можно только взятое (leased) задание. */
  complete(deviceId: string, taskId: string, result: NonNullable<NodeTask['result']>): CompleteResult {
    const q = this.queueOf(deviceId);
    this.reclaimExpired(q);
    const task = q.find((x) => x.taskId === taskId);
    if (!task) return { outcome: 'unknown_task', taskId };
    if (task.state !== 'leased') return { outcome: 'not_leased', taskId };
    task.state = result.ok ? 'done' : 'failed';
    task.finishedAt = this.now();
    task.result = result;
    task.leaseUntil = null;
    return { outcome: 'ok', task };
  }

  /** Снимок очереди устройства для оператора (и зубов). */
  list(deviceId: string): NodeTask[] {
    const q = this.queueOf(deviceId);
    this.reclaimExpired(q);
    return [...q];
  }

  /** Пульс — отдельное наблюдение (ADR-0027 леммы): «узел жив», не задание и не запись. */
  private readonly pulses = new Map<string, NodePulse>();

  recordPulse(deviceId: string, info: Omit<NodePulse, 'deviceId' | 'at'>): NodePulse {
    const pulse: NodePulse = { deviceId, at: this.now(), ...info };
    this.pulses.set(deviceId, pulse);
    return pulse;
  }

  lastPulse(deviceId: string): NodePulse | null {
    return this.pulses.get(deviceId) ?? null;
  }
}

export interface NodePulse {
  deviceId: string;
  at: Date;
  /** Версия поллера на узле и последний исход опроса — словами словаря, не числами. */
  pollerVersion?: string;
  lastOutcome?: PollOutcome;
  note?: string;
}
