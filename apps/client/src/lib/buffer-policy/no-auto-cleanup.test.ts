/**
 * СТРУКТУРНЫЙ ЗУБ: откат на старую автоочистку невозможен (#2308, M1, вердикт (в)).
 *
 * Предмет — исходники каталога `lib/buffer-policy` (кроме зубов и этого файла). Строки
 * `auto-cleanup` / `autoCleanup` в них нет ни как значения, ни как ветки. Порча: завести
 * fallback `'auto-cleanup'` в читателе → красный. Зуб называет, сколько файлов взял.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function sourcesOf(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...sourcesOf(full));
      continue;
    }
    if (!name.endsWith('.ts')) continue;
    if (name.endsWith('.test.ts')) continue;
    out.push(full);
  }
  return out;
}

describe('читатель политики не знает автоочистки', () => {
  const files = sourcesOf(__dirname);

  it('предмет проверки — не пустой каталог', () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it.each(files.map((f) => [f.slice(__dirname.length + 1), f]))('%s: строк auto-cleanup/autoCleanup нет вне комментариев', (_rel, file) => {
    const code = readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n');
    expect(code).not.toMatch(/auto[-_]?cleanup/i);
  });
});
