/**
 * Зубы панели управления буфером (#2204) — статический договор между файлами, как у соседней
 * панели отбора: у кабинета нет DOM-обвязки в тестах, а предмет здесь не поведение React, а
 * несущие свойства, которые ревью и слово владельца требовали назвать.
 *
 * Главное свойство, которое эти зубы стерегут: НЕЛЬЗЯ УДАЛИТЬ, НЕ ПОКАЗАВ. Кнопка удаления
 * живёт внутри ветки показанного плана, и список идентификаторов берётся из него же.
 *
 * ГРАНИЦА МЕТОДА НАЗВАНА ЧЕСТНО. Порча показала, чего статика не умеет: зуб на подстроку
 * `plan.shortfall` остаётся зелёным, если условие показа заменить на `false` — текст-то на
 * месте. Поэтому проверяются ТОЧНЫЕ условия показа, а не упоминание поля. Полностью класс
 * закрыл бы рендер-тест, но DOM-обвязки (jsdom/testing-library) в репозитории нет ни у одного
 * приложения, и заводить её — отдельная работа, а не довесок к этому куску.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const CABINET_SRC = fileURLToPath(new URL('../../', import.meta.url));
const read = (rel: string) => readFileSync(join(CABINET_SRC, rel), 'utf8');
const PANEL = 'components/buffer-manager/BufferManagerPanel.tsx';

describe('панель управления буфером', () => {
  it('панель существует и объявляет себя регионом для читалок', () => {
    const src = read(PANEL);
    expect(src).toContain('role="region"');
    expect(src).toContain('aria-label="Управление буфером"');
  });

  it('словари ручек — из общего ядра, а не своя копия чисел', () => {
    const src = read(PANEL);
    expect(src).toContain('BUFFER_CLEANUP_PRINCIPLES');
    expect(src).toContain('BUFFER_CLEANUP_VOLUMES');
    expect(src).toContain("from '@membrana/media-library-service'");
    // Своих литералов объёма быть не должно: разойдутся с ядром и сервером.
    expect(src).not.toMatch(/\[\s*20\s*,\s*50\s*,\s*100\s*,\s*200\s*\]/u);
  });

  it('удаление идёт ТОЛЬКО по идентификаторам показанного плана', () => {
    const src = read(PANEL);
    expect(src).toContain('plan.doomed.map((row) => row.id)');
    expect(src).toContain('service.executeBufferCleanup(');
  });

  it('кнопка удаления живёт внутри ветки плана — без показа её просто нет', () => {
    const src = read(PANEL);
    const planBranch = src.slice(src.indexOf('{plan ? ('));
    expect(planBranch).toContain('btn-error');
    // До ветки плана кнопки удаления быть не должно.
    expect(src.slice(0, src.indexOf('{plan ? ('))).not.toContain('btn-error');
  });

  it('необратимость сказана словами на самой кнопке, а не в подсказке', () => {
    expect(read(PANEL)).toContain('без возврата');
  });

  it('защищённые и недобор показываются по ДАННЫМ, а не по литералу-условию', () => {
    const src = read(PANEL);
    // Условие целиком: подмена его на false оставила бы упоминание поля, но убрала показ.
    expect(src).toContain('{plan.protectedOut.length > 0 ? (');
    expect(src).toContain('{plan.shortfall ? (');
    expect(src).toContain('row.why');
  });

  it('итог уборки называет и отказы: сколько ушло и кого не тронули', () => {
    const src = read(PANEL);
    expect(src).toContain('done.deleted');
    expect(src).toContain('{done.refused.length > 0 ? (');
  });

  it('после уборки план сбрасывается — показывать удалённое как «что уйдёт» нельзя', () => {
    const src = read(PANEL);
    const afterExecute = src.slice(src.indexOf('const outcome = await service.executeBufferCleanup'));
    expect(afterExecute).toContain('setPlan(null)');
  });
});

describe('крепление в журнале — ТА ЖЕ панель, второй раскладки нет', () => {
  it('журнал показывает того же жильца тем же компонентом', () => {
    const page = read('pages/JournalPage.tsx');
    expect(page).toContain("'membrana.showcase.buffer-manager'");
    expect(page).toContain('<BufferManagerPanel');
  });

  it('своей панели журнал не заводит: компонент один на оба дома', () => {
    const page = read('pages/JournalPage.tsx');
    expect(page).toContain("from '@/components/buffer-manager/BufferManagerPanel'");
    // Второго файла панели быть не должно — искать его негде, кроме общей папки.
    expect(page).not.toMatch(/JournalBufferManager|BufferManagerJournalPanel/u);
  });

  it('жилец объявлен МЕСТНЫМ поверх домовых: журнальный дом его не исполняет', () => {
    const page = read('pages/JournalPage.tsx');
    expect(page).toContain('withLocalTenants(homePluginSource, JOURNAL_LOCAL_TENANTS)');
    const tenants = page.slice(page.indexOf('JOURNAL_LOCAL_TENANTS'), page.indexOf('export function JournalPage'));
    expect(tenants).toContain("mountTarget: 'background-media/collections'");
    expect(tenants).toContain('enabled: true');
  });

  it('буфер адресуется константой набора, а не строкой-литералом на странице', () => {
    const page = read('pages/JournalPage.tsx');
    expect(page).toContain('collectionId={BUFFER_COLLECTION_ID}');
    expect(page).toContain("BUFFER_COLLECTION_ID } from '@membrana/media-library-service'");
  });

  it('занятость буфера берётся у квоты узла, выбранного в журнале', () => {
    const page = read('pages/JournalPage.tsx');
    expect(page).toContain('useCabinetMediaLibrary(journal.selectedDeviceId)');
    expect(page).toContain('media.snapshot.quota.bufferUsedBytes');
  });
});

describe('крепление в библиотеке', () => {
  it('панель — ЖИЛЕЦ зоны плагинов страницы, а не блок в потоке', () => {
    const page = read('pages/SampleLibraryPage.tsx');
    expect(page).toContain('BUFFER_MANAGER_MANIFEST');
    expect(page).toContain('<BufferManagerPanel');
  });

  it('жилец объявлен включённым и БЕРЁТ манифест у носителя, а не переписывает его', () => {
    // Ревью #2211: инлайн-копия манифеста уже разошлась с носителем. Второго описания
    // одного плагина быть не должно — страница обязана импортировать, а не диктовать.
    const page = read('pages/SampleLibraryPage.tsx');
    const tenant = page.slice(page.indexOf('LIBRARY_TENANTS'), page.indexOf('export function SampleLibraryPage'));
    expect(tenant).toContain('{ enabled: true, manifest: BUFFER_MANAGER_MANIFEST }');
    expect(tenant).not.toMatch(/id: 'membrana\.showcase\.buffer-manager'/u);
    expect(page).toContain("BUFFER_MANAGER_MANIFEST } from '@membrana/media-library-service'");
  });

  it('занятость буфера берётся у квоты узла, а не считается панелью заново', () => {
    const page = read('pages/SampleLibraryPage.tsx');
    expect(page).toContain('lib.snapshot.quota.bufferUsedBytes');
    expect(page).toContain('lib.snapshot.quota.bufferLimitBytes');
  });
});
