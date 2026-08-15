import assert from 'node:assert/strict';
import test from 'node:test';

import { blindOrder, parseArgs, rewriteManifest } from './vdr-blind-corpus.mjs';

test('parseArgs: dry-run по умолчанию, --execute включает запись', () => {
  assert.equal(parseArgs([]).execute, false);
  assert.equal(parseArgs(['--execute']).execute, true);
  assert.equal(parseArgs(['--execute', '--dry-run']).execute, false, '--dry-run отменяет --execute');
  assert.equal(parseArgs(['--manifest', 'a/b.json']).manifest, 'a/b.json');
  assert.throws(() => parseArgs(['--нет-такого']), /неизвестный флаг/u);
});

test('blindOrder: перестановка детерминирована и полна', () => {
  const samples = Array.from({ length: 12 }, (_, i) => ({ id: `pilot-drone-${i}` }));
  const first = blindOrder(samples);
  const second = blindOrder(samples);
  assert.deepEqual([...first], [...second], 'один вход — один выход, без случайности');
  assert.equal(first.size, samples.length, 'каждая запись получила имя');
  assert.equal(new Set(first.values()).size, samples.length, 'имена уникальны');
  for (const value of first.values()) assert.match(value, /^pilot-\d{2}$/u);
});

test('blindOrder: номер не повторяет исходный порядок', () => {
  const samples = Array.from({ length: 20 }, (_, i) => ({ id: `sample-${i}` }));
  const map = blindOrder(samples);
  const inPlace = samples.filter((s, i) => map.get(s.id) === `pilot-${String(i + 1).padStart(2, '0')}`);
  assert.ok(inPlace.length < samples.length, 'порядок обязан перемешаться, иначе номер выдаёт класс');
});

test('rewriteManifest: id заменён, провенанс сохранён, метка не тронута', () => {
  const manifest = {
    samples: [
      { id: 'pilot-drone-001', path: 'drone/pilot-drone-001.wav', originLabel: 'drone', label: 'unlabeled' },
      { id: 'pilot-not-wind-01', path: 'not-drone/pilot-not-wind-01.wav', originLabel: 'not-drone', label: 'unlabeled' },
    ],
  };
  const map = blindOrder(manifest.samples);
  const out = rewriteManifest(manifest, map);

  assert.equal(out.blindLabeling, true, 'манифест объявляет слепоту — повторный прогон идемпотентен');
  for (const sample of out.samples) {
    assert.match(sample.id, /^pilot-\d+$/u, 'имя нейтрально');
    assert.equal(sample.path, `samples/${sample.id}.wav`, 'путь ведёт в общий каталог');
    assert.ok(sample.provenanceId, 'провенанс сохранён отдельным полем');
    assert.equal(sample.label, 'unlabeled', 'разметку глагол не ставит — её ставит оператор');
    assert.doesNotMatch(sample.id, /drone|wind|helicopter/u, 'в имени не осталось подсказки класса');
  }
  assert.equal(new Set(out.samples.map((s) => s.provenanceId)).size, 2, 'соответствие исходным id взаимно однозначно');
});

test('rewriteManifest: неизвестный id — явный отказ, не молчаливый пропуск', () => {
  const manifest = { samples: [{ id: 'нет-в-карте', path: 'x.wav' }] };
  assert.throws(() => rewriteManifest(manifest, new Map()), /нет нейтрального имени/u);
});
