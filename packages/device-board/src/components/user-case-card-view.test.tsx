/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  UserCaseCardView,
  entitlementBadgeClass,
  entitlementBadgeLabel,
} from './user-case-card-view.js';

describe('entitlement badge helpers (csp-4)', () => {
  it('label по статусу', () => {
    expect(entitlementBadgeLabel('bundled')).toBe('Bundled');
    expect(entitlementBadgeLabel('community')).toBe('Sprint');
    expect(entitlementBadgeLabel('entitled')).toBe('Тариф ✓');
    expect(entitlementBadgeLabel('locked')).toBe('Тариф');
  });

  it('class по статусу', () => {
    expect(entitlementBadgeClass('entitled')).toContain('badge-success');
    expect(entitlementBadgeClass('locked')).toContain('opacity-70');
  });
});

describe('UserCaseCardView (csp-4)', () => {
  it('рендерит заголовок, бейдж, счётчики, описание', () => {
    const { container } = render(
      <UserCaseCardView
        card={{
          title: 'Спектр',
          entitlement: 'bundled',
          description: 'Живой спектр',
          branchCount: 6,
          functionCount: 2,
          deviceKind: 'microphone',
        }}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('Спектр');
    expect(text).toContain('Bundled');
    expect(text).toContain('6 веток');
    expect(text).toContain('2 функций');
    expect(text).toContain('microphone');
    expect(text).toContain('Живой спектр');
  });

  it('locked показывает хинт тарифа', () => {
    const { container } = render(<UserCaseCardView card={{ title: 'X', entitlement: 'locked' }} />);
    expect(container.textContent).toContain('Доступно в тарифе');
  });

  it('минимальная модель (только title) — без бейджа/счётчиков', () => {
    const { container } = render(<UserCaseCardView card={{ title: 'Только имя' }} />);
    expect(container.textContent).toBe('Только имя');
  });
});
