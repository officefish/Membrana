/**
 * Зубы КЕПСТРАЛЬНОГО ДЕТЕКТОРА — того, что принадлежит ему, а не окну.
 *
 * Механика окна (кадры, дополнение нулями, два свода) переехала 02.08 в единый носитель
 * `@membrana/detector-base` вместе с её зубами: держать здесь вторую копию проверок значило бы
 * повторить ровно ту болезнь, которую свод и лечит.
 *
 * Здесь остаётся то, что о кепстре: включён ли свод в самом детекторе и не сдвинулась ли
 * быстрая ветка. Норма #1565 — вещдоком служит прогон, а не наличие кода.
 */
import { describe, expect, it } from 'vitest';

import { CepstralDetector } from './cepstral-detector.js';

const SAMPLE_RATE = 48_000;

/** Тон заданной частоты длиной `length` сэмплов. */
function tone(hz: number, length: number, offset = 0): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = Math.sin((2 * Math.PI * hz * (i + offset)) / SAMPLE_RATE);
  return out;
}

describe('детектор судит запись целиком', () => {
  it('вторая половина записи влияет на вердикт — первая его больше не решает', async () => {
    const detector = new CepstralDetector();
    const fftSize = 2048;
    const half = fftSize * 4;

    // Две записи с ОДИНАКОВОЙ первой половиной и разными вторыми. До 02.08 обе судились по
    // первым 2048 сэмплам, то есть по общей части, и давали один результат.
    const head = tone(200, half);
    const a = new Float32Array(half * 2);
    const b = new Float32Array(half * 2);
    a.set(head, 0);
    b.set(head, 0);
    a.set(tone(200, half, half), half);
    b.set(tone(1700, half, half), half);

    const ra = await detector.detect({ samples: a, sampleRate: SAMPLE_RATE, timestamp: 0 });
    const rb = await detector.detect({ samples: b, sampleRate: SAMPLE_RATE, timestamp: 0 });

    const featureOf = (r: Awaited<ReturnType<CepstralDetector['detect']>>) =>
      `${r.features?.fundamentalHz ?? 0}|${r.features?.cepstrumPeak ?? 0}`;
    expect(featureOf(ra)).not.toBe(featureOf(rb));
  });

  it('вход ровно в окно идёт прежней быстрой веткой — числа бенчмарка не сдвигаются', async () => {
    const detector = new CepstralDetector();
    const samples = tone(200, 2048);

    const direct = await detector.detect({ samples, sampleRate: SAMPLE_RATE, timestamp: 0 });
    const again = await detector.detect({ samples, sampleRate: SAMPLE_RATE, timestamp: 0 });

    expect(direct.isDrone).toBe(again.isDrone);
    expect(direct.features?.fundamentalHz).toBe(again.features?.fundamentalHz);
    expect(direct.features?.cepstrumPeak).toBe(again.features?.cepstrumPeak);
  });
});
