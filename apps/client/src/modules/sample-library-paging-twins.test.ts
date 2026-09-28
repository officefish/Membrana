/**
 * Зубы ЛИСТАНИЯ у близнецов (#2505). Предмет — дома библиотеки: Studio и кабинет.
 *
 * Носителей правила два (React-разметка у каждого приложения своя, общего пакета под органы
 * листания сегодня нет — см. #2497), поэтому проверяется не «есть ли класс», а то, что оба дома
 * несут ОДНО правило и берут числа из ОДНОГО места. Разъедутся — покраснеет здесь.
 *
 * Порчи → красный (проверены руками):
 *  • отдать таблице Studio весь отфильтрованный список (`rows={filteredSamples}`) — красный;
 *  • объявить размер страницы числом в доме (`= 40`) — красный;
 *  • развести объявления сорока (дверь → 50, слой доступа → 40) — красный на «одно и то же число»;
 *  • сбросить страницу эффектом после отрисовки вместо сброса в том же движении — красный;
 *  • убрать приведение номера у кабинета (`clampSamplesPage`) — красный;
 *  • вернуть оговорку «на этой странице N» к числу ЗАГРУЖЕННОГО — красный.
 *
 * Шаблоны отрицательных проверок вынесены именами и проверены САМИМ ЗУБОМ (см. последнюю пробу):
 * отрицательная проверка со сломанным шаблоном зелена всегда и потому ничего не сторожит — этот
 * урок дом уже получал в `sample-library-layout.test.ts`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const STUDIO = 'apps/client/src/modules/SampleLibraryModule.tsx';
const STUDIO_TABLE = 'apps/client/src/components/sample-library/SampleLibraryTable.tsx';
const STUDIO_NAV = 'apps/client/src/components/sample-library/SampleLibraryPagination.tsx';
const CABINET_HOOK = 'apps/cabinet/src/lib/useCabinetSampleLibrary.ts';
const CABINET_NAV = 'apps/cabinet/src/components/sample-library/CabinetSampleTablePagination.tsx';
const PAGE_RULE = 'packages/services/media-library/src/samples-page.ts';
const PAGE_SIZE_HOME = 'packages/services/media-library/src/constants.ts';
/**
 * Ещё два объявления ТОГО ЖЕ числа — оба старше листания и оба законны.
 *
 * Дверь не может импортировать клиентский слой доступа (серверный контур от него не зависит), а
 * оболочке Electron запрещено тащить сервис в main — так и написано в шапке её `constants.ts`.
 * Свести их одним носителем нельзя, поэтому сводит зуб: разъедутся — «страница 3 из 27» у двери и
 * у дома перестанут означать одно и то же, и увидит это не зуб, а человек на 1057 пробах.
 */
const DOOR_PAGE_SIZE = 'packages/background-media/src/lib/pagination.ts';
const SHELL_PAGE_SIZE = 'apps/membrana-studio/src/media-library/constants.ts';

/** «Размер страницы объявлен числом в доме» — то, чего быть не должно ни у одного близнеца. */
const PAGE_SIZE_DECLARED_IN_HOUSE =
  /(page_?size|limit)\s*[:=]\s*(?!DEFAULT_SAMPLES_PAGE_SIZE)\d+/iu;

/** «Таблице отдали весь список» — прежнее поведение Studio, из-за которого дом и подвисал. */
const WHOLE_LIST_INTO_TABLE = /rows=\{(filteredSamples|samples)\}/u;

