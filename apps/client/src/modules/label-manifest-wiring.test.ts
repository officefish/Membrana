/**
 * Зубы проводки файла разметки (#2237) и трёх мелких входов класса из карты
 * `docs/field/decisions-on-partial-data.md`.
 *
 * Механика контракта проверяется в ядре
 * (`packages/services/media-library/test/label-manifest.test.ts`); здесь — что дома её
 * ЗОВУТ и не завели обходного пути. Класс, который чиним, ровно про это: правило было, а
 * вызывающий считал по-своему.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..', '..');

const STUDIO = resolve(REPO, 'apps/client/src/modules/SampleLibraryModule.tsx');
const CABINET_HOOK = resolve(REPO, 'apps/cabinet/src/lib/useCabinetSampleLibrary.ts');
const CABINET_PAGE = resolve(REPO, 'apps/cabinet/src/pages/SampleLibraryPage.tsx');

const read = (p: string) => readFileSync(p, 'utf8');

describe('файл разметки: обе половины круга', () => {
  it('выгрузка собирается ЯДРОМ и подаёт полное число набора', () => {
    const s = read(STUDIO);
    expect(s).toContain('buildLabelManifest({');
    expect(s).toContain('collectionTotal: selected.sampleCount ?? null');
    // Прежняя редакция лепила объект руками из загруженной страницы.
    expect(s, 'дом не собирает файл сам — иначе поле полноты обойдут').not.toContain(
      'labels: samples.map((s) => ({',
    );
  });

  it('приём проходит через ворота ядра и умеет ОТКАЗАТЬ словами', () => {
    const s = read(STUDIO);
    expect(s).toContain('readLabelManifest(');
    expect(s).toContain('if (!read.ok)');
    expect(s).toContain('Разметка не принята');
    // Отказ обязан нести причину ядра, а не общую фразу дома.
    expect(s).toContain('read.why');
  });

  it('ПОРЧА: применения мимо ворот нет — метки ставятся только после ok', () => {
    const s = read(STUDIO);
    const gate = s.indexOf('readLabelManifest(');
    const apply = s.indexOf('service.updateSampleLabelNotes(target.id');
    expect(gate, 'ворота должны стоять ДО применения').toBeGreaterThan(-1);
    expect(apply).toBeGreaterThan(gate);
  });

  it('чего нет в наборе — называется числом, а не пропускается молча', () => {
    const s = read(STUDIO);
    expect(s).toContain('нет в наборе');
  });

  it('ТОТ ЖЕ КЛАСС ВНУТРИ ПОЧИНКИ: приём отказывает, если набор загружен не весь', () => {
    // Ревью #2244 поймало это в самой починке: применение шло по загруженной странице, а
    // записи вне неё докладывались как «не найдено в наборе» — хотя в наборе они есть.
    // Полный файл применился бы частично, и человек считал бы, что применил целиком.
    const s = read(STUDIO);
    expect(s).toContain('const inCollection = selected?.sampleCount ?? samples.length');
    expect(s).toContain('if (inCollection > samples.length)');
    expect(s).toContain('дом загрузил');
    expect(s, 'отказ обязан сказать, что делать').toContain('откройте набор целиком');
    // Проверка полноты обязана стоять ДО построения карты имён, иначе она бесполезна.
    expect(s.indexOf('if (inCollection > samples.length)')).toBeLessThan(
      s.indexOf('const byTitle = new Map('),
    );
  });
});

describe('три мелких входа класса закрыты', () => {
  it('счётчик наборов Studio берёт полное число, как близнец в кабинете', () => {
    const s = read(STUDIO);
    expect(s).toContain('col.sampleCount ?? (snapshot.samplesByCollection[col.id] ?? []).length');
  });

  it('«размечено N из M»: M — полное число набора, а не размер страницы', () => {
    const s = read(STUDIO);
    expect(s).toContain('из {selected?.sampleCount ?? samples.length}');
    expect(s, 'когда страница не вся — так и сказано').toContain('на этой странице');
    expect(s).not.toContain('размечено {labeledCount} из {samples.length}');
  });

  it('СТРАНИЧНЫЙ ИСТОЧНИК сам отдаёт полное число — компенсация не в вызывающем', () => {
    // Это самый коварный из трёх: компенсация жила у вызывающего, и следующий потребитель
    // источника про неё не узнал бы — класс был встроен в устройство и ждал нового вызова.
    const hook = read(CABINET_HOOK);
    expect(hook).toContain('const nodeSamplesTotal');
    expect(hook).toContain('nodePageData?.total');
    expect(hook.match(/^\s*nodeSamplesTotal,$/mu), 'источник обязан ОТДАВАТЬ его наружу').not.toBeNull();
    expect(read(CABINET_PAGE)).toContain('lib.nodeSamplesTotal');
  });
});
