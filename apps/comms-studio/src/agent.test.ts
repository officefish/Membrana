import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCanon, canonText } from './canon.js';
import { checkTone } from './tone-guard.js';
import { writeArtifact, resolveOutPath, OutWriteError } from './out-writer.js';
import { runAgent, type CanonContext } from './index.js';
import { CANON_SOURCES } from './canon-sources.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const PKG_ROOT = resolve(HERE, '..');

describe('CC8 canon — живое чтение', () => {
  it('читает весь объявленный канон из рабочей копии, ничего не missing', () => {
    const ctx = loadCanon(REPO_ROOT);
    expect(ctx.documents.length).toBe(CANON_SOURCES.length);
    expect(ctx.missing).toEqual([]);
    expect(ctx.documents.every((d) => d.available && d.text.length > 0)).toBe(true);
  });

  it('missing-источник помечается, а не выдумывается', () => {
    const base = mkdtempSync(join(tmpdir(), 'canon-'));
    try {
      const ctx = loadCanon(base);
      expect(ctx.missing.length).toBe(CANON_SOURCES.length);
      expect(canonText(ctx, CANON_SOURCES[0]!)).toBeNull();
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('CC8 tone-guard — канон формы', () => {
  it('чистый инженерный текст проходит', () => {
    expect(checkTone('Сенсорный узел фиксирует акустический отпечаток дрона.')).toEqual([]);
  });

  it('ловит хайп, военную риторику и эмодзи', () => {
    const hype = checkTone('Это революционное и уникальное решение.');
    expect(hype.map((v) => v.category)).toContain('hype');
    const mil = checkTone('Обнаружение на поле боя против противника.');
    expect(mil.map((v) => v.category)).toContain('military');
    const emoji = checkTone('Наш продукт 🚀 огонь');
    expect(emoji.map((v) => v.category)).toContain('emoji');
  });
});

describe('CC8 out-writer — пишет только в out/', () => {
  it('отклоняет путь вне out/ (../ escape и абсолютный)', () => {
    expect(() => resolveOutPath(PKG_ROOT, '../secrets.md')).toThrow(OutWriteError);
    expect(() => resolveOutPath(PKG_ROOT, '/etc/passwd')).toThrow(OutWriteError);
  });

  it('пишет валидный артефакт и отклоняет нарушающий канон', () => {
    const base = mkdtempSync(join(tmpdir(), 'outw-'));
    try {
      const ok = writeArtifact(base, 'brief.md', '# Membrana\nНаблюдательная система.\n');
      expect(existsSync(ok.path)).toBe(true);
      expect(readFileSync(ok.path, 'utf8')).toContain('Наблюдательная');
      expect(() => writeArtifact(base, 'bad.md', 'Революционный прорыв 🚀')).toThrow(OutWriteError);
      expect(existsSync(resolve(base, 'out', 'bad.md'))).toBe(false);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('CC8 runAgent — оркестрация', () => {
  it('refresh=false → канон читается, генератор пишет в out/, guard применён', async () => {
    const base = mkdtempSync(join(tmpdir(), 'agent-'));
    try {
      const generate = (canon: CanonContext) => {
        // Генератор видит живой канон и производит чистый артефакт.
        expect(canon.missing).toEqual([]);
        return [{ name: 'v0.1/summary.md', content: '# Итог\nСеть сенсорных узлов.\n' }];
      };
      const res = await runAgent({ pkgRoot: base, repoRoot: REPO_ROOT, generate, refresh: false });
      expect(res.refreshed).toBe(false);
      expect(res.written.length).toBe(1);
      expect(existsSync(resolve(base, 'out', 'v0.1', 'summary.md'))).toBe(true);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('нарушающий генератор роняет прогон (guard на записи)', async () => {
    const base = mkdtempSync(join(tmpdir(), 'agent-bad-'));
    try {
      const generate = () => [{ name: 'x.md', content: 'Беспрецедентный AI-powered прорыв' }];
      await expect(runAgent({ pkgRoot: base, repoRoot: REPO_ROOT, generate })).rejects.toThrow(OutWriteError);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
