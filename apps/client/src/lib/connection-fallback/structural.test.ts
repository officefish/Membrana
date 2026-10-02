/**
 * Структурные зубы «одна таблица слов, один носитель отказа» (#2540, b1; по образцу
 * `overflow-window/structural.test.ts`). Предмет — файлы клиента вне тестов.
 *
 * Порчи → красный: строковая константа вместо причины в любом `reportConnectionError(…)` —
 * красный; литерал фразы таблицы или заголовка окна вне `reasonTexts.ts` — красный; диалог не
 * импортирует таблицу — красный; `catch {}` без привязки в хуке опроса — красный; второе место
 * записи отказа в журнал (`writeElectronShellLog` вне `journal.ts` в этой зоне) — красный.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { CONNECTION_FAILURE_TEXT, CONNECTION_FALLBACK_TITLE } from './reasonTexts';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const CLIENT_SRC = join(HERE, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules' || name === 'dist') continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/u.test(name)) out.push(p);
  }
  return out;
}

const read = (p: string): string => readFileSync(p, 'utf8');
const rel = (p: string): string => relative(CLIENT_SRC, p).replace(/\\/gu, '/');
const CLIENT_FILES = walk(CLIENT_SRC).filter((p) => !/\.test\.tsx?$/u.test(p));

/** Код без строчных комментариев: слово «catch {}» в пояснении — не порча. */
const stripLineComments = (s: string): string => s.replace(/^\s*\/\/.*$/gmu, '');
const HOOK = stripLineComments(read(join(CLIENT_SRC, 'hooks', 'usePairStatusMonitor.ts')));
const DIALOG = read(join(CLIENT_SRC, 'components', 'node-connection', 'ConnectionFallbackDialog.tsx'));
const STORE = read(join(CLIENT_SRC, 'stores', 'nodeConnectionStore.ts'));

describe('причина отказа не подменяется константой', () => {
  it('ни один вызов reportConnectionError в клиенте не передаёт строковый литерал', () => {
    const offenders = CLIENT_FILES.filter((p) => /reportConnectionError\(\s*['"`]/u.test(read(p))).map(rel);
    expect(offenders).toEqual([]);
  });

  it('хук опроса читает бросок (catch (err)), а не глотает его (catch {)', () => {
    expect(HOOK).not.toMatch(/catch\s*\{/u);
    expect(HOOK).toMatch(/catch\s*\(\s*err\s*\)/u);
    expect(HOOK).toContain('classifyConnectionFailure(err');
  });

  it('константа «cabinet unreachable» из клиента ушла', () => {
    const holders = CLIENT_FILES.filter((p) => read(p).includes('cabinet unreachable')).map(rel);
    expect(holders).toEqual([]);
  });
});

describe('одна таблица слов окна', () => {
  it('диалог читает слова только из reasonTexts.ts', () => {
    expect(DIALOG).toContain("from '@/lib/connection-fallback/reasonTexts'");
    expect(DIALOG).toContain('describeConnectionFailure(');
    expect(DIALOG).not.toMatch(/>\s*Сервер недоступен\s*</u);
  });

  it('фразы таблицы и заголовок окна как литерал диалога не дублируются вне reasonTexts.ts', () => {
    const phrases = Object.values(CONNECTION_FAILURE_TEXT).flatMap((t) => [t.what, t.todo]);
    const title = new RegExp(`(['\`]${CONNECTION_FALLBACK_TITLE}['\`]|>${CONNECTION_FALLBACK_TITLE}<)`, 'u');
    const outside = CLIENT_FILES.filter((p) => {
      if (p.endsWith('reasonTexts.ts')) return false;
      const s = read(p);
      return phrases.some((ph) => s.includes(ph)) || title.test(s);
    }).map(rel);
    expect(outside).toEqual([]);
  });
});

describe('один вход отказа и одна запись в журнал', () => {
  it('стор — единственная воронка: журнал пишется в reportConnectionError, а не у вызывающих', () => {
    expect(STORE).toContain('journalConnectionFailure(failure)');
    expect(HOOK).not.toContain('journalConnectionFailure');
    expect(HOOK).not.toContain('writeElectronShellLog');
  });

  it('writeElectronShellLog в модуле connection-fallback зовётся только из journal.ts', () => {
    const inModule = walk(HERE)
      .filter((p) => !/\.test\.tsx?$/u.test(p) && read(p).includes('writeElectronShellLog('))
      .map(rel);
    expect(inModule).toEqual(['lib/connection-fallback/journal.ts']);
  });
});
