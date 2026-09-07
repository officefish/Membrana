/**
 * СТРУКТУРНЫЙ ЗУБ: откат на старую автоочистку невозможен (#2308, M1, вердикт (в)).
 *
 * Два яруса:
 *  1. Каталог читателя `lib/buffer-policy` (норма блока B): строк `auto-cleanup` / `autoCleanup`
 *     нет ни как значения, ни как ветки, ни как идентификатора (вне комментариев).
 *  2. Поднято на интеграции (адаптер BC-2 контракта `cowork-buffer-full-stop`): литерала
 *     `'auto-cleanup'` / `"auto-cleanup"` нет ни в одном боевом исходнике `apps/client/src` и
 *     `packages/services/media-library/src` — плагин микрофона больше не хозяин политики, а тип
 *     `BufferPressurePolicy` = `OverflowPolicy` словаря.
 *
 * Правило исключения (названо явно): файлы зубов `*.test.ts` / `*.test.tsx` не сканируются —
 * в них `'auto-cleanup'` законен как ПОРЧА на входе читателя (`effective(auto-cleanup) = stop`).
 * Порчи → красный: fallback `'auto-cleanup'` в читателе; дефолт `'auto-cleanup'` в конфиге или
 * состоянии плагина; литерал вернулся в `buffer-stop.ts`. Зуб называет, сколько файлов взял.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const CLIENT_SRC = resolve(__dirname, '..', '..');
const MEDIA_LIBRARY_SRC = resolve(CLIENT_SRC, '..', '..', '..', 'packages', 'services', 'media-library', 'src');

function isTestFile(name: string): boolean {
  return /\.test\.tsx?$/u.test(name) || /\.spec\.tsx?$/u.test(name);
}

function sourcesOf(dir: string, exts: readonly string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      out.push(...sourcesOf(full, exts));
      continue;
    }
    if (!exts.some((ext) => name.endsWith(ext))) continue;
    if (isTestFile(name)) continue;
    out.push(full);
  }
  return out;
}

function withoutCommentLines(code: string): string {
  return code
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line))
    .join('\n');
}

describe('читатель политики не знает автоочистки (ярус 1 — каталог B)', () => {
  const files = sourcesOf(__dirname, ['.ts']);

  it('предмет проверки — не пустой каталог', () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it.each(files.map((f) => [f.slice(__dirname.length + 1), f]))('%s: строк auto-cleanup/autoCleanup нет вне комментариев', (_rel, file) => {
    expect(withoutCommentLines(readFileSync(file, 'utf8'))).not.toMatch(/auto[-_]?cleanup/i);
  });
});

describe("литерала 'auto-cleanup' нет в apps/client/src и media-library/src (ярус 2 — BC-2)", () => {
  const files = [
    ...sourcesOf(CLIENT_SRC, ['.ts', '.tsx']),
    ...sourcesOf(MEDIA_LIBRARY_SRC, ['.ts', '.tsx']),
  ];
  const LITERAL = /['"`]auto-cleanup['"`]/u;

  it('предмет проверки не пуст: взяты боевые исходники клиента и библиотеки (без зубов)', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files.some((f) => f.endsWith('micBufferRecorderPluginState.ts'))).toBe(true);
    expect(files.some((f) => f.endsWith('buffer-stop.ts'))).toBe(true);
    expect(files.some((f) => isTestFile(f))).toBe(false);
  });

  it("ни один боевой файл не несёт литерал 'auto-cleanup' (комментарии не в счёт)", () => {
    const offenders = files
      .filter((file) => LITERAL.test(withoutCommentLines(readFileSync(file, 'utf8'))))
      .map((file) => relative(resolve(CLIENT_SRC, '..', '..', '..'), file).replace(/\\/gu, '/'))
      .sort();
    expect(offenders).toEqual([]);
  });
});
