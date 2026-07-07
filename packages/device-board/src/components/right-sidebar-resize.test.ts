import { describe, expect, it } from 'vitest';

import {
  RIGHT_SIDEBAR_MIN_WIDTH_PX,
  clampRightSidebarWidth,
  parseStoredRightSidebarWidth,
} from './right-sidebar-resize.js';

describe('clampRightSidebarWidth', () => {
  it('пропускает ширину в допустимых границах', () => {
    expect(clampRightSidebarWidth(320, 1600)).toBe(320);
  });

  it('не даёт сузить ниже минимума', () => {
    expect(clampRightSidebarWidth(80, 1600)).toBe(RIGHT_SIDEBAR_MIN_WIDTH_PX);
  });

  it('ограничивает половиной viewport', () => {
    expect(clampRightSidebarWidth(1200, 1600)).toBe(800);
  });

  it('на узком viewport минимум важнее половины экрана', () => {
    expect(clampRightSidebarWidth(300, 400)).toBe(RIGHT_SIDEBAR_MIN_WIDTH_PX);
  });

  it('округляет дробные значения', () => {
    expect(clampRightSidebarWidth(320.6, 1600)).toBe(321);
  });
});

describe('parseStoredRightSidebarWidth', () => {
  it('парсит валидное число', () => {
    expect(parseStoredRightSidebarWidth('344')).toBe(344);
  });

  it('null и мусор → null', () => {
    expect(parseStoredRightSidebarWidth(null)).toBeNull();
    expect(parseStoredRightSidebarWidth('abc')).toBeNull();
    expect(parseStoredRightSidebarWidth('')).toBeNull();
    expect(parseStoredRightSidebarWidth('-10')).toBeNull();
    expect(parseStoredRightSidebarWidth('NaN')).toBeNull();
  });
});
