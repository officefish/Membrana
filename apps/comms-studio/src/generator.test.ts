import { describe, it, expect } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCanon } from './canon.js';
import { checkTone } from './tone-guard.js';
import { describeComponents, lookupGlossaryTerm, V01_COMPONENTS } from './generator.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');

describe('CC9 generator — первый выход v0.1', () => {
  it('производит бриф на каждый компонент + INDEX', () => {
    const arts = describeComponents(loadCanon(REPO_ROOT));
    expect(arts.length).toBe(V01_COMPONENTS.length + 1);
    expect(arts.some((a) => a.name === 'v0.1/INDEX.md')).toBe(true);
  });

  it('каждый бриф проходит канон формы (tone-guard чист)', () => {
    for (const a of describeComponents(loadCanon(REPO_ROOT))) {
      expect(checkTone(a.content)).toEqual([]);
    }
  });

  it('брифы grounded в живом каноне (определение извлечено, не выдумано)', () => {
    const arts = describeComponents(loadCanon(REPO_ROOT));
    const uzel = arts.find((a) => a.name === 'v0.1/sensornyy-uzel.md')!;
    expect(uzel.content).toContain('Микрофон');
    expect(uzel.content).not.toContain('отсутствует в каноне');
  });

  it('lookupGlossaryTerm находит термин и возвращает null для неизвестного', () => {
    const gl = loadCanon(REPO_ROOT).documents.find((d) => d.path.endsWith('GLOSSARY.md'))!.text;
    expect(lookupGlossaryTerm(gl, 'сенсорный узел')?.meaning).toContain('Raspberry Pi');
    expect(lookupGlossaryTerm(gl, 'несуществующий термин')).toBeNull();
  });

  it('без канона бриф помечает отсутствие, а не выдумывает', () => {
    const empty = { repoRoot: '/nope', documents: [], missing: [] as string[] };
    const arts = describeComponents(empty);
    const first = arts.find((a) => a.name.endsWith('.md') && a.name !== 'v0.1/INDEX.md')!;
    expect(first.content).toContain('отсутствует в каноне');
  });
});
