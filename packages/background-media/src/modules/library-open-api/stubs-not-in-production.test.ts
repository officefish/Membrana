/**
 * Зуб регламента коворка: СТАБ НЕ ДОЖИВАЕТ ДО ПРОДА.
 *
 * `docs/COWORK_SPRINT_REGULATION.md` говорит это дважды — строкой 51 («стаб, доживший до
 * прода, — дефект интеграции») и строкой 214 («стабы не мёржить»). До этого зуба обе строки
 * были обещанием: тимлидское ревью #2267 нашло три стаба в `src/**`, и проверка показала, что
 * они не просто лежат в дереве, а **компилируются в `dist`** — сборка исключала только
 * `*.test.ts`.
 *
 * Правило разложено на две половины, и обе проверяемы:
 *
 * 1. СБОРКА не выносит стабы наружу — держится `exclude` в `tsconfig.json`;
 * 2. БОЕВОЙ КОД их не зовёт — держится этим зубом.
 *
 * Первую половину без второй обойти легко: достаточно импортировать стаб из боевого файла, и
 * он поедет в `dist` уже как зависимость, мимо `exclude`. Поэтому проверяются обе.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Все файлы `src/**`, кроме самих тестов и содержимого каталогов `stubs/`. */
function productionFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'stubs') continue;
      productionFiles(full, acc);
      continue;
    }
    if (!entry.endsWith('.ts')) continue;
    if (entry.endsWith('.test.ts') || entry.endsWith('.spec.ts')) continue;
    acc.push(full);
  }
  return acc;
}

describe('стаб не доживает до прода (регламент коворка)', () => {
  it('ни один боевой файл не импортирует из stubs/', () => {
    const offenders: string[] = [];
    for (const file of productionFiles(SRC)) {
      const src = readFileSync(file, 'utf8');
      // Ловим и статический импорт, и динамический: обходной путь через `await import`
      // так же протащил бы стаб в граф рантайма.
      if (/from\s+['"][^'"]*\/stubs\//u.test(src) || /import\(\s*['"][^'"]*\/stubs\//u.test(src)) {
        offenders.push(file.slice(SRC.length + 1).replace(/\\/gu, '/'));
      }
    }
    expect(offenders, `боевой код зовёт стаб: ${offenders.join(', ')}`).toEqual([]);
  });

  it('сборка объявила stubs/ исключёнными — обещание превращено в факт', () => {
    // Читаем сам `tsconfig.json`, а не верим комментарию: снимут строку — покраснеет здесь.
    const tsconfig = readFileSync(resolve(SRC, '..', 'tsconfig.json'), 'utf8');
    expect(tsconfig, 'stubs/ снова поедут в dist').toContain('**/stubs/**');
  });

  it('стабы существуют и остаются исполняемыми — правило не про их удаление', () => {
    // Обратный конец: зуб не должен подталкивать «удалить стабы и дело с концом». Они нужны
    // тестам блоков; запрет ровно один — не попадать в производственный граф.
    const kept = [
      'modules/library-ownership/stubs/in-memory-sample-reader.stub.ts',
      'modules/track-keys/stubs/neighbors.stub.ts',
    ];
    for (const rel of kept) {
      expect(() => statSync(resolve(SRC, rel)), `${rel} исчез`).not.toThrow();
    }
  });
});