describe('листание: одно правило, два дома', () => {
  it('дома НЕ объявляют размер страницы заново — зовут его из слоя доступа', () => {
    expect(read(PAGE_SIZE_HOME)).toContain('export const DEFAULT_SAMPLES_PAGE_SIZE = 40');

    for (const house of [STUDIO, CABINET_HOOK]) {
      const src = read(house);
      expect(src).toContain('DEFAULT_SAMPLES_PAGE_SIZE');
      expect(src).not.toMatch(PAGE_SIZE_DECLARED_IN_HOUSE);
    }
  });

  /**
   * СЧЁТ КОПИЙ, А НЕ «ЕСТЬ ГДЕ-ТО ОДНО». Прежняя редакция пробы выше называлась «размер страницы
   * живёт в ОДНОМ месте» и смотрела только на два дома — а сорок в дереве объявлено ТРИ раза.
   * Название было шире предмета: под ним можно было развести дверь и слой доступа, и зуб бы
   * промолчал. Предмет переписан на то, что проверяемо: копии есть, и они СОГЛАСНЫ.
   */
  it('все объявления размера страницы называют одно и то же число', () => {
    const DECLARED = /DEFAULT_SAMPLES_PAGE_SIZE\s*=\s*(\d+)/u;
    const declared = [PAGE_SIZE_HOME, DOOR_PAGE_SIZE, SHELL_PAGE_SIZE].map((file) => {
      const found = DECLARED.exec(read(file));
      expect(found, `в ${file} не нашлось объявления размера страницы`).not.toBeNull();
      return `${file} → ${found?.[1]}`;
    });
    // Три объявления, одно число. В сообщении — сами объявления: разъехавшееся видно без догадок.
    expect([...new Set(declared.map((d) => d.split(' → ')[1]))], declared.join('; ')).toHaveLength(1);
  });

  it('Studio отдаёт таблице ОКНО страницы, а не весь отфильтрованный список', () => {
    const studio = read(STUDIO);
    expect(studio).toContain('resolveSamplesPageWindow(filteredSamples, samplesPage');
    expect(studio).toContain('rows={pageView.items}');
    expect(studio).not.toMatch(WHOLE_LIST_INTO_TABLE);
  });

  it('смена набора и смена фильтра сбрасывают страницу СРАЗУ, в том же движении', () => {
    const studio = read(STUDIO);
    // Сброс стоит рядом с самой сменой — не эффектом после отрисовки: иначе между сменой и
    // сбросом живёт кадр, в котором номер прошлого списка выдаёт себя за номер нового (#2181).
    for (const setter of ['setSelectedId(collectionId);', 'setLabelFilter(next);']) {
      const at = studio.indexOf(setter);
      expect(at).toBeGreaterThan(-1);
      expect(studio.slice(at, at + 120)).toContain('setSamplesPage(1)');
    }
    // И ни один орган выбора набора не ходит в `setSelectedId` мимо сброса.
    expect(studio).toContain('onClick={() => selectCollection(col.id)}');
    expect(studio).not.toContain('onClick={() => setSelectedId(col.id)}');
  });

  it('оба дома приводят номер страницы к живому диапазону правилом из ядра', () => {
    // Studio — через окно страницы, кабинет — сверкой ответа двери с номером.
    expect(read(PAGE_RULE)).toContain('export function clampSamplesPage');
    expect(read(PAGE_RULE)).toContain('clampSamplesPage(page, totalPages)');

    const cabinet = read(CABINET_HOOK);
    expect(cabinet).toContain('clampSamplesPage');
    /**
     * СЧЁТ, А НЕ «ЕСТЬ ХОТЬ ГДЕ-ТО». Первая редакция этой пробы проверяла наличие сверки и
     * возвращалась ЗЕЛЁНОЙ, когда сверку сняли у ОДНОЙ из двух страниц (порча P9 28.09): у
     * кабинета две двери страниц — каталог мембраны и набор узла, — и дефект в одной из них
     * зуб бы не поймал. Предмет переписан: сверяются ОБЕ.
     */
    const reconciled = cabinet.match(
      /reconcileSamplesPage\(\{ page: data\.page, totalPages: data\.totalPages \}\)/gu,
    );
    expect(reconciled, 'сверку номера страницы с ответом двери сняли у одной из страниц').toHaveLength(2);
    /**
     * И сама сверка судит ПРАВИЛОМ ЯДРА, а не своим числом. Вторая порча того же захода (P9c
     * 28.09) оставляла зовы сверки на месте, но вынимала приведение из её тела — и проба,
     * считавшая только зовы, была зелена. Поведение самого правила проверено отдельно и по
     * существу: `packages/services/media-library/test/samples-page.test.ts`.
     */
    expect(cabinet, 'сверка перестала звать правило ядра').toContain(
      'const fixed = clampSamplesPage(meta.page, meta.totalPages);',
    );
    // Ловушка, из-за которой приведение и понадобилось: нав кабинета исчезает при одной странице.
    expect(read(CABINET_NAV)).toContain('if (totalPages <= 1) return null;');
  });

  it('органы листания говорят одними словами у обоих близнецов', () => {
    const studioNav = read(STUDIO_NAV);
    const cabinetNav = read(CABINET_NAV);
    for (const word of [
      'aria-label="Пагинация таблицы сэмплов"',
      'Назад',
      'Вперёд',
      'aria-current="page"',
      '{page} / {totalPages}',
      '{from}–{to} из {total}',
    ]) {
      expect(studioNav).toContain(word);
      expect(cabinetNav).toContain(word);
    }
  });

  it('оговорка о неполноте говорит о ЗАГРУЖЕННОМ, а не о странице экрана', () => {
    // С появлением страницы у экрана прежняя формулировка стала ложью: «на этой странице 1057»
    // при сорока строках перед глазами (#2237 наоборот).
    const studio = read(STUDIO);
    expect(studio).toContain('(загружено ${samples.length})');
    expect(studio).not.toContain('(на этой странице ${samples.length})');
  });

  it('шаблоны отрицательных проверок ловят то, что обещают', () => {
    // Без этой пробы отрицательные проверки выше зелены и при сломанном шаблоне.
    expect('const PAGE_SIZE = 40;').toMatch(PAGE_SIZE_DECLARED_IN_HOUSE);
    expect('samplesPageSize = 40,').toMatch(PAGE_SIZE_DECLARED_IN_HOUSE);
    expect('const limit = 40;').toMatch(PAGE_SIZE_DECLARED_IN_HOUSE);
    expect('const limit = DEFAULT_SAMPLES_PAGE_SIZE;').not.toMatch(PAGE_SIZE_DECLARED_IN_HOUSE);
    expect('rows={filteredSamples}').toMatch(WHOLE_LIST_INTO_TABLE);
    expect('rows={samples}').toMatch(WHOLE_LIST_INTO_TABLE);
    expect('rows={pageView.items}').not.toMatch(WHOLE_LIST_INTO_TABLE);
  });
});

describe('следствие страничности объявлено, а не забыто', () => {
  it('таблица Studio не знает о страницах — ей дают готовые строки', () => {
    const table = read(STUDIO_TABLE);
    expect(table).not.toContain('DEFAULT_SAMPLES_PAGE_SIZE');
    expect(table).not.toContain('resolveSamplesPageWindow');
    expect(table).toContain('readonly rows: readonly MediaSample[]');
  });

  it('полный набор остаётся у тех, кто судит о наборе целиком', () => {
    const studio = read(STUDIO);
    // Разметка, экспорт/импорт меток, счётчик размеченных и поиск пробы для панелей плагинов
    // по-прежнему смотрят в ПОЛНЫЙ список: листается отрисовка, а не загрузка.
    expect(studio).toContain('exported: samples,');
    expect(studio).toContain('const byTitle = new Map(samples.map((x) => [x.title, x]));');
    expect(studio).toContain('const labeledCount = samples.filter');
    expect(studio).toContain('const s = samples.find((x) => x.id === id);');
  });
});
