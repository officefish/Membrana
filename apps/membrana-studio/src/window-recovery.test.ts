/**
 * Зубы перезагрузки упавшего окна (дыра №5 карты дежурства 21.11). Красные на стволе d6752fea:
 * модуля нет, `main.ts` не слушает `render-process-gone`/`unresponsive`.
 * Порчи: убрать ограничение → «сдаться» не наступает (красный); забыть окно времени → редкие сбои
 * за сутки копятся и Студия сдаётся зря (красный); повторный «сдаться» засоряет лог (красный).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { RELOAD_MAX_IN_WINDOW, RELOAD_WINDOW_MS, createWindowRecoveryLimiter } from './window-recovery';

const HERE = dirname(fileURLToPath(import.meta.url));
const MIN = 60_000;

describe('ограничитель перезагрузок окна', () => {
  it('первые три сбоя подряд — перезагрузка с номером попытки; четвёртый — отказ', () => {
    const l = createWindowRecoveryLimiter();
    expect(RELOAD_MAX_IN_WINDOW).toBe(3);
    expect(l.onFailure(0)).toEqual({ action: 'reload', attempt: 1 });
    expect(l.onFailure(MIN)).toEqual({ action: 'reload', attempt: 2 });
    expect(l.onFailure(2 * MIN)).toEqual({ action: 'reload', attempt: 3 });
    expect(l.onFailure(3 * MIN)).toEqual({ action: 'give-up', failures: 4 });
  });

  it('после отказа — тишина: ни перезагрузки, ни второй записи об отказе', () => {
    const l = createWindowRecoveryLimiter(1, RELOAD_WINDOW_MS);
    l.onFailure(0);
    expect(l.onFailure(1).action).toBe('give-up');
    expect(l.onFailure(2)).toEqual({ action: 'ignore' });
    expect(l.onFailure(RELOAD_WINDOW_MS * 10)).toEqual({ action: 'ignore' });
  });

  it('редкие сбои (реже окна 10 мин) не копятся: сутки по одному в час — всегда перезагрузка', () => {
    const l = createWindowRecoveryLimiter();
    for (let h = 0; h < 24; h += 1) {
      expect(l.onFailure(h * 60 * MIN).action).toBe('reload');
    }
  });
});

describe('провод в main.ts', () => {
  const main = readFileSync(join(HERE, 'main.ts'), 'utf8');
  it('слушает оба сбоя окна и пишет отказ в shell-лог', () => {
    expect(main).toMatch(/'render-process-gone'/u);
    expect(main).toMatch(/'unresponsive'/u);
    expect(main).toMatch(/createWindowRecoveryLimiter\(/u);
    expect(main).toMatch(/writeShellLog\('error', 'main', 'window recovery: gave up'/u);
  });
});
