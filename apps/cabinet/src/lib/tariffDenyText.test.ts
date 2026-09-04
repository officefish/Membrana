import { describe, expect, it } from 'vitest';

import { TARIFF_DENY_REASONS } from '@/api/tariff';
import { tariffDenyText } from './tariffDenyText';

/**
 * Зуб полноты словаря (блок b2, #1761): КАЖДАЯ причина закрытого списка имеет
 * человеческий текст, тексты попарно различимы (не склеены), а неизвестная
 * причина не молчит — называется кодом. Новая причина на сервере без текста
 * здесь = красный тест, не молчаливое «нельзя».
 */
describe('tariffDenyText', () => {
  it('каждая причина закрытого списка имеет свой текст — без fallback', () => {
    for (const reason of TARIFF_DENY_REASONS) {
      const text = tariffDenyText(reason);
      expect(text, reason).toBeTruthy();
      expect(text, reason).not.toMatch(/Неизвестная причина/);
    }
  });

  it('тексты попарно различимы — причины не склеены', () => {
    const texts = TARIFF_DENY_REASONS.map((r) => tariffDenyText(r));
    expect(new Set(texts).size).toBe(TARIFF_DENY_REASONS.length);
  });

  it('promo_unknown и promo_already_redeemed различимы и не сводятся к «код не сработал»', () => {
    expect(tariffDenyText('promo_unknown')).not.toBe(tariffDenyText('promo_already_redeemed'));
  });

  it('неизвестная причина показывается кодом, а не молчит', () => {
    expect(tariffDenyText('promo_new_reason_from_server')).toBe(
      'Неизвестная причина отказа: promo_new_reason_from_server',
    );
  });
});
