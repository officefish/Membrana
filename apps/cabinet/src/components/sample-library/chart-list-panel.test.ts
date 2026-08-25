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

  it('смонтирована в MainPanel ПОД основным блоком узловой секции — журнальный образец', () => {
    const src = read('components/sample-library/SampleLibraryMainPanel.tsx');
    const body = src.indexOf('rows={nodeSamples}');
    const panel = src.indexOf('<CabinetSampleChartListPanel');
    expect(body).toBeGreaterThan(-1);
    expect(panel).toBeGreaterThan(body);
    expect(src).toContain("selection.kind === 'node' && service && active");
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
