/**
 * ИНТЕГРАЦИОННЫЙ СМОУК — единый сценарий контракта фазы 3 коворка `cowork-server-plugin-pages`,
 * серверная половина (шаги 1,2,3,5,7 и форма провода).
 *
 * Зачем отдельно от зубов блока: зубы блока проверяют дом сам по себе, а здесь проверяется
 * ПРОХОЖДЕНИЕ данных через швы — от регистрации до того вида, в котором жилец уезжает на страницу.
 * Клиентская половина того же сценария — `apps/cabinet/src/plugins/adapters/wire-smoke.test.ts`;
 * связывает их одна и та же форма провода, выписанная здесь литералом.
 */
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { LiveJournalItemRow } from '../live-journal-items.mapper';
import { JournalPluginHostService, type JournalEntriesReader } from './journal-plugin-host.service';
import { JournalPluginsController } from './journal-plugins.controller';
import type { PluginExecutor, PluginId, PluginManifest } from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };

const CHART_LIST = 'membrana.showcase.chart-list' as PluginId;
const ZONE_MAP = 'membrana.showcase.zone-map-one' as PluginId;
const MFCC = 'membrana.handler.mfcc' as PluginId;

const reader = (rows: readonly LiveJournalItemRow[] = []): JournalEntriesReader => ({
  listEntries: async () => rows,
});

const showcase = (id: PluginId, displayForm: string): PluginManifest =>
  ({
    id,
    version: '0.1.0',
    kind: 'showcase',
    mountTarget: 'background-cabinet/journal',
    triggers: ['journal.entry_created'],
    displayForm,
  }) as unknown as PluginManifest;

const handler = (id: PluginId): PluginManifest =>
  ({
    id,
    version: '0.1.0',
    kind: 'handler',
    mountTarget: 'background-cabinet/journal',
    triggers: ['journal.entry_created'],
    windowSize: 4,
  }) as unknown as PluginManifest;

const executor = (): PluginExecutor & { calls: number } => {
  const box = {
    calls: 0,
    async execute() {
      box.calls += 1;
      return { completedAt: new Date('2026-08-22T12:00:00Z'), kind: 'showcase' as const };
    },
  };
  return box as PluginExecutor & { calls: number };
};

async function ready(): Promise<JournalPluginHostService> {
  const host = new JournalPluginHostService(reader());
  await host.onModuleInit();
  return host;
}

describe('интеграционный смоук: журнал → провод → страница (серверная половина)', () => {
  it('шаг 1: showcase своего дома принимается', async () => {
    const host = await ready();
    expect(() => host.registerPlugin(showcase(CHART_LIST, 'row'), executor())).not.toThrow();
  });

  it('шаг 2: тот же манифест с чужим домом отвергается при регистрации', async () => {
    const host = await ready();
    const foreign = { ...showcase(CHART_LIST, 'row'), mountTarget: 'background-media/collections' } as PluginManifest;
    expect(() => host.registerPlugin(foreign, executor())).toThrow(BadRequestException);
  });

  it('шаг 3: жилец виден снаружи включённым — состояние читается, а не только пишется', async () => {
    const host = await ready();
    host.registerPlugin(showcase(CHART_LIST, 'row'), executor());
    expect(host.getPluginStates()).toEqual([
      { manifest: showcase(CHART_LIST, 'row'), enabled: true },
    ]);
  });

  it('шаг 5: выключенного дом больше не зовёт живым каналом', async () => {
    const host = await ready();
    const exec = executor();
    host.registerPlugin(showcase(CHART_LIST, 'row'), exec);
    host.notify({ trigger: 'journal.entry_created', payload: {} } as never);
    const afterEnabled = exec.calls;
    host.setPluginEnabled(CHART_LIST, false);
    host.notify({ trigger: 'journal.entry_created', payload: {} } as never);
    expect(exec.calls).toBe(afterEnabled);
    expect(host.getPluginStates()[0]?.enabled).toBe(false);
  });

  it('шаг 7: форма вне умений страницы регистрацию НЕ отменяет — дом форм не судит', async () => {
    const host = await ready();
    host.registerPlugin(showcase(ZONE_MAP, 'zone-map'), executor());
    expect(host.getPluginStates().map((s) => s.manifest.id)).toContain(ZONE_MAP);
  });

  it('форма провода: контроллер отдаёт манифест и включённость РЯДОМ, не внутри манифеста', async () => {
    const host = await ready();
    host.registerPlugin(showcase(CHART_LIST, 'row'), executor());
    host.registerPlugin(handler(MFCC), executor());
    const wire = new JournalPluginsController(host).list();

    expect(wire.mountTarget).toBe('background-cabinet/journal');
    expect(wire.plugins).toHaveLength(2);
    for (const p of wire.plugins) {
      expect('enabled' in p).toBe(true);
      expect('enabled' in (p.manifest as object)).toBe(false);
    }
    // Дом отдаёт ВСЕХ жильцов, включая handler: кого показывать — решает страница, не дом.
    expect((wire.plugins[1]?.manifest as PluginManifest).kind).toBe('handler');
  });

  it('переключение через провод доходит до дома', async () => {
    const host = await ready();
    host.registerPlugin(showcase(CHART_LIST, 'row'), executor());
    const controller = new JournalPluginsController(host);
    controller.setEnabled(CHART_LIST, { enabled: false });
    expect(host.getPluginStates()[0]?.enabled).toBe(false);
  });
});
