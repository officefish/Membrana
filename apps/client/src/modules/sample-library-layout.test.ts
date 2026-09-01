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

/**
 * Вторая копия правила «только для чтения», заведённая домом рядом с зовом ядра.
 * Вынесен именем, чтобы шаблон можно было проверить САМИМ ЗУБОМ — см. пробу ниже:
 * отрицательная проверка, чей шаблон никто не проверял, зелена и при сломанном шаблоне.
 */
const SECOND_COPY_OF_RULE = /readOnlyCollection\s*=\s*[^;]*kind\s*===\s*['"]system['"]/u;

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
    const widgetsAt = studio.indexOf('MEDIA_HOME_CHART_LIST_PLUGIN_ID) && selected');
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
      // «Удаление с подтверждением» осталось правилом, но подтверждение теперь — окно со
      // списком и гипотезой ценности (#2218). Органы обоих домов зовут onRemove; сами
      // вопросов не задают.
      expect(src).toContain('onRemove(sampleId)');
      expect(src).not.toContain('window.confirm(');
      expect(src).toContain('Удалить ');
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
    expect(read(CABINET_PAGE)).toContain('onMove={(id, toId) => lib.handleMove(id, toId)}');
    // Удаление с #2218 идёт через ворота окна, а не прямым вызовом: проводка та же по сути —
    // панель зовёт сервис библиотеки, — но между кнопкой и необратимым действием встало окно.
    expect(read(STUDIO)).toContain('void removeGated(');
    expect(read(STUDIO)).toContain('run: () => handleRemove(sampleId)');
    expect(read(CABINET_PAGE)).toContain('onRemove={removeGated}');
    expect(read(CABINET_PAGE)).toContain('lib.handleRemove(id)');
  });

  it('ни один близнец не заводит своих глаголов набора', () => {
    for (const p of ['apps/client/src/plugins/sample-library-chart-list/SampleLibraryChartListPanel.tsx', 'apps/cabinet/src/components/sample-library/CabinetSampleChartListPanel.tsx']) {
      expect(read(p)).not.toMatch(/service.(moveSample|deleteSample)/u);
    }
  });
});

describe('перенос доступен из ЛЮБОГО набора, а не только из буфера', () => {
  const CABINET_PANEL = 'apps/cabinet/src/components/sample-library/SampleLibraryMainPanel.tsx';
  const CABINET_TABLE = 'apps/cabinet/src/components/sample-library/CabinetSampleTable.tsx';
  const CABINET_HOOK = 'apps/cabinet/src/lib/useCabinetSampleLibrary.ts';

  it('ПОРЧА: ни один дом не привязывает ДВЕРЬ переноса к буферу', () => {
    // Дефект был не в правах и не на сервере: `moveTargets` уже исключал буфер, системные и
    // текущий, сервер блокировал лишь тарифный набор и перенос в тот же самый. Дверь просто
    // нарисовали в одном буфере — и, разложив улов по наборам, человек больше не мог переложить
    // пробу из набора в набор.
    //
    // Порча владельца: вернуть условие про буфер — зуб краснеет. Ловим ОБА конца: и сравнение с
    // BUFFER_COLLECTION_ID рядом с moveTargets, и старое имя пропа, которое несло привязку в себе.
    const studio = read(STUDIO);
    expect(studio, 'дверь переноса снова привязана к буферу').not.toMatch(
      /selectedId === BUFFER_COLLECTION_ID && moveTargets\.length/u,
    );
    expect(studio).toContain('canMoveFrom && moveTargets.length > 0');

    for (const p of [CABINET_PANEL, CABINET_TABLE]) {
      expect(read(p), `${p}: имя showMoveFromBuffer несёт привязку к буферу`).not.toContain(
        'showMoveFromBuffer=',
      );
    }
    expect(read(CABINET_PANEL)).not.toMatch(/collectionId === BUFFER_COLLECTION_ID/u);
  });

  it('оба близнеца судят ИСТОЧНИК ОДНИМ предикатом ядра, а не своим условием', () => {
    // ПРЕЖНЯЯ РЕДАКЦИЯ ЭТОГО ЗУБА БЫЛА ДЕФЕКТОМ (найдено архитектором 01.09). Она сверяла
    // ДВЕ РАЗНЫЕ строки поимённо — по одной на дом — и тем самым закрепляла расхождение как
    // эталон: покраснеть на разъезде такой зуб не может по устройству, он покраснел бы,
    // наоборот, если дома СВЕСТИ. Зуб был, был запущен и предмета не видел, потому что
    // сторожил НАПИСАНИЕ, а не правило.
    //
    // Теперь правило одно и живёт в ядре (`isReadOnlyCollection`), а зуб требует, чтобы оба
    // дома его звали и НЕ заводили своего условия рядом.
    for (const p of [STUDIO, CABINET_HOOK]) {
      const src = read(p);
      expect(src, 'дом обязан звать предикат ядра').toContain('isReadOnlyCollection(');
      expect(src, 'своё условие только для чтения — вторая копия правила').not.toMatch(
        SECOND_COPY_OF_RULE,
      );
    }
  });

  it('шаблон второй копии правила сам краснеет на заведомо дурной строке', () => {
    // ВТОРОЙ ДЕФЕКТ ЭТОГО ЖЕ ЗУБА (найдено ревью 01.09). В шаблоне потерялись обратные
    // слэши: `\s*` читалось как «ноль или больше букв s», и с пробелами вокруг `=` и `===`
    // он не поймал бы ничего. Отрицательная проверка при этом была зелёной всегда — зуб
    // был запущен и молчал, потому что его предмета не существовало.
    //
    // Поэтому шаблон теперь проверяется САМ, образцом заведомо дурной строки. Отрицательная
    // проверка без такой пробы не свидетельствует ни о чём: она зелена и когда второй копии
    // правила нет, и когда шаблон сломан.
    expect(
      SECOND_COPY_OF_RULE.test("const readOnlyCollection = collection?.kind === 'system';"),
      'шаблон обязан ловить вторую копию правила, написанную с пробелами',
    ).toBe(true);
    expect(
      SECOND_COPY_OF_RULE.test('const readOnlyCollection = isReadOnlyCollection(collection);'),
      'зов предиката ядра второй копией правила не является',
    ).toBe(false);
  });

  it('перенос СОПРОВОЖДАЕТСЯ СЛОВОМ у обоих — и слово названо по адресату', () => {
    // #2110 чинил молчаливое исчезновение из списка для буфера. Слово написано по адресату
    // («перенесено В такой-то»), а не по источнику, поэтому набор→набор говорит им без правки.
    // Зуб держит это явно: сузят слово обратно до буфера — покраснеет.
    for (const p of [STUDIO, CABINET_HOOK]) {
      const src = read(p);
      // Имя переменной у домов своё (`targetName` / `moveState.targetName`) — важно, что имя
      // набора-адресата подставляется, а не что переменные названы одинаково.
      expect(src, `${p}: нет слова «переносится»`).toMatch(/Переносится в «\$\{[\w.]+\}»/u);
      expect(src, `${p}: нет слова «перенесено»`).toMatch(/Перенесено в «\$\{[\w.]+\}»/u);
    }
  });
});
