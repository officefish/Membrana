/**
 * Структурный зуб адаптера C-1 (контракт интеграции `cowork-buffer-full-stop`, шов C→кабинет):
 * карточка узла в `NodesPage.tsx` проведена к предикату жизни и строке удержания блока C.
 *
 * Предмет — исходник `NodesPage.tsx`. Порчи → красный: снять `<NodeOverflowHoldLine />`;
 * считать vitality без `overflowHold` из состояния узла; вернуть безусловную подпись
 * «Сценарий остановлен» при `stopped_buffer_full`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const PAGE = readFileSync(resolve(__dirname, 'NodesPage.tsx'), 'utf8');

describe('NodesPage — проводка удержания (C-1)', () => {
  it('vitality считается предикатом C из состояния узла и presence', () => {
    expect(PAGE).toContain("import { resolveNodeCardStatus, resolveNodeVitality } from '@/lib/nodeCardStatus'");
    expect(PAGE).toContain('const overflowHold = state?.overflowHold ?? null;');
    expect(PAGE).toMatch(/resolveNodeVitality\(\{\s*presenceOnline: deviceLive,\s*lastPresenceAtMs: null,\s*nowMs: Date\.now\(\),\s*overflowHold,\s*\}\)/u);
  });

  it('строка «жив · не пишет · буфер полон» отрисована в карточке', () => {
    expect(PAGE).toContain("import { NodeOverflowHoldLine } from '@/components/nodes/NodeOverflowHoldLine'");
    expect(PAGE).toContain('<NodeOverflowHoldLine vitality={vitality} hold={overflowHold} />');
  });

  it('при stopped_buffer_full подпись «Сценарий остановлен» заменяется словом удержания', () => {
    const srOnly = PAGE.slice(PAGE.indexOf('className="sr-only"'), PAGE.indexOf('<NodeOverflowHoldLine'));
    expect(srOnly).toContain("vitality === 'stopped_buffer_full'");
    expect(srOnly).toMatch(/буфер полон/u);
    expect(srOnly).toContain("'Сценарий остановлен'");
  });
});
