/**
 * Структурные зубы «один носитель, два входа» (M5 (г), DoD 4, #2310). Предмет — файлы модуля
 * `overflow-window/`, адаптеры (панель микрофона, доска), пакет `device-board`.
 *
 * Порчи → красный: вторая модалка «буфер полон» (второй `role="dialog"` с этим заголовком в
 * клиенте или доске) — красный; вторая таблица код→текст (литералы словаря вне
 * `reasonTexts.ts`/контрактов/тестов) — красный; запрос квоты внутри модуля окна
 * (`getQuota`/`refresh(`/`fetch(`/`useMediaLibrary`) — красный; чистка мимо общих ворот
 * удаления (`window.confirm` / прямой `clearBuffer` в модуле) — красный; адаптеры зовут
 * `release(` (снятие удержания мимо окна) — красный.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { OVERFLOW_REASON_TEXT } from './reasonTexts';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const CLIENT_SRC = join(HERE, '..', '..');
const REPO = join(CLIENT_SRC, '..', '..', '..');
const DEVICE_BOARD_SRC = join(REPO, 'packages', 'device-board', 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (name === 'node_modules' || name === 'dist') continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/u.test(name)) out.push(p);
  }
  return out;
}

const read = (p: string) => readFileSync(p, 'utf8');
const isTest = (p: string) => /\.test\.tsx?$/u.test(p);

const MODULE_FILES = walk(HERE).filter((p) => !isTest(p));
const CLIENT_FILES = walk(CLIENT_SRC).filter((p) => !isTest(p));
const BOARD_FILES = walk(DEVICE_BOARD_SRC).filter((p) => !isTest(p));

describe('один носитель модалки «Буфер полон»', () => {
  it('ровно один файл в клиенте и доске рисует диалог с заголовком окна', () => {
    const carriers = [...CLIENT_FILES, ...BOARD_FILES].filter((p) => {
      const s = read(p);
      return s.includes('role="dialog"') && /overflow-window|overflow-roads|OverflowWindowProps/u.test(s);
    });
    expect(carriers.map((p) => relative(REPO, p).replace(/\\/gu, '/'))).toEqual([
      'apps/client/src/lib/overflow-window/OverflowWindow.tsx',
    ]);
  });

  it('литерал заголовка «Буфер полон» как строка диалога не дублируется вне таблицы текстов', () => {
    const outside = [...CLIENT_FILES, ...BOARD_FILES].filter(
      (p) => !p.endsWith('reasonTexts.ts') && read(p).includes("'Буфер полон'"),
    );
    expect(outside).toEqual([]);
  });
});

describe('одна таблица код→текст', () => {
  it('литералы словаря отказа в клиенте и доске — только в reasonTexts.ts (через константы) и в носителе-стражe', () => {
    const literal = /'(device_buffer_full|user_storage_full)'/u;
    const holders = [...CLIENT_FILES, ...BOARD_FILES].filter((p) => literal.test(read(p)));
    // Строковых литералов в клиенте быть не должно вовсе: ключи таблицы — из `BUFFER_OVERFLOW_REASONS`.
    expect(holders.map((p) => relative(REPO, p).replace(/\\/gu, '/'))).toEqual([]);
  });

  it('пакет доски своих слов о причинах не имеет: тексты приходят из клиента готовыми', () => {
    const table = Object.values(OVERFLOW_REASON_TEXT);
    const boardWords = BOARD_FILES.filter((p) => {
      const s = read(p);
      return table.some((t) => s.includes(t)) || /device_buffer_full|user_storage_full/u.test(s);
    });
    expect(boardWords.map((p) => relative(REPO, p).replace(/\\/gu, '/'))).toEqual([]);
    // В бейдже — только префикс «Буфер полон ·» + reasonText из view; таблицы нет.
    expect(read(join(DEVICE_BOARD_SRC, 'components', 'board-overflow-hold-badge.tsx'))).not.toMatch(/Record</u);
  });
});

describe('окно без второго запроса квоты и без обхода ворот', () => {
  it.each(MODULE_FILES.map((p) => [relative(HERE, p).replace(/\\/gu, '/'), p]))(
    '%s: нет getQuota / refresh( / fetch( / useMediaLibrary / init(',
    (_name, p) => {
      const s = read(p);
      expect(s).not.toMatch(/getQuota|\.refresh\(|fetch\(|useMediaLibrary\b|\.init\(/u);
    },
  );

  it('чистка — только через общие ворота удаления (#2218): DeletionConfirmDialog, не window.confirm', () => {
    const host = read(join(HERE, 'OverflowWindowHost.tsx'));
    expect(host).toContain('DeletionConfirmDialog');
    expect(host).toContain('requestClearMediaLibraryBuffer');
    for (const p of MODULE_FILES) {
      expect(read(p), p).not.toMatch(/window\.confirm|\.clearBuffer\(|removeSample\(/u);
    }
  });

  it('release из окна — только releaseByHuman контроллера; закрытие release не зовёт', () => {
    const controller = read(join(HERE, 'controller.ts'));
    const closeBody = controller.slice(controller.indexOf('close(): void'), controller.indexOf('releaseByHuman(): void'));
    expect(closeBody).not.toContain('release(');
    expect(controller).toContain("this.hold.release('human')");
    const window = read(join(HERE, 'OverflowWindow.tsx'));
    expect(window).not.toMatch(/release\(|getDeviceOverflowHold/u);
  });
});

describe('два входа — адаптеры без своей модалки', () => {
  const PLASHKA = read(join(HERE, 'OverflowHoldPlashka.tsx'));
  const BOARD_VIEW = read(join(HERE, 'useOverflowHoldBoardView.ts'));
  const MIC_PANEL = read(join(CLIENT_SRC, 'plugins', 'mic-buffer-recorder', 'MicBufferRecorderPanel.tsx'));
  const APP = read(join(CLIENT_SRC, 'App.tsx'));
  const SHELL = read(join(DEVICE_BOARD_SRC, 'components', 'device-board-shell.tsx'));

  it('плашка и адаптер доски открывают окно ТОЛЬКО через контроллер (openForCurrentEpisode)', () => {
    for (const src of [PLASHKA, BOARD_VIEW]) {
      expect(src).toContain('openForCurrentEpisode');
      expect(src).not.toContain('role="dialog"');
      expect(src).not.toMatch(/\.release\(/u);
    }
  });

  it('панель микрофона несёт плашку, App — хост и бейдж доски, shell доски — бейдж и строку статуса', () => {
    expect(MIC_PANEL).toContain('<OverflowHoldPlashka />');
    expect(APP).toContain('<OverflowWindowHost />');
    expect(APP).toContain('overflowHold={overflowHoldBoardView}');
    expect(SHELL).toContain('<BoardOverflowHoldBadge hold={overflowHold} />');
    expect(SHELL).toContain('overflowHold={overflowHold}');
  });

  it('хост окна смонтирован в приложении ровно один раз (вхождений, не файлов)', () => {
    const mounts = CLIENT_FILES.flatMap((p) => {
      const count = read(p).split('<OverflowWindowHost').length - 1;
      return count > 0 ? [`${relative(REPO, p).replace(/\\/gu, '/')}×${count}`] : [];
    });
    expect(mounts).toEqual(['apps/client/src/App.tsx×1']);
  });
});
