/**
 * Зубы окна «перенести все» (заказ владельца 27.09): близнецы не расходятся, а дома не
 * заводят своих слов о плане.
 *
 * Почему зуб читает ФАЙЛЫ, а не рендерит: правило живёт в двух домах-носителях (общего
 * UI-пакета нет), и вопрос здесь не «работает ли кнопка» — это проверено рендером в кабинете
 * (`MoveAllToCollectionDialog.test.tsx`), — а «одинаково ли правило и не завёл ли дом
 * обходной путь». Рендер этого не покажет: он проверяет ОДИН дом.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..', '..');

const STUDIO_DIALOG = resolve(REPO, 'apps/client/src/components/MoveAllToCollectionDialog.tsx');
const CABINET_DIALOG = resolve(REPO, 'apps/cabinet/src/components/sample-library/MoveAllToCollectionDialog.tsx');
const STUDIO_MODULE = resolve(REPO, 'apps/client/src/modules/SampleLibraryModule.tsx');
const CABINET_PAGE = resolve(REPO, 'apps/cabinet/src/pages/SampleLibraryPage.tsx');
const CABINET_SIDEBAR = resolve(REPO, 'apps/cabinet/src/components/sample-library/SampleLibrarySidebar.tsx');
const CABINET_MODEL = resolve(REPO, 'apps/cabinet/src/lib/useCabinetSampleLibrary.ts');
const CORE = resolve(REPO, 'packages/services/media-library/src/move-batch.ts');

const read = (p: string) => readFileSync(p, 'utf8');
const DIALOGS = [STUDIO_DIALOG, CABINET_DIALOG];

describe('окно переноса — близнецы', () => {
  it('окна не разошлись по существу: тела совпадают, кроме ссылки на дом-близнец', () => {
    const norm = (s: string) =>
      s
        .replace(/ \* БЛИЗНЕЦ[\s\S]*?внимательность\.\n/u, '')
        .replace(/\s+/gu, ' ')
        .trim();
    expect(norm(read(STUDIO_DIALOG))).toEqual(norm(read(CABINET_DIALOG)));
  });

  it('ЗЕРКАЛО: слова и числа плана приходят из ЯДРА, дом их не сочиняет', () => {
    for (const p of DIALOGS) {
      const s = read(p);
      expect(s).toContain("from '@membrana/media-library-service'");
      expect(s).toContain('describeMoveBatchPlan(');
      expect(s).toContain('describeMoveBatchOutcome(');
      // Своя формулировка о нехватке места — вторая копия правды, которая разойдётся.
      expect(s, 'дом сочинил своё предупреждение').not.toMatch(/Не всё поместится/u);
      expect(s, 'дом сочинил свой итог').not.toMatch(/Перенесено \$\{/u);
    }
  });

  it('КОГО МОЖНО ВЫБРАТЬ — решает ядро: буфер адресатом не бывает', () => {
    for (const p of DIALOGS) {
      const s = read(p);
      expect(s).toContain('moveBatchTargets(');
      // Свой фильтр адресатов рядом с ядровым — ровно то расхождение, что чинили в #2249.
      expect(s, 'дом завёл свой фильтр адресатов').not.toMatch(/kind !== 'buffer'/u);
    }
  });

  it('СОСТОЯНИЕ ОКНА — в ядре: второй перенос не открывается с планом первого', () => {
    for (const p of DIALOGS) {
      const s = read(p);
      expect(s).toContain('moveBatchReducer');
      expect(s).toContain('MOVE_BATCH_START');
      expect(s, 'состояние окна в useState переживает закрытие — класс ревью #2232').not.toContain(
        'useState',
      );
    }
  });

  it('ДОЛЯ НЕ ВШИТА: ни процентов, ни 70 в носителях', () => {
    // Владелец 27.09: «70% — это просто пример, выдуманная пропорция для наглядности».
    for (const p of [...DIALOGS, CORE]) {
      const s = read(p).replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/(^|[^:])\/\/[^\n]*/gu, '$1');
      expect(s, `${p}: доля в коде — выдуманное число вместо живого`).not.toMatch(/0\.7|70\s*%/u);
    }
  });

  it('ПЛАН ОБЯЗАТЕЛЕН: показ идёт dryRun, перенос — нет', () => {
    for (const p of DIALOGS) {
      const s = read(p);
      expect(s).toContain('dryRun: true');
      expect(s).toContain('dryRun: false');
    }
  });

  it('СЕМАНТИЧЕСКИЙ ТЕКСТ НЕ НА ПОЛУПРОЗРАЧНОМ: плашка предупреждения читается в тёмных темах', () => {
    // Зуб клиента (`semanticSurfaceContrast.test.ts`) кабинетных файлов НЕ читает, а плашка
    // тут одна на два дома — правило повторено там, где второй носитель иначе остался бы
    // без сторожа (класс #2461: `text-warning-content` поверх только `bg-warning/N`).
    for (const p of DIALOGS) {
      const s = read(p).replace(/\/\*[\s\S]*?\*\//gu, ' ');
      expect(s, `${p}: -content подобран под сплошную заливку`).not.toMatch(
        /text-(warning|error|success|info)-content/u,
      );
      expect(s).toContain('alert alert-warning');
    }
  });
});

