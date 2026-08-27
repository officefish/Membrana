/**
 * Зубы склейки источников жильцов (#2204).
 *
 * Предмет: страница показывает жильцов СВОЕГО дома и рядом чужого — управление буфером живёт
 * в доме media, а нужно и на странице журнала. Разница включённостей несущая, и эти зубы
 * стерегут именно её: переключение местного НЕ должно уезжать чужому дому, переключение
 * домового — должно уезжать своему.
 */
import { describe, expect, it, vi } from 'vitest';

import { withLocalTenants, type PagePluginSource } from './pagePluginSource';
import type { HomePluginState } from './adapters/manifestToPagePlugin';

function manifest(id: string) {
  return {
    id,
    version: '0.1.0',
    kind: 'showcase',
    mountTarget: 'background-cabinet/journal',
    triggers: [],
    displayForm: 'table',
    description: id,
  };
}

const HOME: readonly HomePluginState[] = [
  { enabled: true, manifest: manifest('membrana.showcase.chart-list') as never },
];

const LOCAL: readonly HomePluginState[] = [
  {
    enabled: true,
    manifest: {
      ...manifest('membrana.showcase.buffer-manager'),
      mountTarget: 'background-media/collections',
    } as never,
  },
];

function homeSource(): PagePluginSource & { setEnabled: ReturnType<typeof vi.fn> } {
  const setEnabled = vi.fn(async () => {});
  return { list: async () => HOME, setEnabled };
}

describe('withLocalTenants', () => {
  it('список — домовые ПЛЮС местные, порядок назначает дом', async () => {
    const source = withLocalTenants(homeSource(), LOCAL);
    const list = await source.list();
    expect(list.map((p) => p.manifest.id)).toEqual([
      'membrana.showcase.chart-list',
      'membrana.showcase.buffer-manager',
    ]);
  });

  it('переключение ДОМОВОГО уезжает дому — включённость держит он', async () => {
    const home = homeSource();
    const source = withLocalTenants(home, LOCAL);
    await source.setEnabled('membrana.showcase.chart-list', false);
    expect(home.setEnabled).toHaveBeenCalledWith('membrana.showcase.chart-list', false);
  });

  it('переключение МЕСТНОГО дому НЕ уезжает: чужой дом о нём не знает', async () => {
    const home = homeSource();
    const source = withLocalTenants(home, LOCAL);
    await source.setEnabled('membrana.showcase.buffer-manager', false);
    expect(home.setEnabled).not.toHaveBeenCalled();
  });

  it('местная включённость запоминается и видна в следующем списке', async () => {
    const source = withLocalTenants(homeSource(), LOCAL);
    await source.setEnabled('membrana.showcase.buffer-manager', false);
    const list = await source.list();
    expect(list.find((p) => p.manifest.id === 'membrana.showcase.buffer-manager')?.enabled).toBe(false);
  });

  it('домовый список перечитывается каждый раз — страница отражает дом, а не помнит его', async () => {
    let calls = 0;
    const changing: PagePluginSource = {
      list: async () => {
        calls += 1;
        return calls === 1 ? HOME : [];
      },
      setEnabled: async () => {},
    };
    const source = withLocalTenants(changing, LOCAL);
    expect((await source.list()).length).toBe(2);
    expect((await source.list()).length).toBe(1);
  });
});
