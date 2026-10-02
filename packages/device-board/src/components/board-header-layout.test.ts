/**
 * Структурные зубы раскладки шапки доски (#2552). Предмет — `device-board-shell.tsx` (левая
 * группа) и `types/board-ui.ts` (константа её класса).
 *
 * jsdom раскладку не считает, поэтому зуб честен только по значению класса и по исходнику:
 * левая группа `flex-1 min-w-0` обязана клиповать содержимое по горизонтали — иначе дети
 * `shrink-0` (бейджи) вытекают под правую группу инструментов, которая стоит позже в DOM и
 * рисуется поверх (снимок владельца 01.10: бейдж удержания под галкой INFO при ≈1270 px).
 *
 * Порчи → красный: из константы пропал `overflow-x-clip` или `min-w-0` — красный; шапка
 * собирает класс левой группы литералом мимо константы — красный; у константы появился
 * `overflow-hidden` (срезает кольцо фокуса кнопок по вертикали и делает группу прокручиваемой)
 * — красный.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BOARD_HEADER_LEAD_GROUP_CLASS } from '../types/board-ui.js';

const SHELL_SOURCE = readFileSync(join(process.cwd(), 'src', 'components', 'device-board-shell.tsx'), 'utf8');

describe('шапка доски: левая группа не выпускает содержимое под правую (#2552)', () => {
  it('константа класса левой группы клипует по горизонтали и умеет сжиматься', () => {
    const classes = BOARD_HEADER_LEAD_GROUP_CLASS.split(/\s+/u);
    expect(classes).toContain('flex-1');
    expect(classes).toContain('min-w-0');
    expect(classes).toContain('overflow-x-clip');
    expect(classes).not.toContain('overflow-hidden');
  });

  it('шапка берёт класс левой группы из константы, а не литералом', () => {
    expect(SHELL_SOURCE).toContain('${BOARD_HEADER_LEAD_GROUP_CLASS} ${headerContentOffsetClass}');
    // Литерал прежней формы (без клипа) в шапке больше не живёт.
    expect(SHELL_SOURCE).not.toMatch(/className=\{`flex min-w-0 flex-1 items-center gap-3 \$\{headerContentOffsetClass\}`\}/u);
  });
});
