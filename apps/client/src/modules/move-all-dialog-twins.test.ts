/**
 * Зубы окна «перенести все» (заказ владельца 27.09): близнецы не расходятся, дома не заводят
 * своих слов о плане, и в пакет слоя доступа отсюда не добавляется НИЧЕГО.
 *
 * Почему зуб читает ФАЙЛЫ, а не рендерит: поведение окна проверено рендером в кабинете
 * (`MoveAllToCollectionDialog.test.tsx`, там настроен jsdom), а вопрос здесь другой —
 * «одинаково ли правило в двух домах и не завёл ли дом обходной путь». Рендер этого не
 * покажет: он проверяет ОДИН дом.
 *
 * ТРЕТИЙ КОНТРАКТ НА ОДНОМ ШВУ. 27.09 две сессии независимо объявили в
 * `packages/services/media-library` два несовместимых `moveSamplesBatch`, и CI каждого PR в
 * одиночку был зелёным: шов между двумя PR не судил никто. По арбитражу ведущей слой доступа
 * приезжает серверной половиной (#2488), а окно берёт оттуда ТИПЫ и зовёт ПОЗИЦИОННЫЙ глагол.
 * Зубы ниже сторожат именно это: своих типов двери у окна нет, форма вызова — как у порта.
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
/**
 * Строки таблицы Studio с #2501 живут своим носителем: листание потребовало ИЗМЕРИМОЙ таблицы
 * (`SampleLibraryTable.tsx`). Предмет зуба поехал за кодом — правило (`canMoveFrom`) осталось в
 * модуле, а ОРГАН построчного переноса рисует таблица.
 */
const STUDIO_TABLE = resolve(REPO, 'apps/client/src/components/sample-library/SampleLibraryTable.tsx');
const CABINET_PAGE = resolve(REPO, 'apps/cabinet/src/pages/SampleLibraryPage.tsx');
const CABINET_SIDEBAR = resolve(REPO, 'apps/cabinet/src/components/sample-library/SampleLibrarySidebar.tsx');
const CABINET_MODEL = resolve(REPO, 'apps/cabinet/src/lib/useCabinetSampleLibrary.ts');

