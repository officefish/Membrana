/**
 * Зубы приёмника моста (b2, #1961): форма по контрактам, даты — ISO → Date на границе,
 * идемпотентность повтора, чтение обратно с `stale` по чтению, `collectionId` обязателен.
 * Guard не тестируется здесь — он общий (`ApiTokenGuard`) и у него свой зуб.
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { PluginResultsController } from './plugin-results.controller';
import { assertDtoMatchesContracts, writeRunBodySchema } from './plugin-results.dto';
import { MemoryPluginResultsStore } from './plugin-results.memory-store';
import { PluginResultsService } from './plugin-results.service';
import type { PluginResultsStore } from './plugin-results.types';

const body = (over: Record<string, unknown> = {}) => ({
  run: {
    address: {
      pluginId: 'membrana.handler.mfcc',
      version: '0.1.0',
      collectionId: 'c-field',
      runId: '01a0150f-95e6-718b-bfa7-4ba313511a10',
      mountTarget: 'background-media/collections',
    },
    fingerprints: { inputHash: 'in-1', configHash: 'cfg-1' },
    resumeMode: 'fresh',
    completedAt: '2026-08-19T08:30:00.000Z',
    kind: 'handler',
    summary: { total: 3, detected: 2 },
    ...over,
  },
});

const controller = () => new PluginResultsController(new PluginResultsService(new MemoryPluginResultsStore()));

describe('PluginResultsController — приёмник моста media → office', () => {
  it('принимает RunRecord по контрактам, completedAt становится Date, лишние поля исполнителя не теряются', async () => {
    const c = controller();
    await expect(c.writeRun(body())).resolves.toEqual({ ok: true, runId: '01a0150f-95e6-718b-bfa7-4ba313511a10' });
    const { runs } = await c.readRuns('c-field');
    expect(runs).toHaveLength(1);
    expect(runs[0]!.completedAt).toBeInstanceOf(Date);
    expect(runs[0]!.address.mountTarget).toBe('background-media/collections');
    expect((runs[0] as unknown as { summary: unknown }).summary).toEqual({ total: 3, detected: 2 });
  });

  it('повтор того же runId — не ошибка и не второй документ (идемпотентность у дома)', async () => {
    const c = controller();
    await c.writeRun(body());
    await expect(c.writeRun(body())).resolves.toMatchObject({ ok: true });
    expect((await c.readRuns('c-field')).runs).toHaveLength(1);
  });

  it('stale считается по чтению, не хранится', async () => {
    const c = controller();
    await c.writeRun(body());
    expect((await c.readRuns('c-field', undefined, 'in-1')).runs[0]!.stale).toBe(false);
    expect((await c.readRuns('c-field', undefined, 'in-2')).runs[0]!.stale).toBe(true);
  });

  it('форма не по контрактам — 400 с причиной, а не запись огрызка', async () => {
    const c = controller();
    await expect(c.writeRun(body({ resumeMode: 'maybe' }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(c.writeRun(body({ completedAt: 'вчера' }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(c.writeRun(body({ address: { pluginId: 'x', version: '1', collectionId: 'c', runId: 'r', mountTarget: 'background-devices/devices' } }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(c.writeRun({})).rejects.toBeInstanceOf(BadRequestException);
    expect((await c.readRuns('c-field')).runs).toHaveLength(0);
  });

  it('pluginId вне формы <org>.<kind>.<slug> отвергает СЛУЖБА валидатором пакета — до стора, каким бы стор ни был', async () => {
    // Стор-шпион: если бы валидация жила в сторе, подмена стора её сняла бы молча (ревью PR #1981, блокер #2).
    const calls: string[] = [];
    const spyStore: PluginResultsStore = { writeRun: async (r) => { calls.push(r.address.pluginId); }, readRuns: async () => [] };
    const c = new PluginResultsController(new PluginResultsService(spyStore));
    const rejected = c.writeRun(body({ address: { ...body().run.address, pluginId: 'mfcc-detector' } }));
    await expect(rejected).rejects.toBeInstanceOf(BadRequestException);
    // Именно 400, не 500: служба бросает HttpException, контроллеру перехватывать нечего (ревью PR #1981).
    await expect(rejected).rejects.toMatchObject({ status: 400 });
    expect(calls).toEqual([]);
    await c.writeRun(body());
    expect(calls).toEqual(['membrana.handler.mfcc']);
  });

  it('limit: положительное целое проходит, 0 и мусор не снимают ограничение', async () => {
    const seen: Array<number | undefined> = [];
    const spyStore: PluginResultsStore = { writeRun: async () => {}, readRuns: async (f) => { seen.push(f.limit); return []; } };
    const c = new PluginResultsController(new PluginResultsService(spyStore));
    await c.readRuns('c', undefined, undefined, '5');
    await c.readRuns('c', undefined, undefined, '0');
    await c.readRuns('c', undefined, undefined, 'abc');
    expect(seen).toEqual([5, undefined, undefined]);
  });

  it('чтение без collectionId — 400', async () => {
    await expect(controller().readRuns(undefined)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('StateRecord опционален и проходит вместе с прогоном', () => {
    const parsed = writeRunBodySchema.safeParse({
      ...body(),
      state: { pluginId: 'membrana.handler.mfcc', version: '0.1.0', collectionId: 'c-field', kind: 'state', frozenAt: '2026-08-19T08:30:00.000Z', windowStart: 0, windowEnd: 10, payload: { n: 1 } },
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.state?.frozenAt).toBeInstanceOf(Date);
  });
});

describe('DTO ↔ контракты plugin-contracts (типовой зуб, падает на tsc)', () => {
  it('RunRecordDto присваивается RunRecord, StateRecordDto — StateRecord', () => {
    const parsed = writeRunBodySchema.parse({
      ...body(),
      state: { pluginId: 'membrana.handler.mfcc', version: '0.1.0', collectionId: 'c-field', kind: 'state', frozenAt: '2026-08-19T08:30:00.000Z', windowStart: 0, windowEnd: 10, payload: null },
    });
    const [run, state] = assertDtoMatchesContracts(parsed.run, parsed.state!);
    expect(run.address.runId).toBe(parsed.run.address.runId);
    expect(state.kind).toBe('state');
  });
});
