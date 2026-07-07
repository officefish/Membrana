import { describe, expect, it } from 'vitest';

import { normalizeRightSidebarTab, visibleRightSidebarTabs } from './right-sidebar-tabs.js';

describe('right sidebar tabs (BTJ1)', () => {
  it('со слотом журнала — три вкладки, без — две (журнала нет)', () => {
    expect(visibleRightSidebarTabs(true)).toEqual(['inspector', 'journal', 'trace']);
    expect(visibleRightSidebarTabs(false)).toEqual(['inspector', 'trace']);
  });

  it('активная вкладка нормализуется к видимой', () => {
    expect(normalizeRightSidebarTab('journal', true)).toBe('journal');
    // Слот пропал (смена хоста) — «Журнал» падает на «Узлы».
    expect(normalizeRightSidebarTab('journal', false)).toBe('inspector');
    expect(normalizeRightSidebarTab('trace', false)).toBe('trace');
    expect(normalizeRightSidebarTab('inspector', true)).toBe('inspector');
  });
});
