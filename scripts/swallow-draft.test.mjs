/**
 * Зуб заготовки ласточки (помеха №3, 28.07): скелет структурно проходит гейт
 * с первого захода — падать может только на плейсхолдерах слов, не на структуре.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkSwallowDraft } from './lib/swallow-mirror.mjs';
import { skeletonFor } from './swallow-draft.mjs';

test('заготовка day = скелет гейта дословно; evening меняет только интро', () => {
  assert.match(skeletonFor('day'), /^Доброе утро!/u);
  assert.match(skeletonFor('evening'), /^Добрый вечер!/u);
  const dayRest = skeletonFor('day').split('\n').slice(1).join('\n');
  const eveRest = skeletonFor('evening').split('\n').slice(1).join('\n');
  assert.equal(dayRest, eveRest);
});

test('структура заготовки безупречна для гейта: все нарушения — только «плейсхолдер», ни одного структурного', () => {
  const { violations } = checkSwallowDraft(skeletonFor('evening'));
  assert.ok(violations.length > 0, 'слова ещё не написаны — гейт обязан требовать их');
  for (const v of violations) {
    assert.match(v, /плейсхолдером|пуста/u, `неожиданное структурное нарушение: ${v}`);
  }
});
