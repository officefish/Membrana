/**
 * Зубы ручек узла (b3): оператор ставит только словарные задания; узел берёт и сдаёт; результат с
 * файлом идёт в SamplesService.upload той же коллекции; без файла — failed со словом; сдача
 * невзятого — отказ; heartbeat пишет пульс. Сервис записей подменён — сети и базы нет.
 */
import { describe, expect, it, vi } from 'vitest';

import { FirebatNodeController } from './firebat-node.controller';
import { TaskQueueService } from './task-queue.service';

const make = () => {
  const queue = new TaskQueueService({ now: () => new Date('2026-08-19T13:00:00Z') });
  const upload = vi.fn(async () => ({ id: 'sample-1' }));
  const ctl = new FirebatNodeController(queue, { upload } as never);
  return { queue, upload, ctl };
};

const multipart = (opts: { file?: { buffer: Buffer; mimetype: string; meta?: string }; body?: Record<string, unknown> }) =>
  ({
    file: async () =>
      opts.file
        ? {
            toBuffer: async () => opts.file!.buffer,
            mimetype: opts.file!.mimetype,
            fields: opts.file!.meta !== undefined ? { meta: { value: opts.file!.meta } } : {},
          }
        : undefined,
    body: opts.body,
  }) as never;

describe('FirebatNodeController', () => {
  it('оператор: вид задания вне словаря — отказ; capture без seconds/collectionId — отказ', () => {
    const { ctl } = make();
    expect(() => ctl.enqueue('d1', { kind: 'dance' as never })).toThrow(/kind must be one of/u);
    expect(() => ctl.enqueue('d1', { kind: 'capture', collectionId: 'c' })).toThrow(/seconds/u);
    expect(() => ctl.enqueue('d1', { kind: 'capture', seconds: 5 })).toThrow(/collectionId/u);
  });

  it('узел: берёт задание, сдаёт файл → upload в коллекцию задания, задание done с sampleId', async () => {
    const { ctl, upload } = make();
    const put = ctl.enqueue('d1', { kind: 'capture', seconds: 5, collectionId: 'col-1', declared: { what: 'drone' } });
    if (put.outcome !== 'ok') throw new Error('enqueue failed');
    const lease = ctl.lease('d1');
    expect(lease.outcome).toBe('ok');
    if (lease.outcome !== 'ok' || !lease.task) throw new Error('lease failed');
    expect(lease.task.declared).toEqual({ what: 'drone' });

    const res = await ctl.result('d1', lease.task.taskId, multipart({ file: { buffer: Buffer.from('RIFF'), mimetype: 'audio/wav', meta: '{"notes":"x"}' } }));
    expect(upload).toHaveBeenCalledWith('d1', 'col-1', Buffer.from('RIFF'), 'audio/wav', { notes: 'x' });
    expect(res.task.state).toBe('done');
    expect(res.task.result).toEqual({ ok: true, sampleId: 'sample-1' });
  });

  it('узел: без файла — failed со словом ошибки; сдача невзятого — отказ; чужой taskId — 404', async () => {
    const { ctl, upload } = make();
    const put = ctl.enqueue('d1', { kind: 'diagnostics' });
    if (put.outcome !== 'ok') throw new Error('enqueue failed');
    await expect(ctl.result('d1', put.task.taskId, multipart({}))).rejects.toThrow(/not leased/u);
    ctl.lease('d1');
    const res = await ctl.result('d1', put.task.taskId, multipart({ body: { error: 'silence guard' } }));
    expect(res.task.state).toBe('failed');
    expect(res.task.result).toEqual({ ok: false, error: 'silence guard' });
    expect(upload).not.toHaveBeenCalled();
    await expect(ctl.result('d1', 'ghost', multipart({}))).rejects.toThrow(/unknown/u);
  });

  it('heartbeat пишет пульс, снимок оператора показывает очередь и пульс', () => {
    const { ctl } = make();
    const hb = ctl.heartbeat('d1', { pollerVersion: '0.1.0', lastOutcome: 'ok' });
    expect(hb.outcome).toBe('ok');
    const snap = ctl.snapshot('d1');
    expect(snap.pulse?.pollerVersion).toBe('0.1.0');
    expect(snap.tasks).toEqual([]);
  });
});
