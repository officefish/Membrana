import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CABINET_REGISTER_GRANT,
  canMint,
  DEFAULT_MINT_MODE,
  DEFAULT_MINT_MODE_HINT,
  defaultsForMode,
  grantsForMode,
  MINT_MODE_LABELS,
  MINT_MODES,
  WILDCARD_GRANT,
} from './mintModes';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const OFFICE_CORE_SRC = resolve(
  REPO_ROOT,
  'packages/background-office/src/modules/panel-users/panel-users-core.ts',
);
const MINT_FORM_SRC = resolve(
  REPO_ROOT,
  'apps/panel/src/components/panel-users/PanelUsersBoard.tsx',
);

/**
 * Предикат предмета (#2435): «исходник двери офиса найден по пути X».
 *
 * Без него `readFileSync` на переехавшем пакете бросал ENOENT, и зуб дрейфа говорил НЕ ТО:
 * «файла нет» читается как поломка теста, хотя утверждение зуба — про букву гранта.
 * Предмет проверяется первым и отдельной фразой, сравнение — только после.
 *
 * Функция экспортируется ради собственного красного входа: зуб ниже зовёт её заведомо
 * несуществующим путём и сверяет, что отказ называет переезд, а не ENOENT.
 */
export function readSourceWithSubject(path: string, what: string): string {
  if (!existsSync(path)) {
    throw new Error(
      `предмет зуба потерян: ${what} не найден по пути ${path}. ` +
        'Это НЕ расхождение буквы — файл переехал или переименован; поправьте путь в зубе.',
    );
  }
  return readFileSync(path, 'utf8');
}

const readOfficeCoreSource = (path = OFFICE_CORE_SRC) =>
  readSourceWithSubject(path, 'исходник двери офиса (panel-users-core.ts)');

describe('предмет зубов: исходники на месте', () => {
  it('исходник двери офиса найден по объявленному пути', () => {
    expect(existsSync(OFFICE_CORE_SRC), `исходник офиса не найден: ${OFFICE_CORE_SRC}`).toBe(true);
  });

  it('исходник формы чеканки найден по объявленному пути', () => {
    expect(existsSync(MINT_FORM_SRC), `форма чеканки не найдена: ${MINT_FORM_SRC}`).toBe(true);
  });

  it('переезд файла даёт внятный отказ, а не ENOENT', () => {
    const moved = `${OFFICE_CORE_SRC}.moved-away`;
    expect(() => readOfficeCoreSource(moved)).toThrow(/предмет зуба потерян/);
    expect(() => readOfficeCoreSource(moved)).not.toThrow(/ENOENT/);
  });
});

describe('дрейф буквы гранта кабинета', () => {
  /**
   * Несущий зуб. Панель объявляет букву второй раз (в `packages/*` она не ходит),
   * и расхождение двух объявлений — худший вид поломки: чеканка исправна, а
   * регистрация молча получает grant_mismatch, и это спишут на прод.
   * Образец — scripts/panel-cabinet-invite.test.mjs.
   */
  it('буква панели совпадает с буквой в двери офиса', () => {
    const src = readOfficeCoreSource();
    const match = src.match(/export const CABINET_REGISTER_GRANT = '([^']+)'/);
    expect(match, 'CABINET_REGISTER_GRANT не найден в panel-users-core.ts').toBeTruthy();
    expect(CABINET_REGISTER_GRANT).toBe(match![1]);
  });

  it('дверь офиса сверяет грант точным вхождением, а не подстановкой', () => {
    const src = readOfficeCoreSource();
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

describe('умолчание режима', () => {
  /**
   * Умолчанием стоит самый слабый режим: забывчивое нажатие в нём чеканит
   * одноразовый вход в кабинет, а не код, открывающий панель целиком.
   */
  it('форма по умолчанию предлагает приглашение в кабинет', () => {
    expect(DEFAULT_MINT_MODE).toBe('cabinet');
  });

  it('умолчание не даёт «*» — даже если список режимов переставят', () => {
    expect(grantsForMode(DEFAULT_MINT_MODE)).not.toContain(WILDCARD_GRANT);
    expect(grantsForMode(DEFAULT_MINT_MODE)).toEqual([CABINET_REGISTER_GRANT]);
  });

  /**
   * Зуб #2435, второй пункт. Умолчание верное, но молчаливое: оператор читает готовую
   * отметку как «так обычно и делают». Проверяется не вёрстка, а два проверяемых факта —
   * фраза называет режим умолчания его же подписью, и форма эту фразу показывает.
   * Предмет второго утверждения — исходник формы; его наличие утверждено выше отдельно.
   */
  it('пояснение называет режим умолчания и предупреждает о слабости', () => {
    expect(DEFAULT_MINT_MODE_HINT).toContain(MINT_MODE_LABELS[DEFAULT_MINT_MODE]);
    expect(DEFAULT_MINT_MODE_HINT).toMatch(/слаб/i);
    expect(DEFAULT_MINT_MODE_HINT).toMatch(/панел/i);
  });

  /**
   * Не просто «строка где-то в файле»: при сборке этого зуба пояснение по ошибке легло в
   * блок выбора разделов — тот виден только в режиме `sections`, то есть как раз там, где
   * оператору оно не нужно. Зуб на одно вхождение это пропустил. Поэтому предмет сужен:
   * пояснение обязано стоять ВНУТРИ блока выбора режима (`role="radiogroup"`).
   */
  it('форма чеканки показывает пояснение внутри блока выбора режима', () => {
    const src = readSourceWithSubject(MINT_FORM_SRC, 'исходник формы чеканки (PanelUsersBoard.tsx)');
    const openAt = src.indexOf('role="radiogroup"');
    expect(openAt, 'в форме не найден блок выбора режима (role="radiogroup")').toBeGreaterThan(-1);
    const closeAt = src.indexOf('</div>', openAt);
    expect(closeAt, 'блок выбора режима не закрыт').toBeGreaterThan(openAt);
    const modeBlock = src.slice(openAt, closeAt);
    expect(modeBlock, 'пояснение к умолчанию не стоит рядом с выбором режима').toContain(
      '{DEFAULT_MINT_MODE_HINT}',
    );
  });

  it('умолчание объявлено отдельно от порядка строк в списке', () => {
    // Порядок в MINT_MODES — про вёрстку; умолчание от него не зависит и живёт
    // собственной константой. Перестановка строк не должна менять умолчание.
    expect(MINT_MODES).toContain(DEFAULT_MINT_MODE);
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