describe('дома заведены на окно, а не на тихий перенос', () => {
  it('ОБА дома поднимают окно и подают ему порт', () => {
    for (const p of [STUDIO_MODULE, CABINET_PAGE]) {
      const s = read(p);
      expect(s).toContain('<MoveAllToCollectionDialog');
      expect(s).toContain('port={');
      expect(s).toContain('sourceCollectionId=');
    }
  });

  it('ПЕРЕЧЕНЬ — ВЕСЬ НАБОР, а не загруженная страница', () => {
    // Кабинет держит 40 проб из 1057: перенос по странице уехал бы сороковкой с видом
    // успеха. Класс docs/field/decisions-on-partial-data.md.
    for (const p of [STUDIO_MODULE, CABINET_MODEL]) {
      const s = read(p);
      expect(s, 'дом перечисляет пробы не полным списком').toContain('listAllSamples(');
      expect(s).toContain('moveSamplesBatch(');
    }
    expect(read(CABINET_MODEL), 'перечень по странице — занижение').not.toContain(
      'nodeSamples.map((s) => s.id)',
    );
  });

  it('ПОЛНОЕ ЧИСЛО НАБОРА в окне, а не длина страницы (#2237)', () => {
    expect(read(STUDIO_MODULE)).toMatch(/sourceTotal=\{selected\?\.sampleCount/u);
    expect(read(CABINET_PAGE)).toMatch(/sourceTotal=\{lib\.selectedCollection\?\.sampleCount/u);
  });

  it('КНОПКА НЕ ПРИВЯЗАНА К БУФЕРУ: тот же предикат, что у построчного переноса', () => {
    // Привязка «только буфер» уже была дефектом: человек не мог переложить пробы из набора в
    // набор, потому что органа не нарисовали (#2249).
    const studio = read(STUDIO_MODULE);
    expect(studio).toContain('{canMoveFrom && moveTargets.length > 0 ? (');
    expect(studio).toContain('Перенести все');
    const sidebar = read(CABINET_SIDEBAR);
    expect(sidebar).toContain('{canMoveAll ? (');
    expect(sidebar).toContain('Перенести все');
    expect(read(CABINET_MODEL)).toContain('canMoveAll = canMutate && moveTargets.length > 0');
  });

  it('ПЕРЕНОС НЕ ПРИРАВНЕН К УДАЛЕНИЮ: воротам вещдоков он не отдан', () => {
    // Перенос обратим — проба цела, меняется набор. Галочка «понимаю, что удаляю вещдоки»
    // здесь была бы ложью, а от лжи в предупреждении перестают читать все предупреждения.
    for (const p of DIALOGS) {
      // Предмет — КОД, а не проза о нём: объяснение, почему ворот вещдоков здесь нет, само
      // содержит это слово, и построчная проверка покраснела бы на объяснении (класс #2461).
      const s = read(p).replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/(^|[^:])\/\/[^\n]*/gu, '$1');
      expect(s).not.toContain('assessDeletion');
      expect(s).not.toContain('isDeletionBlocked');
      expect(s).not.toContain('вещдок');
    }
    expect(read(STUDIO_MODULE)).not.toMatch(/title: 'Перенести/u);
  });
});
