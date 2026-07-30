/**
 * Зуб заготовки ласточки (помеха №3, 28.07): скелет структурно проходит гейт
 * с первого захода — падать может только на плейсхолдерах слов, не на структуре.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkSwallowDraft } from './lib/swallow-mirror.mjs';
import { gateCommandFor, nextStepsFor, skeletonFor } from './swallow-draft.mjs';

test('заготовка day = скелет гейта дословно; evening меняет только интро', () => {
  assert.match(skeletonFor('day'), /^☀️ Доброе утро!/u);
  assert.match(skeletonFor('evening'), /^🌙 Добрый вечер!/u);
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

test('вечерняя заготовка ведёт в evening:gate, дневная — в morning:gate', () => {
  assert.equal(
    gateCommandFor('evening', 'docs/comms/drafts/swallow-evening.md'),
    'yarn evening:gate partner-swallow --draft docs/comms/drafts/swallow-evening.md',
  );
  assert.equal(
    gateCommandFor('day', 'docs/comms/drafts/swallow-day.md'),
    'yarn morning:gate swallow --draft docs/comms/drafts/swallow-day.md',
  );
  assert.match(nextStepsFor('evening', 'draft.md'), /evening:gate partner-swallow --ack/u);
  assert.doesNotMatch(nextStepsFor('evening', 'draft.md'), /morning:gate/u);
});
