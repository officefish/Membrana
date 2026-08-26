/**
 * Зубы кабинетного близнеца панели отбора (#2110) — статический контракт, как a11y-зуб рядом.
 *
 * Почему статика, а не рендер: у кабинета нет DOM-обвязки в тестах, а предмет здесь — не
 * поведение React, а ДОГОВОР между файлами: панель существует, смонтирована под основным
 * блоком, ядро дат берётся из пакета (близнецы делят его), подпись читается per-sample,
 * перенос называет адресата. Каждый пункт — то, что ревью 24.08 или слово владельца требовало.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const CABINET_SRC = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string) => readFileSync(join(CABINET_SRC, rel), 'utf8');

describe('панель отбора в кабинете (близнец Studio)', () => {
  it('панель существует и объявляет себя регионом для читалок', () => {
    const src = read('components/sample-library/CabinetSampleChartListPanel.tsx');
    expect(src).toContain('role="region"');
    expect(src).toContain('aria-label="Отбор чарт-листа"');
  });

  it('ядро дат и словари — из пакета, НЕ своя копия: близнецы делят правило «день человека»', () => {
    const src = read('components/sample-library/CabinetSampleChartListPanel.tsx');
    expect(src).toContain("dateInputToIsoWindow,");
    expect(src).toContain("from '@membrana/media-library-service'");
    expect(src).not.toMatch(/new Date\(y!?,/u);
  });

  it('заказ идёт той же витрине, что и в Studio, по текущей коллекции узла', () => {
    const src = read('components/sample-library/CabinetSampleChartListPanel.tsx');
    expect(src).toContain('service.requestLibraryChartList(collectionId,');
  });

  it('панель — ЖИЛЕЦ зоны плагинов, а не блок в потоке страницы (#2177, требование 1)', () => {
    // Владелец нашёл панель только по подсказке: она лежала ниже сорока строк списка. Теперь
    // жильцы объявлены страницей и рисуются журнальной областью — у них выделенное место.
    const page = read('pages/SampleLibraryPage.tsx');
    expect(page).toContain('<PagePluginArea');
    expect(page).toContain('membrana.showcase.library-chart-list');
    // И НЕ рисуется в потоке основной панели — иначе задвоилась бы.
    expect(read('components/sample-library/SampleLibraryMainPanel.tsx')).not.toContain('CabinetSampleChartListPanel');
  });

  it('зона плагинов справа и НЕ уезжает со списком (требования 1 и 2)', () => {
    // Сторона и прилипание взяты у журнала, а не изобретены: канон SIDEBAR_SIDE.md запрещает
    // выравнивать стороны — кабинет справа, Studio слева, и это основание рабочего места.
    const sidebar = read('plugins/PagePluginsSidebar.tsx');
    expect(sidebar).toContain('lg:sticky lg:top-4');
    expect(sidebar).toContain('aria-label="Плагины страницы"');
  });

  it('тумблер решает показ виджета, и источник включённости назван (требование 3)', () => {
    const page = read('pages/SampleLibraryPage.tsx');
    expect(page).toContain('localPluginSource');
    // Расхождение с журналом названо в коде, а не сглажено: у media нет входа включённости.
    expect(read('plugins/pagePluginSource.ts')).toContain('владелец включённости СТРАНИЦА');
  });

  it('список сворачивается, кнопка живёт ВНЕ сворачиваемого (требование 4)', () => {
    const page = read('pages/SampleLibraryPage.tsx');
    expect(page).toContain('mainHeader={');
    expect(page).toContain('collapseMain(!pagePlugins.state.mainCollapsed)');
    // Плеер ОСТАЁТСЯ при свёрнутом списке — прямое требование 4 владельца, доделано по
    // BLOCK ревью #2184: в теле он жил внутри сворачиваемого и исчезал вместе с ним.
    expect(page).toContain('state.mainCollapsed ? (');
    expect(page).toContain('<CabinetSamplePlayerSection');
    // Виджеты остаются: область рисует их отдельно от основного блока.
    expect(read('plugins/PagePluginArea.tsx')).toContain('state.mainCollapsed ? null : children');
  });

  it('отказ отбора показывается словами, а не пустой таблицей', () => {
    const src = read('components/sample-library/CabinetSampleChartListPanel.tsx');
    expect(src).toContain('Отбор отказал: {selection.refusal.detail}');
  });
});

describe('b4 действует в кабинетной таблице, а не только в Studio', () => {
  it('подпись per-sample: таблица читает состояние СВОЕЙ строки и показывает «сохранено»', () => {
    const src = read('components/sample-library/CabinetSampleTable.tsx');
    expect(src).toContain('labelStates[id]');
    expect(src).toContain('сохранено');
  });

  it('хук ведёт именованные состояния по пробе и не ждёт одну подпись, чтобы начать следующую', () => {
    const src = read('lib/useCabinetSampleLibrary.ts');
    expect(src).toContain("state: 'saving'");
    expect(src).toContain("state: 'saved'");
    expect(src).not.toContain('setLabelSavingId(sampleId)');
  });

  it('перенос говорит, КУДА едет: «переносится в …» и «перенесено в …»', () => {
    const src = read('lib/useCabinetSampleLibrary.ts');
    expect(src).toMatch(/Переносится в «\$\{targetName\}»/u);
    expect(src).toMatch(/Перенесено в «\$\{targetName\}»/u);
  });

  it('свежие сверху — серверным порядком: листинг проб media отдаёт createdAt desc', () => {
    // Кабинет листает страницами, и сортировать одну страницу на клиенте было бы ложью: первая
    // страница обязана содержать свежие. Порядок держит сервер — зуб фиксирует, что это так.
    const media = readFileSync(
      join(CABINET_SRC, '../../../packages/background-media/src/modules/samples/samples.service.ts'),
      'utf8',
    );
    expect(media).toContain("orderBy: { createdAt: 'desc' }");
  });
});

describe('панель дублей в кабинете — показать пары и ждать слова (#2109)', () => {
  it('панель существует, объявляет регион и заказывает витрину дублей по текущей коллекции', () => {
    const src = read('components/sample-library/CabinetSampleDuplicatesPanel.tsx');
    expect(src).toContain('aria-label="Дубли набора"');
    expect(src).toContain('service.requestLibraryDuplicates(collectionId,');
  });

  it('удаление — ТОЛЬКО по клику, ТОЛЬКО с подтверждением, ТОЛЬКО по одной; «удалить все» нет', () => {
    const src = read('components/sample-library/CabinetSampleDuplicatesPanel.tsx');
    expect(src).toContain('window.confirm(');
    expect(src).not.toMatch(/удалить все|removeAll|deleteAll/iu);
    expect(src).not.toMatch(/duplicates\.map\([^)]*onRemove/u);
  });

  it('порог печатается со словом «унаследован» — цена числа видна человеку', () => {
    const src = read('components/sample-library/CabinetSampleDuplicatesPanel.tsx');
    expect(src).toContain('унаследован от отбора');
  });

  it('«послушать подряд» — общим ядром близнецов, не своей очередью', () => {
    const src = read('components/sample-library/CabinetSampleDuplicatesPanel.tsx');
    expect(src).toContain("playSequence");
    expect(src).toContain("from '@membrana/sample-playback-service'");
  });

  it('дубли — жилец зоны плагинов; удаление по-прежнему глаголом хука', () => {
    const page = read('pages/SampleLibraryPage.tsx');
    expect(page).toContain('membrana.showcase.library-duplicates');
    expect(page).toContain('lib.handleRemove(id)');
  });
});

describe('панель разбора сеанса в кабинете — свод лицом (#2039)', () => {
  it('панель существует, объявляет регион и заказывает отчёт свода по текущей коллекции', () => {
    const src = read('components/sample-library/CabinetSampleSessionDigestPanel.tsx');
    expect(src).toContain('aria-label="Разбор сеанса"');
    expect(src).toContain('service.requestSessionDigest(collectionId,');
  });

  it('опорные и негативы показаны ДВУМЯ списками — негативы не выброшены и не смешаны', () => {
    const src = read('components/sample-library/CabinetSampleSessionDigestPanel.tsx');
    expect(src).toContain("list('Опорные (тональные)', outcome.references");
    expect(src).toContain("list('Негативный материал (широкополосные)', outcome.negatives");
  });

  it('паспорт печатает пороги, которых слух не называл, ПОИМЁННО', () => {
    const src = read('components/sample-library/CabinetSampleSessionDigestPanel.tsx');
    expect(src).toContain('outcome.passport.provisional.join');
  });

  it('разбор сеанса — жилец зоны плагинов', () => {
    expect(read('pages/SampleLibraryPage.tsx')).toContain('membrana.showcase.library-session-digest');
  });
});

describe('клик «играть» на строке выборки (#2177, дефект приёмки 26.08)', () => {
  it('панели зовут общий глагол, а не половину: выбор БЕЗ звука — это и был дефект', () => {
    for (const p of ['CabinetSampleChartListPanel', 'CabinetSampleSessionDigestPanel']) {
      const src = read(`components/sample-library/${p}.tsx`);
      expect(src).toContain('playSampleNow(');
      // Лицо отказа ОДНО на все панели: молчащая кнопка и есть дефект приёмки.
      expect(src).toContain('Проба не загрузилась');
      expect(src).toContain('togglePlayPause');
    }
  });
});
