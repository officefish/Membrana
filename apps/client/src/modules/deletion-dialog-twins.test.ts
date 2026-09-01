/**
 * Зубы окна удаления (#2218): близнецы не расходятся, и удаления без окна не бывает.
 *
 * Почему зуб читает ФАЙЛЫ, а не рендерит компоненты: правило живёт в двух домах-носителях
 * (общего UI-пакета нет), и вопрос здесь не «работает ли кнопка», а «одинаково ли правило
 * и не завёл ли дом свой обходной путь». Рендер этого не покажет — он проверяет один дом.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..', '..');

const CABINET_DIALOG = resolve(REPO, 'apps/cabinet/src/components/sample-library/DeletionConfirmDialog.tsx');
const STUDIO_DIALOG = resolve(REPO, 'apps/client/src/components/DeletionConfirmDialog.tsx');
const CABINET_PAGE = resolve(REPO, 'apps/cabinet/src/pages/SampleLibraryPage.tsx');
const STUDIO_MODULE = resolve(REPO, 'apps/client/src/modules/SampleLibraryModule.tsx');

/** Файлы, где раньше жил системный вопрос: он снят, и вернуться туда не должен. */
const DELETION_CARRIERS = [
  'apps/cabinet/src/components/sample-library/CabinetSampleRowActions.tsx',
  'apps/cabinet/src/components/sample-library/CabinetSampleDuplicatesPanel.tsx',
  'apps/client/src/components/SampleRowActions.tsx',
  'apps/client/src/modules/SampleLibraryModule.tsx',
];

const read = (p: string) => readFileSync(p, 'utf8');

