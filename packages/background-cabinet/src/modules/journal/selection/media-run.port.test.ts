/**
 * Зубы перевода адресов и порта заказа. Блок c5c спринта `chart-list-plugin`.
 *
 * Сети нет: `fetch` приходит параметром. Под проверкой не транспорт, а два утверждения — что
 * разные устройства не склеиваются в один прогон, и что отсутствие измеренного не превращается
 * в пустую выборку.
 */
import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { splitByDevice, type EntrySampleRow } from './entry-samples';
import { MediaRunPort, type MediaRunCaller } from './media-run.port';

const row = (over: Partial<EntrySampleRow> = {}): EntrySampleRow => ({
  entryId: 'e1',
  mediaDeviceId: 'd1',
  sampleId: 's1',
  ...over,
});

describe('перевод адресов ленты в адреса блобов', () => {
  it('записи одного устройства собираются в одно задание', () => {
    const r = splitByDevice([row({ entryId: 'e1', sampleId: 's1' }), row({ entryId: 'e2', sampleId: 's2' })]);
    expect(r.tasks).toHaveLength(1);
    expect(r.tasks[0]?.sampleIds).toEqual(['s1', 's2']);
  });

  it('разные устройства НЕ склеиваются — прогон media идёт по коллекции одного', () => {
    const r = splitByDevice([
      row({ entryId: 'e1', mediaDeviceId: 'd1', sampleId: 's1' }),
      row({ entryId: 'e2', mediaDeviceId: 'd2', sampleId: 's2' }),
    ]);
    expect(r.tasks).toHaveLength(2);
    expect(r.tasks.map((t) => t.deviceId).sort()).toEqual(['d1', 'd2']);
  });

  it('обратный перевод есть: по адресу блоба возвращается адрес записи', () => {
    const r = splitByDevice([row({ entryId: 'запись-7', sampleId: 'проба-7' })]);
    expect(r.tasks[0]?.entryOf.get('проба-7')).toBe('запись-7');
  });

  it('запись без звука отброшена, но НАЗВАНА — иначе неполный результат сойдёт за полный', () => {
    const r = splitByDevice([row({ entryId: 'отчёт', sampleId: null })]);
    expect(r.tasks).toHaveLength(0);
    expect(r.withoutSound).toEqual(['отчёт']);
  });

  it('запись без устройства названа отдельно: адрес блоба неполон, а причина другая', () => {
    const r = splitByDevice([row({ entryId: 'ничей', mediaDeviceId: null })]);
    expect(r.withoutDevice).toEqual(['ничей']);
    expect(r.withoutSound).toEqual([]);
  });

  it('две записи на один блоб мерятся ОДИН раз', () => {
    const r = splitByDevice([
      row({ entryId: 'e1', sampleId: 'общая' }),
      row({ entryId: 'e2', sampleId: 'общая' }),
    ]);
    expect(r.tasks[0]?.sampleIds).toEqual(['общая']);
  });
});

const config = {
  mediaApiUrl: 'https://media.example/',
  internalToken: 'внутренний',
  bufferCollectionId: '__buffer__',
};

const task = splitByDevice([row()]).tasks[0]!;

const okBody = {
  runId: 'run-1',
  result: {
    candidates: [{ sampleId: 's1', deltaDb: 20, peakDb: -10, flatness: 0.05, structure: 'tonal', durationSec: 1, features: {} }],
    floor: { value: 0.01, measured: true },
    refusal: null,
  },
};

/** Подменённый разговор с media: сети нет, проверяется порт, а не транспорт. */
const respond = (status: number, body: unknown): MediaRunCaller => ({
  async requestPluginRun() {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  },
});

describe('порт заказа', () => {
  it('ненастроенный порт ОТКАЗЫВАЕТ, а не отдаёт пустую выборку', async () => {
    const port = new MediaRunPort({ ...config, internalToken: '' }, respond(200, okBody));
    await expect(port.measure(task)).rejects.toThrow(ServiceUnavailableException);
  });

  it('заказ адресован устройством, буфером и ИМЕНЕМ ИЗМЕРИТЕЛЯ', async () => {
    let seen: { deviceId: string; collectionId: string; pluginId: string; body: unknown } | null = null;
    const port = new MediaRunPort(config, {
      async requestPluginRun(deviceId, collectionId, pluginId, body) {
        seen = { deviceId, collectionId, pluginId, body };
        return new Response(JSON.stringify(okBody), { status: 200 });
      },
    });
    await port.measure(task);
    expect(seen!.deviceId).toBe('d1');
    expect(seen!.collectionId).toBe('__buffer__');
    expect(seen!.pluginId).toBe('membrana.report.chart-list-measure');
    expect(seen!.body).toEqual({ sampleIds: ['s1'] });
  });

  it('транспорта порт не держит: заголовки и база — забота общего разговора с media', async () => {
    const src = await import('node:fs').then((fs) =>
      fs.readFileSync(new URL('./media-run.port.ts', import.meta.url), 'utf8'),
    );
    // Зуб сети считает голые fetch в серверной зоне; порт обязан оставаться пустым по транспорту.
    expect(src.includes('fetch(')).toBe(false);
  });

  it('измеренное приходит ответом прогона', async () => {
    const port = new MediaRunPort(config, respond(200, okBody));
    const out = await port.measure(task);
    expect(out.runId).toBe('run-1');
    expect(out.candidates).toHaveLength(1);
    expect(out.floor.measured).toBe(true);
  });

  it('прогон БЕЗ измеренного — отказ, а не ноль кандидатов', async () => {
    // 200 без result: измеритель мог не отработать. Пустая выборка соврала бы о материале.
    const port = new MediaRunPort(config, respond(200, { runId: 'run-2' }));
    await expect(port.measure(task)).rejects.toThrow(/без измеренного/);
  });

  it('отказ media поднимается наверх, а не глотается', async () => {
    const port = new MediaRunPort(config, respond(400, { message: 'формы задания не сочетаются' }));
    await expect(port.measure(task)).rejects.toThrow(ServiceUnavailableException);
  });

  it('причина отказа измерителя доходит до вызывающего', async () => {
    const port = new MediaRunPort(
      config,
      respond(200, { runId: 'run-3', result: { candidates: [], floor: { value: 0, measured: false }, refusal: { reason: 'floor-not-measured' } } }),
    );
    const out = await port.measure(task);
    expect(out.refusalReason).toBe('floor-not-measured');
    expect(out.floor.measured).toBe(false);
  });
});