const read = (p: string) => readFileSync(p, 'utf8');
/** Предмет — КОД, а не проза о нём: иначе зуб краснеет на объяснении (класс #2461). */
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/(^|[^:])\/\/[^\n]*/gu, '$1');
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

  it('ТИПЫ ДВЕРИ — ИЗ БОЧКИ ПАКЕТА, своих окно не объявляет', () => {
    for (const p of DIALOGS) {
      const s = code(p);
      expect(s).toContain("from '@membrana/media-library-service'");
      expect(s).toContain('type MoveBatchOutcome');
      // Своё объявление исхода двери = третий контракт на шву, за который уже платили 27.09.
      expect(s, 'окно объявило свой исход двери').not.toMatch(/interface MoveBatchOutcome/u);
      expect(s, 'окно объявило свои причины остатка').not.toMatch(/type MoveBatchStayReason\s*=/u);
    }
  });

  it('ВЫЗОВ ПОРТА ПОЗИЦИОННЫЙ — той же формы, что глагол слоя доступа', () => {
    for (const p of DIALOGS) {
      const s = code(p);
      expect(s).toContain('port.run(sampleIds, state.toCollectionId, { dryRun: true })');
      expect(s).toContain('port.run(sampleIds, toCollectionId, { dryRun: false })');
      // Заказ-объектом был бы второй формой одного вызова — ровно расхождение 27.09.
      expect(s, 'вернулась форма заказа-объектом').not.toMatch(/run\(\{\s*sampleIds/u);
    }
  });

  it('КОГО МОЖНО ВЫБРАТЬ — одно правило: буфер адресатом не бывает', () => {
    for (const p of DIALOGS) {
      const s = code(p);
      expect(s).toContain('moveAllTargets(');
      expect(s).toContain('BUFFER_COLLECTION_ID');
    }
  });

  it('СОСТОЯНИЕ ОКНА — событиями, не useState: второй перенос не открывается с планом первого', () => {
    for (const p of DIALOGS) {
      const s = code(p);
      expect(s).toContain('moveAllReducer');
      expect(s).toContain('MOVE_ALL_START');
      expect(s, 'состояние окна в useState переживает закрытие — класс ревью #2232').not.toContain(
        'useState',
      );
    }
  });

  it('ДОЛЯ НЕ ВШИТА: ни процентов, ни 70 в носителях', () => {
    // Владелец 27.09: «70% — это просто пример, выдуманная пропорция для наглядности».
    for (const p of DIALOGS) {
      expect(code(p), `${p}: доля в коде — выдуманное число вместо живого`).not.toMatch(/0\.7|70\s*%/u);
    }
  });

  it('ПРЕДЕЛ ПАЧКИ — ОБЪЯВЛЕННЫЙ дверью, а не свой', () => {
    // maxBatch приходит в исходе; копия числа в доме разошлась бы с дверью молча.
    for (const p of DIALOGS) {
      const s = code(p);
      expect(s).toContain('outcome.maxBatch');
      expect(s, 'дом завёл свой потолок пачки').not.toMatch(/2000/u);
    }
  });

  it('ПЛАН ОБЯЗАТЕЛЕН: показ идёт dryRun, перенос — нет', () => {
    for (const p of DIALOGS) {
      const s = code(p);
      expect(s).toContain('dryRun: true');
      expect(s).toContain('dryRun: false');
    }
  });

  it('СЕМАНТИЧЕСКИЙ ТЕКСТ НЕ НА ПОЛУПРОЗРАЧНОМ: плашка предупреждения читается в тёмных темах', () => {
    // Зуб клиента (`semanticSurfaceContrast.test.ts`) кабинетных файлов НЕ читает, а плашка
    // одна на два дома — правило повторено там, где второй носитель иначе остался бы без
    // сторожа (класс #2461: `text-warning-content` поверх только `bg-warning/N`).
    for (const p of DIALOGS) {
      expect(code(p), `${p}: -content подобран под сплошную заливку`).not.toMatch(
        /text-(warning|error|success|info)-content/u,
      );
      expect(read(p)).toContain('alert alert-warning');
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
      expect(s, 'дом перечисляет пробы не полным списком').toContain('getBackend().listSamples(');
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

  it('КНОПКА МАССОВОГО ПЕРЕНОСА ЖИВЁТ ТОЛЬКО В БУФЕРЕ — правило одно на два дома', () => {
    /**
     * Слово владельца 27.09: «полагаю, вне буфера она не нужна». Дверь возит пачкой ТОЛЬКО из
     * буфера (`row.inBuffer`), значит вне буфера окно могло сказать человеку ровно одно: «не
     * поедет ничего».
     *
     * ПОРЧА: убрать `canOfferMoveAll(...)` из предиката любого дома (вернуть
     * `canMoveFrom && moveTargets.length > 0` / `canMutate && moveTargets.length > 0`) — зуб
     * краснеет: кнопка снова появилась бы на любом наборе.
     */
    const studio = read(STUDIO_MODULE);
    expect(studio).toContain('const canMoveAll = canMoveFrom && canOfferMoveAll(selectedId, moveTargets);');
    expect(studio).toContain('{canMoveAll ? (');
    expect(studio).toContain('Перенести все');
    const sidebar = read(CABINET_SIDEBAR);
    expect(sidebar).toContain('{canMoveAll ? (');
    expect(sidebar).toContain('Перенести все');
    expect(read(CABINET_MODEL)).toContain(
      'const canMoveAll = canMutate && canOfferMoveAll(moveAllSourceId, moveTargets);',
    );
  });

  it('ПРИЗНАК БУФЕРА — ОДИН на кнопку и на слова окна, второго дом не заводит', () => {
    // Два написания одного признака (`id === BUFFER_COLLECTION_ID` у кнопки и отдельное — у
    // `source.isBuffer`) разъехались бы молча: кнопки нет, а окно говорит «останется в наборе».
    // ПОРЧА: вернуть в дом собственное сравнение с BUFFER_COLLECTION_ID для `isBuffer`.
    expect(read(STUDIO_MODULE)).toContain('isBuffer: isMoveAllSourceBuffer(selectedId)');
    expect(read(CABINET_PAGE)).toContain('isBuffer: lib.sourceIsBuffer');
    expect(read(CABINET_MODEL)).toContain('const sourceIsBuffer = isMoveAllSourceBuffer(moveAllSourceId);');
    for (const p of DIALOGS) {
      expect(code(p)).toContain('export function isMoveAllSourceBuffer');
      expect(code(p)).toContain('export function canOfferMoveAll');
    }
  });

  it('ПОСТРОЧНЫЙ ПЕРЕНОС К БУФЕРУ НЕ ПРИВЯЗАН (#2249): предикаты разведены', () => {
    /**
     * Привязка «только буфер» для ОДИНОЧНОГО переноса была дефектом: человек не мог переложить
     * пробы из набора в набор, потому что органа не нарисовали. `moveSample` работает из любого
     * набора, и его предикат остаётся без буфера — новое условие 27.09 касается только пачки.
     *
     * ПОРЧА: дописать буфер в `canMoveFrom` / `canMutate` — зуб краснеет.
     */
    const studio = read(STUDIO_MODULE);
    expect(studio).toContain('const canMoveFrom = Boolean(selected) && !readOnlyCollection;');
    // Построчный орган («Переместить» у строки пробы) живёт на непривязанном предикате. С #2501
    // орган рисует таблица, а предикат ей передаёт модуль — сторожим и шов, и орган.
    expect(studio).toContain('canMoveFrom={canMoveFrom}');
    expect(read(STUDIO_TABLE)).toContain('{canMoveFrom && moveTargets.length > 0 ? (');
    const model = read(CABINET_MODEL);
    expect(model).toContain('const canMutate = isNodeView && active && !readOnlyCollection && !busy;');
    expect(model, 'построчный перенос привязали к буферу').not.toMatch(
      /canMutate\s*=[^;]*BUFFER_COLLECTION_ID/u,
    );
  });

  it('ПЕРЕНОС НЕ ПРИРАВНЕН К УДАЛЕНИЮ: воротам вещдоков он не отдан', () => {
    // Перенос обратим — проба цела, меняется набор. Галочка «понимаю, что удаляю вещдоки»
    // здесь была бы ложью, а от лжи в предупреждении перестают читать все предупреждения.
    for (const p of DIALOGS) {
      const s = code(p);
      expect(s).not.toContain('assessDeletion');
      expect(s).not.toContain('isDeletionBlocked');
      expect(s).not.toContain('вещдок');
    }
    expect(read(STUDIO_MODULE)).not.toMatch(/title: 'Перенести/u);
  });
});
