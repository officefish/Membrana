import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveMicStreamVizConfig,
  defaultMicStreamVizConfig,
} from './types.ts';

test('undefined → all defaults', () => {
  const cfg = resolveMicStreamVizConfig(undefined);
  assert.deepEqual(cfg, defaultMicStreamVizConfig);
});

test('null → all defaults', () => {
  const cfg = resolveMicStreamVizConfig(null);
  assert.deepEqual(cfg, defaultMicStreamVizConfig);
});

test('empty object → all defaults', () => {
  const cfg = resolveMicStreamVizConfig({});
  assert.deepEqual(cfg, defaultMicStreamVizConfig);
});

test('partial object: valid booleans override, rest default', () => {
  const cfg = resolveMicStreamVizConfig({ showVolume: false, showFftBars: false });
  assert.deepEqual(cfg, { ...defaultMicStreamVizConfig, showVolume: false, showFftBars: false });
});

test('partial object: single field true, others absent → others use default', () => {
  const cfg = resolveMicStreamVizConfig({ showVolume: true });
  assert.deepEqual(cfg, { ...defaultMicStreamVizConfig, showVolume: true });
});

test('wrong types on all fields → all defaults', () => {
  const cfg = resolveMicStreamVizConfig({
    showVolume: 'yes',
    showQuality: 1,
    showWaveform: null,
    showSpectrum: {},
    showFftBars: [],
    showSpectrumLine: 'true',
  });
  assert.deepEqual(cfg, defaultMicStreamVizConfig);
});

test('boolean false preserved (not treated as missing)', () => {
  const all = {
    showVolume: false,
    showQuality: false,
    showWaveform: false,
    showSpectrum: false,
    showFftBars: false,
    showSpectrumLine: false,
  };
  assert.deepEqual(resolveMicStreamVizConfig(all), all);
});
