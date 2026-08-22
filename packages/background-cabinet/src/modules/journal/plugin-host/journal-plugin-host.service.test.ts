/**
 * Зубы журнала-дома (блок C). Соседей нет: реестр домов настоящий, из пакета контрактов,
 * плагин — стабом-исполнителем здесь же. DoD блока проверяется без блоков A и B.
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { LiveJournalItemRow } from '../live-journal-items.mapper';
import type {
  PluginContext,
  PluginExecutor,
  PluginId,
  PluginManifest,
  RunResult,
} from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };
import { JournalPluginHostService, type JournalEntriesReader } from './journal-plugin-host.service';
import { verifyJournalTask } from './journal-task';

const PLUGIN = 'membrana.showcase.chart-list' as PluginId;

/**
 * Хост, доведённый до готовности. Значения контрактов приезжают динамическим импортом ESM-пакета,
 * поэтому до `onModuleInit` регистрация честно отвечает «не инициализирован», а не молча пропускает.
 */
async function readyHost(rows: readonly LiveJournalItemRow[] = []): Promise<JournalPluginHostService> {
  const host = new JournalPluginHostService(reader(rows));
  await host.onModuleInit();
  return host;
}


const manifest = (over: Partial<PluginManifest> = {}): PluginManifest =>
  ({
    id: PLUGIN,
    version: '0.1.0',
    kind: 'showcase',
    mountTarget: 'background-cabinet/journal',
    triggers: ['journal.entry_created'],
    displayForm: 'row',
    ...over,
  }) as PluginManifest;

/** Стаб плагина: считает вызовы и запоминает контекст. Замещает будущий чарт-лист. */
function stubExecutor(): PluginExecutor & { calls: PluginContext[] } {
  const calls: PluginContext[] = [];
  return {
    calls,
    async execute(ctx: PluginContext): Promise<RunResult> {
      calls.push(ctx);
      return { completedAt: new Date('2026-08-22T12:00:00Z'), kind: 'showcase' };
    },
  };
}

const entry = (id: string, kind: 'track' | 'report' = 'track'): LiveJournalItemRow => ({
  id,
  kind,
  timestamp: Date.parse('2026-08-22T10:00:00Z'),
  clientEntryId: `client-${id}`,
  moduleId: 'microphone',
  moduleName: 'microphone',
  tags: [kind],
  ...(kind === 'track' ? { track: { sampleId: `sample-${id}`, title: `Запись ${id}` } } : { report: {} }),
});

const reader = (rows: readonly LiveJournalItemRow[]): JournalEntriesReader => ({
  listEntries: async () => rows,
});

const ctx = (): PluginContext => ({
  address: {
    pluginId: PLUGIN,
    version: '0.1.0',
    // collectionId у журнала смысла не имеет — открытый вопрос блока, см. EXPECTATIONS.md.
    collectionId: 'journal',
    runId: 'run-1',
    mountTarget: 'background-cabinet/journal',
  },
  fingerprints: { inputHash: 'in', configHash: 'cfg' },
  resumeMode: 'fresh',
  trigger: 'journal.entry_created',
  payload: {},
});

const host = readyHost;

describe('журнал — дом крепления', () => {
  it('дом объявлен именем кабинета, а не офиса', async () => {
    expect((await host()).mountTargetId).toBe('background-cabinet/journal');
  });

  it('регистрирует плагин своего дома', async () => {
    const h = await host();
    h.registerPlugin(manifest(), stubExecutor());
    expect(h.getRegisteredPlugins().map((m) => m.id)).toEqual([PLUGIN]);
  });

  it('манифест с ЧУЖИМ mountTarget отвергается — иначе mountTarget ничего не значит', async () => {
    const h = await host();
    expect(() => h.registerPlugin(manifest({ mountTarget: 'background-media/collections' }), stubExecutor()))
      .toThrow(BadRequestException);
    expect(h.getRegisteredPlugins()).toHaveLength(0);
  });

  it('имя не по форме <org>.<kind>.<slug> отвергается', async () => {
    const h = await host();
    expect(() => h.registerPlugin(manifest({ id: 'chart-list' as PluginId }), stubExecutor()))
      .toThrow(BadRequestException);
  });

  it('включённость — операция реестра: выключенный не зовётся, незнакомый не находится', async () => {
    const h = await host([entry('e1')]);
    const exec = stubExecutor();
    h.registerPlugin(manifest(), exec);
    h.setPluginEnabled(PLUGIN, false);
    await expect(h.request(PLUGIN, 'journal.entry_created', ctx())).rejects.toThrow(BadRequestException);
    expect(() => h.setPluginEnabled('membrana.showcase.nobody' as PluginId, true)).toThrow(NotFoundException);
    expect(exec.calls).toHaveLength(0);
  });

  it('notify зовёт только подписанных на повод и только включённых', async () => {
    const h = await host();
    const subscribed = stubExecutor();
    const other = stubExecutor();
    h.registerPlugin(manifest(), subscribed);
    h.registerPlugin(manifest({ id: 'membrana.showcase.other' as PluginId, triggers: ['collections.sample_added'] }), other);
    h.notify({ trigger: 'journal.entry_created', occurredAt: new Date(), payload: ctx() });
    expect(subscribed.calls).toHaveLength(1);
    expect(other.calls).toHaveLength(0);
  });
});

