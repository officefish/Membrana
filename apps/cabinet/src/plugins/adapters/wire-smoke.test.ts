/**
 * ИНТЕГРАЦИОННЫЙ СМОУК — клиентская половина сценария контракта (шаги 4, 6, 7).
 *
 * ЛИТЕРАЛ ПРОВОДА выписан здесь ровно в том виде, в каком его отдаёт контроллер дома журнала;
 * серверная половина — `packages/background-cabinet/src/modules/journal/plugin-host/
 * integration-smoke.test.ts` — проверяет, что дом отдаёт именно эту форму. Две половины держатся
 * за одну форму: разъедется провод — покраснеет одна из них, а не обе промолчат.
 */
import { describe, expect, it } from 'vitest';

import { setEnabled, setMainCollapsed, shownPlugins, isSupportedForm } from '../pagePlugins';
import {
  enabledIdsFromHome,
  toPagePlugins,
  type CabinetRendererRegistry,
  type HomePluginState,
} from './manifestToPagePlugin';

/** Ровно то, что приходит из `GET /v1/telemetry/plugins`. */
const WIRE: readonly HomePluginState[] = [
  {
    manifest: {
      id: 'membrana.showcase.chart-list',
      version: '0.1.0',
      kind: 'showcase',
      mountTarget: 'background-cabinet/journal',
      triggers: ['journal.entry_created'],
      displayForm: 'row',
    },
    enabled: true,
  },
  {
    manifest: {
      id: 'membrana.showcase.zone-map-one',
      version: '0.1.0',
      kind: 'showcase',
      mountTarget: 'background-cabinet/journal',
      triggers: ['journal.entry_created'],
      displayForm: 'zone-map',
    },
    enabled: false,
  },
  {
    manifest: {
      id: 'membrana.handler.mfcc',
      version: '0.1.0',
      kind: 'handler',
      mountTarget: 'background-cabinet/journal',
      triggers: ['journal.entry_created'],
    },
    enabled: true,
  },
];

const renderers: CabinetRendererRegistry = {
  'membrana.showcase.chart-list': { name: 'Чарт-лист', renderWidget: () => null },
};

describe('интеграционный смоук: провод дома → сайдбар страницы (клиентская половина)', () => {
  it('шаг 4: в сайдбар попадают showcase, handler остаётся в доме', () => {
    const plugins = toPagePlugins(WIRE, renderers);
    expect(plugins.map((p) => p.id)).toEqual([
      'membrana.showcase.chart-list',
      'membrana.showcase.zone-map-one',
    ]);
  });

  it('шаг 4: положение галочек берётся у дома, а не заводится страницей', () => {
    expect(enabledIdsFromHome(WIRE)).toEqual(['membrana.showcase.chart-list']);
  });

  it('шаг 6: включённый домом жилец показан СРАЗУ — отдельного действия показа нет', () => {
    // Правило почвы «показ выбирается кликом» снято владельцем 23.08: галочка и есть показ.
    const s = { enabled: enabledIdsFromHome(WIRE), mainCollapsed: false };
    const plugins = toPagePlugins(WIRE, renderers);
    expect(shownPlugins(plugins, s).map((p) => p.id)).toEqual(['membrana.showcase.chart-list']);
  });

  it('шаг 6: ВЫКЛЮЧЕННЫЙ домом не показывается — выключатель дома что-то значит', () => {
    const s = { enabled: enabledIdsFromHome(WIRE), mainCollapsed: false };
    const plugins = toPagePlugins(WIRE, renderers);
    expect(shownPlugins(plugins, s).map((p) => p.id)).not.toContain('membrana.showcase.zone-map-one');
  });

  it('шаг 6: журнал сворачивается сам по себе, без единого показанного жильца', () => {
    // Второе снятое правило: сворачивание больше не требует виджета.
    const s = setMainCollapsed({ enabled: [], mainCollapsed: false }, true);
    expect(s.mainCollapsed).toBe(true);
  });

  it('шаг 7: форма zone-map видна, но помечена — страница её не умеет и говорит об этом', () => {
    const zoneMap = toPagePlugins(WIRE, renderers).find((p) => p.form === 'zone-map');
    expect(zoneMap).toBeDefined();
    expect(isSupportedForm(zoneMap!.form)).toBe(false);
  });

  it('жилец без рисовалки не пропадает: он в доме есть, и в сайдбаре он есть', () => {
    const zoneMap = toPagePlugins(WIRE, renderers).find((p) => p.id === 'membrana.showcase.zone-map-one');
    expect(zoneMap?.name).toBe('zone-map-one');
    expect(zoneMap?.renderWidget()).toContain('нечем его нарисовать');
  });

  it('выключение жильца убирает его виджет, но НЕ разворачивает журнал за человека', () => {
    let s = { enabled: enabledIdsFromHome(WIRE), mainCollapsed: false };
    s = setMainCollapsed(s, true);
    s = setEnabled(s, 'membrana.showcase.chart-list', false);
    const plugins = toPagePlugins(WIRE, renderers);
    expect(shownPlugins(plugins, s)).toHaveLength(0);
    // Свернул человек — отменять его решение из-за чужого выключателя нельзя.
    expect(s.mainCollapsed).toBe(true);
  });
});
