import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ACCEPTANCE_BLIND,
  acceptCorpusBatch,
  acceptCorpusTrack,
} from './lib/corpus-track-acceptance.mjs';

const SCENE = { place: 'поле у ЛЭП', time: '2026-08-12T07:30', weather: 'ясно', wind: '3 м/с' };

function droneTrack(over = {}) {
  return {
    id: 'trk-d1',
    class: 'drone',
    sourceRecordingId: 'rec-001',
    scene: { ...SCENE },
    drone: { distanceM: 200, altitudeM: 60, model: 'mavic-3', flightMode: 'hover' },
    pairedNegativeId: 'trk-n1',
    mic: { microphone: 'sm57', chainId: 'chain-a' },
    audio: { durationSec: 12.5, sampleRateHz: 48000 },
    operatorConfirmed: true,
    ...over,
  };
}

function negativeTrack(over = {}) {
  return {
    id: 'trk-n1',
    class: 'negative',
    sourceRecordingId: 'rec-002',
    scene: { ...SCENE },
    drone: null,
    droneAbsenceReason: 'негатив: дрона в сцене нет по построению',
    pairedNegativeId: null,
    mic: { microphone: 'sm57', chainId: 'chain-a' },
    audio: { durationSec: 12.5, sampleRateHz: 48000 },
    operatorConfirmed: true,
    ...over,
  };
}

test('полнота: трек без каждого из 7 полей даёт named problem', () => {
  const cuts = [
    [{ sourceRecordingId: '' }, /sourceRecordingId/u],
    [{ scene: { ...SCENE, wind: '' } }, /scene\.wind/u],
    [{ drone: null }, /drone-параметры отсутствуют/u],
    [{ pairedNegativeId: '' }, /pairedNegativeId/u],
    [{ mic: { microphone: 'sm57', chainId: '' } }, /chainId/u],
    [{ audio: { durationSec: 12.5, sampleRateHz: 0 } }, /sampleRateHz/u],
    [{ operatorConfirmed: false }, /operatorConfirmed/u],
  ];
  for (const [over, re] of cuts) {
    const r = acceptCorpusTrack(droneTrack(over));
    assert.equal(r.ok, false);
    assert.ok(r.problems.some((p) => re.test(p)), `${re}: ${r.problems.join(' | ')}`);
  }
});

test('негатив: drone обязан быть null И нести причину', () => {
  assert.equal(acceptCorpusTrack(negativeTrack()).ok, true);
  const withDrone = acceptCorpusTrack(negativeTrack({ drone: { distanceM: 1, altitudeM: 0, model: 'x', flightMode: 'y' } }));
  assert.ok(withDrone.problems.some((p) => /обязаны быть null/u.test(p)));
  const noReason = acceptCorpusTrack(negativeTrack({ droneAbsenceReason: '' }));
  assert.ok(noReason.problems.some((p) => /droneAbsenceReason/u.test(p)));
});

test('честный pass: эталонный трек и батч — ok, problems пуст, слепота полем', () => {
  const track = acceptCorpusTrack(droneTrack());
  assert.deepEqual(track, { ok: true, problems: [], blind: ACCEPTANCE_BLIND });
  const batch = acceptCorpusBatch([droneTrack(), negativeTrack()]);
  assert.equal(batch.ok, true, batch.problems.join(' | '));
  assert.deepEqual(batch.problems, []);
  assert.equal(batch.blind, ACCEPTANCE_BLIND);
  assert.deepEqual(batch.details.chainIds, ['chain-a']);
  assert.deepEqual(batch.details.classes, { drone: 1, negative: 1 });
});

test('один тракт: два chain-id в батче — named problem', () => {
  const batch = acceptCorpusBatch([
    droneTrack(),
    negativeTrack({ mic: { microphone: 'sm57', chainId: 'chain-b' } }),
  ]);
  assert.ok(batch.problems.some((p) => /один тракт нарушен/u.test(p)), batch.problems.join(' | '));
});

test('классы: батч одного класса — named problem', () => {
  const batch = acceptCorpusBatch([negativeTrack()]);
  assert.ok(batch.problems.some((p) => /класс «drone» в батче отсутствует/u.test(p)));
});

test('парность: негатив другой сцены или отсутствующий — problem батча', () => {
  const otherScene = acceptCorpusBatch([
    droneTrack(),
    negativeTrack({ scene: { ...SCENE, wind: '12 м/с' } }),
  ]);
  assert.ok(otherScene.problems.some((p) => /из другой сцены/u.test(p)));

  const missing = acceptCorpusBatch([droneTrack({ pairedNegativeId: 'trk-нет' }), negativeTrack()]);
  assert.ok(missing.problems.some((p) => /не найден/u.test(p)));
});

test('смешение частот дискретизации — named problem (грабли 48/16 kHz)', () => {
  const batch = acceptCorpusBatch([
    droneTrack(),
    negativeTrack({ audio: { durationSec: 5, sampleRateHz: 16000 } }),
  ]);
  assert.ok(batch.problems.some((p) => /единая частота нарушена: в батче 16000 и 48000 Hz/u.test(p)));
});
