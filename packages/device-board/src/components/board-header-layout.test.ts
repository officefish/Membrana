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

import {
  BOARD_BREADCRUMB_SHRINK_CLASS,
  BOARD_HEADER_LEAD_GROUP_CLASS,
  BOARD_HOLD_BADGE_MIN_WIDTH_CLASS,
} from '../types/board-ui.js';

const SHELL_SOURCE = readFileSync(join(process.cwd(), 'src', 'components', 'device-board-shell.tsx'), 'utf8');
const BADGE_SOURCE = readFileSync(join(process.cwd(), 'src', 'components', 'board-overflow-hold-badge.tsx'), 'utf8');
const BREADCRUMB_SOURCE = readFileSync(
  join(process.cwd(), 'src', 'components', 'board-canvas-breadcrumb.tsx'),
  'utf8',
);

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

/**
 * #2558 (красные на стволе 7c895b5e): при ≈1065 px бейдж удержания исчезал ПЕРВЫМ — два сжимаемых
 * ребёнка (бейдж и крошка) с одним весом доходили до нуля одновременно, остальные `shrink-0`
 * вытекали, клип `overflow-x-clip` резал правый хвост, а бейдж стоял в DOM правее «Сохранить».
 * Уступка задаётся положением + весом + полом; jsdom раскладку не считает — зуб по исходнику и
 * по значению констант.
 */
describe('шапка доски: бейдж удержания уступает последним (#2558)', () => {
  it('P2: бейдж удержания стоит в DOM левой группы раньше слота спиннера и кнопки «Сохранить»', () => {
    const groupAt = SHELL_SOURCE.indexOf('${BOARD_HEADER_LEAD_GROUP_CLASS} ${headerContentOffsetClass}');
    const badgeAt = SHELL_SOURCE.indexOf('<BoardOverflowHoldBadge');
    const spinnerSlotAt = SHELL_SOURCE.indexOf('flex h-5 w-5 shrink-0 items-center justify-center');
    const saveAt = SHELL_SOURCE.indexOf('graph.saveScenario()');
    expect(groupAt).toBeGreaterThan(-1);
    expect(badgeAt).toBeGreaterThan(groupAt);
    expect(badgeAt).toBeLessThan(spinnerSlotAt);
    expect(spinnerSlotAt).toBeLessThan(saveAt);
    // Бейдж в шапке один — порча «второй бейдж на старом месте» не пройдёт.
    expect(SHELL_SOURCE.split('<BoardOverflowHoldBadge')).toHaveLength(2);
  });

  it('пол бейджа и вес крошки — константами по значению, не литералами в компонентах', () => {
    expect(BOARD_HOLD_BADGE_MIN_WIDTH_CLASS).toMatch(/^min-w-\[\d+(\.\d+)?rem\]$/u);
    expect(BOARD_BREADCRUMB_SHRINK_CLASS).toMatch(/^shrink-\[([2-9]|\d{2,})\]$/u);
    expect(BADGE_SOURCE).toContain('${BOARD_HOLD_BADGE_MIN_WIDTH_CLASS}');
    expect(BADGE_SOURCE).not.toMatch(/min-w-\[/u);
    expect(BREADCRUMB_SOURCE).toContain('${BOARD_BREADCRUMB_SHRINK_CLASS}');
    expect(BREADCRUMB_SOURCE).not.toMatch(/shrink-\[/u);
  });
});
