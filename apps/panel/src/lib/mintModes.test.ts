import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CABINET_REGISTER_GRANT,
  canMint,
  defaultsForMode,
  grantsForMode,
  MINT_MODES,
  WILDCARD_GRANT,
} from './mintModes';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const OFFICE_CORE_SRC = resolve(
  REPO_ROOT,
  'packages/background-office/src/modules/panel-users/panel-users-core.ts',
);

describe('дрейф буквы гранта кабинета', () => {
  /**
   * Несущий зуб. Панель объявляет букву второй раз (в `packages/*` она не ходит),
   * и расхождение двух объявлений — худший вид поломки: чеканка исправна, а
   * регистрация молча получает grant_mismatch, и это спишут на прод.
   * Образец — scripts/panel-cabinet-invite.test.mjs.
   */
  it('буква панели совпадает с буквой в двери офиса', () => {
    const src = readFileSync(OFFICE_CORE_SRC, 'utf8');
    const match = src.match(/export const CABINET_REGISTER_GRANT = '([^']+)'/);
    expect(match, 'CABINET_REGISTER_GRANT не найден в panel-users-core.ts').toBeTruthy();
    expect(CABINET_REGISTER_GRANT).toBe(match![1]);
  });

  it('дверь офиса сверяет грант точным вхождением, а не подстановкой', () => {
    const src = readFileSync(OFFICE_CORE_SRC, 'utf8');
    expect(src).toContain('grants.includes(CABINET_REGISTER_GRANT)');
  });
});

describe('гранты по режиму', () => {
  it('полный доступ — только «*»', () => {
    expect(grantsForMode('full', ['drift-anchors'])).toEqual([WILDCARD_GRANT]);
  });

  it('разделы — ровно отмеченное, без «*»', () => {
    expect(grantsForMode('sections', ['drift-anchors', 'detector-compare'])).toEqual([
      'drift-anchors',
      'detector-compare',
    ]);
    expect(grantsForMode('sections', [])).toEqual([]);
  });

  it('разделы: пустые и повторы отбрасываются', () => {
    expect(grantsForMode('sections', ['  ', 'quality', 'quality', ' quality '])).toEqual([
      'quality',
    ]);
  });

  it('кабинет — ровно литерал, ничего больше', () => {
    expect(grantsForMode('cabinet', ['drift-anchors'])).toEqual(['cabinet-register']);
  });

  it('кабинет никогда не несёт «*» — его дверь отвергает как grant_mismatch', () => {
    for (const mode of MINT_MODES) {
      const grants = grantsForMode(mode, ['drift-anchors']);
      if (mode === 'cabinet') {
        expect(grants).not.toContain(WILDCARD_GRANT);
        expect(grants).toEqual([CABINET_REGISTER_GRANT]);
      }
    }
  });

  it('грант кабинета не примешивается к разделам панели', () => {
    expect(grantsForMode('sections', ['drift-anchors'])).not.toContain(CABINET_REGISTER_GRANT);
    expect(grantsForMode('full')).not.toContain(CABINET_REGISTER_GRANT);
  });
});

describe('умолчания срока и использований', () => {
  it('кабинет — 7 дней, одно использование', () => {
    expect(defaultsForMode('cabinet')).toEqual({ days: 7, maxUses: 1 });
  });

  it('панельные режимы — как было, 30 дней и одно использование', () => {
    expect(defaultsForMode('full')).toEqual({ days: 30, maxUses: 1 });
    expect(defaultsForMode('sections')).toEqual({ days: 30, maxUses: 1 });
  });
});

describe('готовность к чеканке', () => {
  it('без имени не чеканим ни в одном режиме', () => {
    for (const mode of MINT_MODES) {
      expect(canMint(mode, '   ', ['drift-anchors'])).toBe(false);
    }
  });

  it('в режиме разделов нужен хотя бы один раздел', () => {
    expect(canMint('sections', 'пресса', [])).toBe(false);
    expect(canMint('sections', 'пресса', ['quality'])).toBe(true);
  });

  it('полный доступ и кабинет разделов не требуют', () => {
    expect(canMint('full', 'пресса')).toBe(true);
    expect(canMint('cabinet', 'второй кабинет')).toBe(true);
  });
});
