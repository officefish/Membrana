import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { NodeOverflowHoldLine } from './NodeOverflowHoldLine';

const HELD = {
  phase: 'held' as const,
  reason: 'device_buffer_full',
  overflowId: 'ovf-1',
  overflowAt: '2026-09-05T21:40:18.000Z',
  policy: 'stop' as const,
};

describe('NodeOverflowHoldLine — «жив · не пишет · причина» (#2309)', () => {
  it('штатный стоп: строка с причиной и временем факта, не «нет телеметрии»', () => {
    const html = renderToStaticMarkup(<NodeOverflowHoldLine vitality="stopped_buffer_full" hold={HELD} />);
    expect(html).toContain('жив · не пишет');
    expect(html).toContain('буфер полон');
    expect(html).toContain('device_buffer_full');
    expect(html).toContain('data-vitality="stopped_buffer_full"');
    expect(html).not.toContain('нет телеметрии');
  });

  it('локальный страж без id: строка есть, факт помечен неподтверждённым', () => {
    const html = renderToStaticMarkup(
      <NodeOverflowHoldLine vitality="alive" hold={{ ...HELD, phase: 'held_local', overflowId: null }} />,
    );
    expect(html).toContain('не подтверждён');
  });

  it('мёртвый узел или отсутствие удержания — строки нет', () => {
    expect(renderToStaticMarkup(<NodeOverflowHoldLine vitality="dead" hold={HELD} />)).toBe('');
    expect(renderToStaticMarkup(<NodeOverflowHoldLine vitality="alive" hold={null} />)).toBe('');
  });
});
