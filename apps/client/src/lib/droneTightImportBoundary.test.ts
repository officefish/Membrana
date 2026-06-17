import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const CLIENT_SRC = fileURLToPath(new URL('.', import.meta.url));

/** Пути/паттерны, запрещённые в client (curated trends-data must live in template-match package). */
const FORBIDDEN_SNIPPETS = [
  'curated-drone-templates.json',
  'fft-last-chance-best-template.json',
  'detectors/template-match/src/data/',
] as const;

function walkSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walkSourceFiles(abs, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      acc.push(abs);
    }
  }
  return acc;
}

describe('droneTightImportBoundary', () => {
  it('client src does not import local curated trends JSON or deep template-match data paths', () => {
    const root = join(CLIENT_SRC, '..');
    const violations: string[] = [];

    for (const file of walkSourceFiles(root)) {
      const text = readFileSync(file, 'utf8');
      for (const snippet of FORBIDDEN_SNIPPETS) {
        if (text.includes(snippet)) {
          violations.push(`${relative(root, file)}: forbidden "${snippet}"`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('droneTightCalibration uses template-match public API only', () => {
    const text = readFileSync(join(CLIENT_SRC, 'droneTightCalibration.ts'), 'utf8');
    expect(text).toContain('@membrana/template-match-detector-service');
    expect(text).not.toContain('curated-drone-templates.json');
  });
});