describe('окно удаления — близнецы', () => {
  it('ЗЕРКАЛО: оба дома судят ценность ЯДРОМ, а не своей копией правила', () => {
    for (const p of [CABINET_DIALOG, STUDIO_DIALOG]) {
      const s = read(p);
      expect(s).toContain("from '@membrana/media-library-service'");
      expect(s).toContain('assessDeletion');
      // Дом не заводит своих слов о ценности: уровни и причины приходят из ядра.
      expect(s).not.toMatch(/level\s*=\s*['"]evidence['"]/u);
    }
  });

  it('оба окна показывают ТО ЖЕ: список, ценность, причину и число к удалению', () => {
    for (const p of [CABINET_DIALOG, STUDIO_DIALOG]) {
      const s = read(p);
      expect(s).toContain('summary.headline');
      expect(s).toContain('summary.verdicts');
      expect(s).toContain('Ценность');
      expect(s).toContain('Почему');
      expect(s).toContain('Удалить ${willDelete}');
    }
  });

  it('НЕЗАНИЖЕНИЕ: если разобрано меньше, чем уйдёт, окно говорит это словами', () => {
    for (const p of [CABINET_DIALOG, STUDIO_DIALOG]) {
      const s = read(p);
      expect(s).toContain('declaredTotal');
      expect(s).toContain('Уйдут все');
    }
  });

  it('вещдок требует второго движения — галочки, а рядовая уборка одного', () => {
    for (const p of [CABINET_DIALOG, STUDIO_DIALOG]) {
      const s = read(p);
      // Само правило «когда можно жать» живёт в ядре (isDeletionBlocked) и проверяется
      // там таблицей случаев; дом обязан его ЗВАТЬ и подавать все четыре входа, а не
      // складывать своё условие рядом.
      expect(s).toContain('isDeletionBlocked({');
      expect(s).toContain('evidence: summary.evidence');
      expect(s).toContain('acknowledged,');
      expect(s).toContain('Понимаю, что удаляю вещдоки');
    }
  });

  it('окна не разошлись по существу: тела совпадают, кроме ссылки на дом-близнец', () => {
    const norm = (s: string) =>
      s
        .replace(/ \* БЛИЗНЕЦ[\s\S]*?внимательность\.\n/u, '')
        .replace(/\s+/gu, ' ')
        .trim();
    expect(norm(read(STUDIO_DIALOG))).toEqual(norm(read(CABINET_DIALOG)));
  });
});

describe('ЖИЗНЬ СОСТОЯНИЯ между открытиями', () => {
  // Ревью #2232 нашло дефект, которого не видел ни один зуб этого файла: пять проверок
  // смотрели СОДЕРЖИМОЕ окна и ни одна — его поведение во времени. Свидетельство бралось
  // не там, где живёт риск. Эти три зуба закрывают именно проводку; сама механика ворот
  // проверяется последовательностью событий в ядре
  // (packages/services/media-library/test/deletion-value.test.ts).
  it('оба дома берут состояние ворот из ЯДРА, а не держат своё', () => {
    for (const p of [CABINET_DIALOG, STUDIO_DIALOG]) {
      const s = read(p);
      expect(s).toContain('deletionGateReducer');
      expect(s).toContain('isDeletionBlocked');
      // Своё состояние для галочки — вторая копия правила и прямой путь к прежнему
      // дефекту: компонент не размонтируется, и локальный флаг переживает окно.
      expect(s, 'галочка не должна жить в локальном состоянии дома').not.toContain('setAcknowledged');
      expect(s, 'useState в окне больше не нужен — состояние ворот в ядре').not.toContain('useState');
    }
  });

  it('оба дома ОБЪЯВЛЯЮТ воротам открытие и закрытие — молча состояние не меняется', () => {
    for (const p of [CABINET_DIALOG, STUDIO_DIALOG]) {
      const s = read(p);
      expect(s).toContain("dispatch(open ? { type: 'open'");
      expect(s).toContain("{ type: 'close' }");
    }
  });

  it('ключ открытия различает РАЗНЫЕ удаления: заголовок и состав списка', () => {
    for (const p of [CABINET_DIALOG, STUDIO_DIALOG]) {
      const s = read(p);
      expect(s).toContain('const openKey');
      expect(s).toContain('samples.map((s) => s.id).join');
    }
  });

  it('ПОКАЗ И ДЕЙСТВИЕ ИЗ ОДНОГО ВЕРДИКТА: галочка и блокировка не заводят своих условий', () => {
    // Класс, чуть не заведённый при добавлении масштаба (31.08): третье условие легло в
    // блокировку, а галочка продолжала рисоваться по прежним двум — вышло окно, где две
    // рядовые записи удалить НЕЛЬЗЯ ВОВСЕ: жать нельзя, а отметить нечего.
    //
    // Лечение не в том, чтобы синхронно править два условия, а в том, чтобы условие было
    // ОДНО: оба дома спрашивают `deletionAcknowledgementRisk`. Заведёт дом своё — покраснеет.
    for (const p of [CABINET_DIALOG, STUDIO_DIALOG]) {
      const s = read(p);
      expect(s, 'дом обязан брать вердикт из ядра').toContain('deletionAcknowledgementRisk(');
      expect(s, 'галочка рисуется по вердикту, а не по своему условию').toContain('{risk ? (');
      expect(s, 'своё условие показа вернулось — это тупик').not.toContain(
        'summary.evidence > 0 || unknown > 0',
      );
      // У масштаба обязаны быть СВОИ слова: «понимаю, что удаляю вещдоки» на пачке рядовых —
      // ложь, а от лжи в предупреждении его перестают читать целиком.
      expect(s, 'у масштаба нет своих слов').toMatch(/записей разом/u);
    }
  });
});

describe('удаления без окна не бывает', () => {
  it('ПОРЧА: системный window.confirm не вернулся ни в один носитель удаления', () => {
    for (const rel of DELETION_CARRIERS) {
      const s = read(resolve(REPO, rel));
      expect(s, `${rel}: системный вопрос слабее окна и не должен стоять рядом с ним`).not.toContain(
        'window.confirm',
      );
    }
  });

  it('обе воронки кабинета заведены на ворота, а не на голый обработчик', () => {
    const s = read(CABINET_PAGE);
    expect(s).toContain('<DeletionConfirmDialog');
    expect(s).toContain('const removeGated');
    expect(s).toContain('const clearBufferGated');
    expect(s).toContain('handleClearBuffer={clearBufferGated}');
    expect(s).toContain('handleRemove={removeGated}');
    // Прямой вызов удаления мимо ворот — это и есть дыра, которую чиним.
    expect(s).not.toContain('onRemove={(id) => lib.handleRemove(id)}');
  });

  it('обе воронки Studio заведены на ворота', () => {
    const s = read(STUDIO_MODULE);
    expect(s).toContain('<DeletionConfirmDialog');
    expect(s).toContain('const removeGated');
    expect(s).toContain('const clearBufferGated');
    expect(s).toContain('void clearBufferGated()');
    expect(s).toContain('void removeGated(');
  });

  it('очистка буфера объявляет ПОЛНОЕ число, а не размер загруженной страницы', () => {
    for (const p of [CABINET_PAGE, STUDIO_MODULE]) {
      const s = read(p);
      expect(s).toContain('declaredTotal');
      expect(s).toContain('sampleCount');
    }
  });

  it('ОДИНАКОВАЯ СИЛА: оба дома подают окну прибор — иначе вещдок падает до «разобрано»', () => {
    // Без прибора окна вещдоков не применяются, вердикт снижается, и второе движение
    // перестаёт требоваться. Предохранитель разной силы у близнецов — это расхождение
    // правила, а не разница домов (ревью #2232, второй заход).
    for (const p of [CABINET_PAGE, STUDIO_MODULE]) {
      const s = read(p);
      expect(s, 'дом обязан передать deviceId в окно удаления').toContain('deviceId={');
    }
    expect(read(STUDIO_MODULE)).toContain('readPersistedPairedCredentials');
  });
});

describe('удаление ПАЧКОЙ в панели чарт-листа (#2250)', () => {
  const PANEL_STUDIO = resolve(REPO, 'apps/client/src/plugins/sample-library-chart-list/SampleLibraryChartListPanel.tsx');
  const PANEL_CABINET = resolve(REPO, 'apps/cabinet/src/components/sample-library/CabinetSampleChartListPanel.tsx');
  const CORE = resolve(REPO, 'packages/services/media-library/src/bulk-selection.ts');

  it('ОБА близнеца берут отбор из ЯДРА, а не заводят свой', () => {
    // Две копии одного правила разъезжаются молча — ловили на переносе (30.08) и на согласии
    // показа с действием (31.08). Здесь разъезжаться нечему: решения в ядре, панели рисуют.
    for (const p of [PANEL_STUDIO, PANEL_CABINET]) {
      const s = read(p);
      expect(s, 'панель не спрашивает ядро об отборе').toContain('pickedShownIds');
      expect(s).toContain('toggleAllShown');
      expect(s).toContain('SELECT_ALL_SHOWN_LABEL');
      expect(s).toContain('bulkDeleteLabel(');
    }
  });

  it('«всё ПОКАЗАННОЕ» — подпись одна на два дома и живёт в ядре', () => {
    // Строка в двух домах порознь однажды разойдётся на одно слово, и разойдётся именно на
    // этом: «выбрать всё» обещает набор, а действие идёт по показанному
    // (класс docs/field/decisions-on-partial-data.md).
    expect(read(CORE)).toContain("SELECT_ALL_SHOWN_LABEL = 'Выбрать всё показанное'");
    for (const p of [PANEL_STUDIO, PANEL_CABINET]) {
      expect(read(p), 'панель зашила свою подпись — две копии разойдутся').not.toContain('Выбрать всё показанное');
      expect(read(p), 'подпись обещает весь набор').not.toMatch(/>Выбрать всё</u);
    }
  });

  it('ПРОВОДКА: глагол пачки доведён до панели, а не только объявлен пропом', () => {
    // Ревью #2190 ловило ровно это у Studio: пропсы легли, вызов остался старым, а зуб был
    // зелёным, потому что проверял не тот конец.
    expect(read(STUDIO_MODULE)).toContain('onRemoveMany={(ids) => void removeManyGated(ids)}');
    expect(read(CABINET_PAGE)).toContain('onRemoveMany={removeManyGated}');
    // И гейт ведёт в ОКНО, а не в прямое удаление: список и оценка ценности обязательны.
    expect(read(STUDIO_MODULE)).toContain('run: () => handleRemoveMany(sampleIds)');
    expect(read(CABINET_PAGE)).toContain('lib.handleRemoveMany(ids)');
  });

  it('ЧИСЛО К УДАЛЕНИЮ — длина СПИСКА, а не длина найденного на странице', () => {
    // Иначе окно занизило бы потерю до видимого — класс ревью #2232.
    expect(read(STUDIO_MODULE)).toContain('declaredTotal: sampleIds.length');
    expect(read(CABINET_PAGE)).toMatch(/lib\.handleRemoveMany\(ids\), ids\.length\)/u);
  });

  it('ЧАСТИЧНЫЙ ОТКАЗ называет записи ПОИМЁННО в обоих домах', () => {
    for (const p of [STUDIO_MODULE, resolve(REPO, 'apps/cabinet/src/lib/useCabinetSampleLibrary.ts')]) {
      const s = read(p);
      expect(s, 'дом не разбирает отказанные записи').toContain('outcome.refused');
      expect(s, 'отказ не назван словами').toMatch(/Удалено \$\{outcome\.deleted\}, отказано/u);
    }
  });

  it('пачка идёт ОДНИМ вызовом по списку, а не циклом по одиночному удалению', () => {
    // Цикл дал бы N окон подтверждения и N полу-исходов без общего отчёта.
    for (const p of [STUDIO_MODULE, resolve(REPO, 'apps/cabinet/src/lib/useCabinetSampleLibrary.ts')]) {
      expect(read(p)).toContain('deleteSamplesByIds(');
    }
    // Имя пути — по смыслу: «уборка буфера» породила бы второго близнеца для наборов.
    expect(read(resolve(REPO, 'packages/services/media-library/src/media-library-service.ts')))
      .not.toContain('executeBufferCleanup');
  });
});
