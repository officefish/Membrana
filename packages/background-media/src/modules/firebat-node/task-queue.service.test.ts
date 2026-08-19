/**
 * Зубы очереди заданий (b3 firebat-node-device, ADR-0027 Р1/Р4): словарь исходов закрыт; lease
 * из головы; просроченный lease возвращается; сдать можно только взятое; пустая очередь при
 * частом опросе — backoff; переполнение роняет старейшее; пульс — отдельное наблюдение.
 */
import { describe, expect, it } from 'vitest';

import { CAPTURE_LEASE_MARGIN_MS, POLL_OUTCOMES, TASK_KINDS, TASK_STATES, TaskQueueService } from './task-queue.service';

const clock = (startMs = 1_000_000) => {
  let t = startMs;
  return { now: () => new Date(t), tick: (ms: number) => { t += ms; } };
};

describe('TaskQueueService', () => {
  it('словари закрыты: исходы опроса — три имени, состояния — четыре, виды — два', () => {
    expect([...POLL_OUTCOMES]).toEqual(['ok', 'stale_key', 'backoff']);
    expect([...TASK_STATES]).toEqual(['queued', 'leased', 'done', 'failed']);
    expect([...TASK_KINDS]).toEqual(['capture', 'diagnostics']);
  });

  it('enqueue → lease из головы → complete: done; повторный lease — пусто (ok, task null)', () => {
    const c = clock();
    const q = new TaskQueueService({ now: c.now });
    const a = q.enqueue('d1', { kind: 'capture', seconds: 10, collectionId: 'col' });
    const b = q.enqueue('d1', { kind: 'diagnostics' });
    expect(a.outcome).toBe('ok');
    if (a.outcome !== 'ok' || b.outcome !== 'ok') throw new Error('enqueue failed');
    const lease = q.lease('d1');
    expect(lease.outcome).toBe('ok');
    expect(lease.task?.taskId).toBe(a.task.taskId);
    expect(lease.task?.state).toBe('leased');
    const done = q.complete('d1', a.task.taskId, { ok: true, sampleId: 's1' });
    expect(done.outcome).toBe('ok');
    if (done.outcome === 'ok') expect(done.task.state).toBe('done');
    const second = q.lease('d1');
    expect(second.outcome === 'ok' && second.task?.taskId).toBe(b.task.taskId);
    c.tick(10_000);
    const empty = q.lease('d1');
    expect(empty).toEqual({ outcome: 'ok', task: null });
  });

  it('сдать можно только взятое: queued → not_leased; чужой id → unknown_task; ошибка узла → failed', () => {
    const q = new TaskQueueService({ now: clock().now });
    const a = q.enqueue('d1', { kind: 'diagnostics' });
    if (a.outcome !== 'ok') throw new Error('enqueue failed');
    expect(q.complete('d1', a.task.taskId, { ok: true })).toEqual({ outcome: 'not_leased', taskId: a.task.taskId });
    expect(q.complete('d1', 'nope', { ok: true })).toEqual({ outcome: 'unknown_task', taskId: 'nope' });
    q.lease('d1');
    const failed = q.complete('d1', a.task.taskId, { ok: false, error: 'silence guard' });
    expect(failed.outcome === 'ok' && failed.task.state).toBe('failed');
  });

  it('просроченный lease возвращается в queued — узел мог упасть посреди съёмки', () => {
    const c = clock();
    const q = new TaskQueueService({ now: c.now, leaseTtlMs: 30_000 });
    const a = q.enqueue('d1', { kind: 'diagnostics' });
    if (a.outcome !== 'ok') throw new Error('enqueue failed');
    q.lease('d1');
    c.tick(29_000);
    expect(q.lease('d1')).toEqual({ outcome: 'ok', task: null });
    c.tick(2_000);
    const again = q.lease('d1');
    expect(again.outcome === 'ok' && again.task?.taskId).toBe(a.task.taskId);
  });

  it('лизинг capture — от длительности съёмки плюс запас; diagnostics — штатные 30 с (Firebat 19.08: 10 с съёмки не уложились в 30)', () => {
    const c = clock();
    const q = new TaskQueueService({ now: c.now, leaseTtlMs: 30_000 });
    q.enqueue('d1', { kind: 'capture', seconds: 10, collectionId: 'c' });
    q.enqueue('d1', { kind: 'diagnostics' });
    const cap = q.lease('d1');
    if (cap.outcome !== 'ok' || !cap.task) throw new Error('lease failed');
    expect(cap.task.leaseUntil!.getTime() - c.now().getTime()).toBe(10_000 + CAPTURE_LEASE_MARGIN_MS);
    const diag = q.lease('d1');
    if (diag.outcome !== 'ok' || !diag.task) throw new Error('lease failed');
    expect(diag.task.leaseUntil!.getTime() - c.now().getTime()).toBe(30_000);
    c.tick(60_000);
    expect(q.complete('d1', cap.task.taskId, { ok: true, sampleId: 's' }).outcome).toBe('ok');
  });

  it('пустая очередь при частом опросе — backoff с retryAfterMs; редкий опрос — ok/пусто', () => {
    const c = clock();
    const q = new TaskQueueService({ now: c.now, minEmptyPollIntervalMs: 2_000 });
    expect(q.lease('d1')).toEqual({ outcome: 'ok', task: null });
    c.tick(500);
    const hot = q.lease('d1');
    expect(hot.outcome).toBe('backoff');
    if (hot.outcome === 'backoff') expect(hot.retryAfterMs).toBe(2_000);
    c.tick(2_500);
    expect(q.lease('d1')).toEqual({ outcome: 'ok', task: null });
  });

  it('переполнение: потолок по queued — старейшее роняется, его id назван в dropped', () => {
    const q = new TaskQueueService({ now: clock().now, maxQueued: 2 });
    const a = q.enqueue('d1', { kind: 'diagnostics' });
    q.enqueue('d1', { kind: 'diagnostics' });
    const third = q.enqueue('d1', { kind: 'diagnostics' });
    if (a.outcome !== 'ok' || third.outcome !== 'ok') throw new Error('enqueue failed');
    expect(third.dropped).toBe(a.task.taskId);
    expect(q.list('d1').filter((t) => t.state === 'queued')).toHaveLength(2);
  });

  it('очереди устройств независимы; пульс — отдельное наблюдение с последним исходом словом', () => {
    const c = clock();
    const q = new TaskQueueService({ now: c.now });
    q.enqueue('d1', { kind: 'diagnostics' });
    expect(q.lease('d2')).toEqual({ outcome: 'ok', task: null });
    expect(q.lastPulse('d1')).toBeNull();
    const p = q.recordPulse('d1', { pollerVersion: '0.1.0', lastOutcome: 'backoff' });
    expect(q.lastPulse('d1')).toEqual(p);
    expect(p.at).toEqual(c.now());
  });
});