describe('задание проверяется ДО вызова плагина (К8: ручка не крутит мёртвый регулятор)', () => {
  it('несуществующая запись — отказ именем, плагин не позван', async () => {
    const h = await host([entry('e1')]);
    const exec = stubExecutor();
    h.registerPlugin(manifest(), exec);
    const { verdict } = await h.requestWithTask(PLUGIN, 'journal.entry_created', ctx(), 'u1', {
      entryIds: ['e1', 'ghost'],
      needs: ['entries'],
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('entry-not-found');
    expect(exec.calls).toHaveLength(0);
  });

  it('пустое задание — отказ, а не вызов «ни над чем»', async () => {
    const h = await host([entry('e1')]);
    const exec = stubExecutor();
    h.registerPlugin(manifest(), exec);
    const { verdict } = await h.requestWithTask(PLUGIN, 'journal.entry_created', ctx(), 'u1', {
      entryIds: [],
      needs: ['entries'],
    });
    if (!verdict.ok) expect(verdict.reason).toBe('empty-task');
    expect(exec.calls).toHaveLength(0);
  });

  it('просьба о звуке — отказ: журнал звука не хранит, лента несёт ссылки', async () => {
    const h = await host([entry('e1')]);
    const exec = stubExecutor();
    h.registerPlugin(manifest(), exec);
    const { verdict } = await h.requestWithTask(PLUGIN, 'journal.entry_created', ctx(), 'u1', {
      entryIds: ['e1'],
      needs: ['audio'],
    });
    if (!verdict.ok) {
      expect(verdict.reason).toBe('audio-not-here');
      expect(verdict.detail).toContain('media');
    }
    expect(exec.calls).toHaveLength(0);
  });

  it('годное задание доходит до плагина вместе с записями и составом родов', async () => {
    const h = await host([entry('e1'), entry('e2', 'report')]);
    const exec = stubExecutor();
    h.registerPlugin(manifest(), exec);
    const { verdict, kinds } = await h.requestWithTask(PLUGIN, 'journal.entry_created', ctx(), 'u1', {
      entryIds: ['e1', 'e2'],
      needs: ['entries'],
    });
    expect(verdict.ok).toBe(true);
    expect(kinds).toEqual({ tracks: 1, reports: 1 });
    expect(exec.calls).toHaveLength(1);
    const payload = exec.calls[0]!.payload as { entries: LiveJournalItemRow[]; kinds: unknown };
    expect(payload.entries.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(payload.kinds).toEqual({ tracks: 1, reports: 1 });
  });

  it('чужая запись неотличима от несуществующей — модуль не рассказывает о чужих данных', () => {
    // Лента пользователя пуста: и «нет такой записи», и «есть, но не твоя» дают один отказ.
    const verdict = verifyJournalTask({ entryIds: ['someone-else'], needs: ['entries'] }, []);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toBe('entry-not-found');
  });
});

describe('читатель включённости (адаптер И-4 коворка)', () => {
  it('жилец приходит включённым, и это ВИДНО снаружи, а не только внутри', async () => {
    const host = await readyHost();
    host.registerPlugin(manifest(), stubExecutor());
    expect(host.getPluginStates()).toEqual([{ manifest: manifest(), enabled: true }]);
  });

  it('выключенный отражается выключенным — иначе галочке сайдбара неоткуда взять положение', async () => {
    const host = await readyHost();
    host.registerPlugin(manifest(), stubExecutor());
    host.setPluginEnabled(PLUGIN, false);
    expect(host.getPluginStates()[0]?.enabled).toBe(false);
    host.setPluginEnabled(PLUGIN, true);
    expect(host.getPluginStates()[0]?.enabled).toBe(true);
  });

  it('включённость в манифест не протекает: манифест — ровно пять полей (M5′)', async () => {
    const host = await readyHost();
    host.registerPlugin(manifest(), stubExecutor());
    for (const m of host.getRegisteredPlugins()) expect('enabled' in m).toBe(false);
  });
});
