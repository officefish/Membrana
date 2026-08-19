import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  checkCaptureSidecarFile, createCaptureSidecar, validateCaptureSidecar, writeCaptureSidecar,
} from './lib/capture-sidecar.mjs';

function makeWav({ rate = 48000, channels = 1, seconds = 0.1, amp = 6000 } = {}) {
  const frames = Math.round(rate * seconds);
  const data = Buffer.alloc(frames * channels * 2);
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * amp), (i * channels + c) * 2);
    }
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * channels * 2, 28);
  h.writeUInt16LE(channels * 2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const declared = {
  what: 'target: drone',
  apparatus: 'ECM8000 + Scarlett Solo',
  distanceM: 50,
  heightM: 30,
  place: 'north field',
  weather: 'dry',
  wind: 'light west',
  operator: 'operator-1',
  gain: 'knob 5/10',
};

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'capture-sidecar-'));
  const wav = join(dir, 'capture.wav');
  writeFileSync(wav, makeWav());
  const sidecar = createCaptureSidecar({
    recordingPath: wav,
    declared,
    capturedAt: '2026-08-19T09:00:00.000Z',
  });
  const path = writeCaptureSidecar(wav, sidecar);
  return { dir, wav, path, sidecar };
}

test('валидный спутник связан с соседним WAV именем, измерениями и SHA-256', () => {
  const { path } = fixture();
  assert.deepEqual(checkCaptureSidecarFile(path), []);
});

test('пустой declared получает именованный отказ', () => {
  const { sidecar } = fixture();
  sidecar.declared = {};
  assert.ok(validateCaptureSidecar(sidecar).some((f) => f.code === 'E_DECLARED_EMPTY'));
});

test('фон без отдельного источника честно объявляет геометрию неприменимой', () => {
  const { sidecar } = fixture();
  sidecar.declared = {
    ...declared,
    what: 'background: room ambience',
    distanceM: null,
    heightM: null,
  };
  assert.deepEqual(validateCaptureSidecar(sidecar), []);
});

test('измеряемое в declared и объявленное в measured не смешиваются', () => {
  const { sidecar } = fixture();
  sidecar.declared.sampleRate = 48000;
  sidecar.measured.what = 'human claim';
  sidecar.measured.comment = 'manual value';
  const codes = validateCaptureSidecar(sidecar).map((f) => f.code);
  assert.ok(codes.includes('E_DECLARED_CONTAINS_MEASURED'));
  assert.ok(codes.includes('E_MEASURED_CONTAINS_DECLARED'));
  assert.ok(codes.includes('E_MEASURED_UNKNOWN'));
});

test('другое имя спутника отвергается даже при валидном JSON', () => {
  const { dir, path } = fixture();
  const moved = join(dir, 'other.sidecar.json');
  renameSync(path, moved);
  assert.ok(checkCaptureSidecarFile(moved).some((f) => f.code === 'E_RECORDING_STEM'));
});

test('подмена WAV обнаруживается по измерениям и SHA-256', () => {
  const { wav, path } = fixture();
  writeFileSync(wav, makeWav({ amp: 12000 }));
  assert.ok(checkCaptureSidecarFile(path).some((f) => f.code === 'E_MEASURED_MISMATCH'));
});

test('спутник без соседнего WAV получает E_RECORDING_MISSING', () => {
  const { wav, path } = fixture();
  unlinkSync(wav);
  assert.ok(checkCaptureSidecarFile(path).some((f) => f.code === 'E_RECORDING_MISSING'));
});

test('ручная подмена peak при прежнем WAV получает E_MEASURED_MISMATCH', () => {
  const { path } = fixture();
  const sidecar = JSON.parse(readFileSync(path, 'utf8'));
  sidecar.measured.peakDbfs += 3;
  writeFileSync(path, JSON.stringify(sidecar));
  assert.ok(checkCaptureSidecarFile(path).some((f) => f.code === 'E_MEASURED_MISMATCH'));
});

test('глагол печатает именованный отказ и ненулевой код', () => {
  const { path } = fixture();
  const sidecar = JSON.parse(readFileSync(path, 'utf8'));
  sidecar.declared = {};
  writeFileSync(path, JSON.stringify(sidecar));
  const run = spawnSync(process.execPath, ['scripts/capture-sidecar.mjs', '--check', path], {
    cwd: process.cwd(), encoding: 'utf8',
  });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /E_DECLARED_EMPTY/u);
});
