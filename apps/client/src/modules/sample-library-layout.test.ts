/**
 * Зубы раскладки библиотеки в Studio (#2177) — и СХОДСТВА с кабинетом.
 *
 * Правило одно на близнецов, а носителей два: React-разметка у каждого приложения своя, общего
 * компонента для них нет (кабинетный `PagePluginArea` живёт в кабинете и о Studio не знает).
 * Две копии одного правила разъезжаются молча — поэтому зуб проверяет не «есть ли класс», а
 * то, что ОБА близнеца несут одинаковые правила. Разъедутся — покраснеет здесь.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const STUDIO = 'apps/client/src/modules/SampleLibraryModule.tsx';
const CABINET_AREA = 'apps/cabinet/src/plugins/PagePluginArea.tsx';
const CABINET_PAGE = 'apps/cabinet/src/pages/SampleLibraryPage.tsx';

describe('раскладка библиотеки: правило одно, носителей два', () => {
  it('кнопка сворачивания ВНЕ сворачиваемого — у обоих близнецов', () => {
    // Положи её внутрь, и свёрнутый список унесёт её с собой: развернуть станет нечем.
    const studio = read(STUDIO);
    const collapseAt = studio.indexOf('Свернуть список');
    const blockAt = studio.indexOf('{mainCollapsed ? null : (');
    expect(collapseAt).toBeGreaterThan(-1);
    expect(blockAt).toBeGreaterThan(collapseAt);

    expect(read(CABINET_PAGE)).toContain('mainHeader={');
    expect(read(CABINET_AREA)).toContain('state.mainCollapsed ? null : children');
  });

  it('сворачивается СПИСОК, а виджеты плагинов остаются — у обоих', () => {
    const studio = read(STUDIO);
    const blockAt = studio.indexOf('{mainCollapsed ? null : (');
    const widgetsAt = studio.indexOf('SAMPLE_LIBRARY_CHART_LIST_PLUGIN_ID) && selected');
    expect(widgetsAt).toBeGreaterThan(blockAt);

    // В кабинете то же: область рисует жильцов отдельно от основного блока.
    const area = read(CABINET_AREA);
    expect(area.indexOf('shown.map(')).toBeGreaterThan(area.indexOf('state.mainCollapsed ? null : children'));
  });

  it('свёртка берёт СПИСОК, но не органы управления — у обоих близнецов (#2188)', () => {
    // Владелец нашёл на проде: «Свернуть список» уносил левый сайдбар наборов, а он нужен
    // ИМЕННО при свёрнутом списке — переключить набор, работая с выборкой.
    const studio = read(STUDIO);
    const collapse = studio.indexOf('{mainCollapsed ? null : (');
    const list = studio.indexOf('<section className="flex min-w-0 flex-1 flex-col gap-2">');
    const asideStudio = studio.indexOf('flex min-h-0 flex-1 gap-3');
    expect(collapse).toBeGreaterThan(asideStudio);
    expect(list).toBeGreaterThan(collapse);

    // В кабинете органы поданы отдельным пропом, который область рисует ВНЕ свёртки.
    expect(read(CABINET_PAGE)).toContain('mainAside={');
    const area = read(CABINET_AREA);
    expect(area.indexOf('{mainAside}')).toBeLessThan(area.indexOf('state.mainCollapsed ? null : children'));
  });

  it('сторона зоны плагинов РАЗНАЯ по канону, и это не разъезд, а основание', () => {
    // SIDEBAR_SIDE.md: Studio — прибор (слева), кабинет — операторская (справа). Слово владельца
    // 26.08: канон в силе, симметрия близнецов в механизме, а не в стороне экрана.
    expect(read('apps/cabinet/src/plugins/PagePluginsSidebar.tsx')).toContain('lg:sticky lg:top-4');
    expect(read('apps/cabinet/src/plugins/SIDEBAR_SIDE.md')).toContain('Выравнивать кабинет под Studio');
  });
});

describe('действия строк выборки: правило одно, носителей два (#2188)', () => {
  const ACTIONS_STUDIO = 'apps/client/src/components/SampleRowActions.tsx';
  const ACTIONS_CABINET = 'apps/cabinet/src/components/sample-library/CabinetSampleRowActions.tsx';

  it('оба близнеца несут ОДНИ органы: перенос, скачивание, удаление с подтверждением', () => {
    for (const p of [ACTIONS_STUDIO, ACTIONS_CABINET]) {
      const src = read(p);
      expect(src).toContain('Перенести…');
      expect(src).toContain('window.confirm(');
      expect(src).toContain('Удалить пробу');
    }
  });

  it('оба близнеца убирают строку ПОСЛЕ действия — не «успех и как было»', () => {
    expect(read('apps/client/src/plugins/sample-library-chart-list/SampleLibraryChartListPanel.tsx')).toContain('dropFromSelection');
    expect(read('apps/cabinet/src/components/sample-library/CabinetSampleChartListPanel.tsx')).toContain('dropFromSelection');
  });

  it('ПРОВОДКА: оба близнеца ДОВОДЯТ глаголы до панели, а не только объявляют пропсы', () => {
    // Пропсы без проводки — механизм, которого нет: панель их объявила, а звать некому.
    // Ревью #2190 поймало это у Studio: патч упал на середине, пропсы легли, вызов остался
    // старым, и зуб «панель зовёт сервис» был зелёным, потому что проверял не тот конец.
    expect(read(STUDIO)).toContain('onMove={(id, toId) => handleMove(id, toId)}');
    expect(read(STUDIO)).toContain('onRemove={(id) => handleRemove(id)}');
    expect(read(CABINET_PAGE)).toContain('onMove={(id, toId) => lib.handleMove(id, toId)}');
    expect(read(CABINET_PAGE)).toContain('onRemove={(id) => lib.handleRemove(id)}');
  });

  it('ни один близнец не заводит своих глаголов набора', () => {
    for (const p of ['apps/client/src/plugins/sample-library-chart-list/SampleLibraryChartListPanel.tsx', 'apps/cabinet/src/components/sample-library/CabinetSampleChartListPanel.tsx']) {
      expect(read(p)).not.toMatch(/service.(moveSample|deleteSample)/u);
    }
  });
});
