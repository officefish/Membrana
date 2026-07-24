import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  valid,
  syncGranule,
  loadStubSnaps,
  isExactSemver,
  parsePin,
  granuleKey,
  extractGranule
} from './strategic-docs-model.mjs';

test('isExactSemver + parsePin', () => {
  assert.equal(isExactSemver('1.2.3'), true);
  assert.equal(isExactSemver('1.2'), false);
  assert.equal(isExactSemver('^1.2.3'), false);
  assert.equal(isExactSemver('1.2.3-beta'), false);

  assert.equal(parsePin('2.0.0'), '2.0.0');
  assert.throws(() => parsePin('^2.0.0'));
});

test('granuleKey', () => {
  assert.equal(granuleKey('course-north-star', '1.2.3'), 'course-north-star@1.2.3');
});

test('valid: ok на корректном шаблоне', async () => {
  const index = new Map();

  index.set('course-north-star@1.0.0', {
    id: 'course-north-star',
    version: '1.0.0',
    kind: 'literal',
    bodyPath: './body.md',
    description: 'North star statement'
  });

  index.set('review-policy@2.0.1', {
    id: 'review-policy',
    version: '2.0.1',
    kind: 'literal',
    bodyPath: './body.md',
    description: 'Review policy'
  });

  const template = {
    id: 'agents-main',
    version: '0.3.0',
    target: 'AGENTS.md',
    skeleton: '# AGENTS\n\n{{north_star}}\n\n{{review_policy}}\n',
    slots: [
      {
        granuleId: 'course-north-star',
        pin: '1.0.0',
        placeholder: '{{north_star}}'
      },
      {
        granuleId: 'review-policy',
        pin: '2.0.1',
        placeholder: '{{review_policy}}'
      }
    ]
  };

  const result = valid(template, index);
  assert.equal(result.ok, true);
});

test('valid: fail на битых данных', () => {
  const index = new Map();
  index.set('course-north-star@1.0.0', {
    id: 'course-north-star',
    version: '1.0.0',
    kind: 'literal',
    bodyPath: './body.md',
    description: 'North star'
  });

  const badTemplate = {
    id: 'broken',
    version: '0.1.0',
    skeleton: '{{north_star}}',
    slots: [
      { granuleId: 'course-north-star', pin: '9.9.9', placeholder: '{{north_star}}' } // несуществующая версия
    ]
  };

  const result = valid(badTemplate, index);
  assert.equal(result.ok, false);
  assert.ok(result.reasons.some(r => r.includes('not found')));
});

test('syncGranule: правка одной гранулы сводит три стаб-релиза к одному значению', async () => {
  const snaps = await loadStubSnaps();

  // Имитируем начальный дрейф
  assert.notEqual(
    extractGranule(snaps[0].body, 'course-north-star'),
    extractGranule(snaps[1].body, 'course-north-star')
  );

  const canon = 'Мы держим курс на синхронный канон для агентов и людей.';

  const { updated, skipped } = syncGranule({
    granuleId: 'course-north-star',
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    newBody: canon,
    releases: snaps,
  });

  assert.equal(skipped.length, 0);
  assert.equal(updated.length, 3);

  for (const r of updated) {
    const extracted = extractGranule(r.body, 'course-north-star');
    assert.equal(extracted, canon);
    assert.equal(r.pins['course-north-star'], '1.1.0');
  }

  // Проверка что маркеры корректно обновились
  assert.ok(updated[0].body.includes('<!-- granule:course-north-star@1.1.0 -->'));
});
