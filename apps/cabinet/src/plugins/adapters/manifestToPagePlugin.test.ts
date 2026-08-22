/**
 * Зубы переходника И-5. Проверяют шов C→B: манифест дома против жильца страницы.
 */
import { describe, expect, it } from 'vitest';

import {
  enabledIdsFromHome,
  fallbackName,
  isPageTenant,
  toPagePlugin,
  toPagePlugins,
  type CabinetRendererRegistry,
  type HomePluginManifest,
  type HomePluginState,
} from './manifestToPagePlugin';

const m = (over: Partial<HomePluginManifest> = {}): HomePluginManifest => ({
  id: 'membrana.showcase.chart-list',
  version: '0.1.0',
  kind: 'showcase',
  mountTarget: 'background-cabinet/journal',
  triggers: ['journal.entry_created'],
  displayForm: 'row',
  ...over,
});

const renderers: CabinetRendererRegistry = {
  'membrana.showcase.chart-list': { name: 'Чарт-лист', renderWidget: () => null },
};

describe('кто попадает на страницу', () => {
  it('показывается только showcase: handler и report рисовать нечем', () => {
    expect(isPageTenant(m())).toBe(true);
    expect(isPageTenant(m({ kind: 'handler' }))).toBe(false);
    expect(isPageTenant(m({ kind: 'report' }))).toBe(false);
  });

  it('handler в доме есть, а в сайдбаре его нет — и это не пропажа', () => {
    const states: HomePluginState[] = [
      { manifest: m(), enabled: true },
      { manifest: m({ id: 'membrana.handler.mfcc', kind: 'handler' }), enabled: true },
    ];
    expect(toPagePlugins(states, renderers).map((p) => p.id)).toEqual(['membrana.showcase.chart-list']);
  });
});

describe('манифест женится с рисовалкой', () => {
  it('имя берётся у рисовалки — в манифесте его нет вовсе', () => {
    const p = toPagePlugin(m(), renderers['membrana.showcase.chart-list']);
    expect(p.name).toBe('Чарт-лист');
    expect(p.form).toBe('row');
  });

  it('без рисовалки жилец ОСТАЁТСЯ виден и назван — призраков не заводим (Т4)', () => {
    const p = toPagePlugin(m({ id: 'membrana.showcase.unknown-one' }), undefined);
    expect(p.name).toBe('unknown-one');
    expect(p.renderWidget()).toContain('нечем его нарисовать');
  });

  it('имя на крайний случай — последняя доля идентификатора, а не пустая строка', () => {
    expect(fallbackName('membrana.showcase.chart-list')).toBe('chart-list');
    expect(fallbackName('одно-слово')).toBe('одно-слово');
  });

  it('форма едет из манифеста как есть, даже та, которой страница не умеет', () => {
    // Страница пометит её словами (механизм блока B); переходник форму не подменяет.
    expect(toPagePlugin(m({ displayForm: 'zone-map' }), undefined).form).toBe('zone-map');
  });
});

describe('включённость приходит от дома', () => {
  it('включённые — те, кого назвал дом, и только жильцы страницы', () => {
    const states: HomePluginState[] = [
      { manifest: m(), enabled: true },
      { manifest: m({ id: 'membrana.showcase.other' }), enabled: false },
      { manifest: m({ id: 'membrana.handler.mfcc', kind: 'handler' }), enabled: true },
    ];
    expect(enabledIdsFromHome(states)).toEqual(['membrana.showcase.chart-list']);
  });
});
