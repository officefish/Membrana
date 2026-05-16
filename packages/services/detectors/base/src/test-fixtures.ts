import type { AudioWindow } from './types.js';

const DEFAULT_SR = 48_000;

/** Чистый синус для unit-тестов контракта. */
export function sineWindow(
  frequencyHz: number,
  durationSec = 0.05,
  sampleRate = DEFAULT_SR,
): AudioWindow {
  const length = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    samples[i] = Math.sin(2 * Math.PI * frequencyHz * t);
  }
  return {
    samples,
    sampleRate,
    timestamp: 0,
    durationSec,
  };
}

/** Гармонический ряд (мультиротор-подобный) для позитивных тестов. */
export function harmonicDroneWindow(sampleRate = DEFAULT_SR): AudioWindow {
  const fundamentals = [120, 240, 360];
  const durationSec = 0.1;
  const length = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let v = 0;
    for (const f of fundamentals) {
      v += Math.sin(2 * Math.PI * f * t);
    }
    samples[i] = v / fundamentals.length;
  }
  return { samples, sampleRate, timestamp: 0, durationSec };
}

/** Белый шум для негативных тестов. */
export function whiteNoiseWindow(sampleRate = DEFAULT_SR): AudioWindow {
  const durationSec = 0.05;
  const length = Math.floor(durationSec * sampleRate);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = Math.random() * 2 - 1;
  }
  return { samples, sampleRate, timestamp: 0, durationSec };
}
