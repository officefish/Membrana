/**
 * Зубы детектора спектрального потока на записи длиннее окна.
 *
 * Держат дефект, закрытый 02.08: `detect()` брал первые `fftSize` сэмплов (43 мс при 2048 и
 * 48 кГц) и судил по ним пятисекундную запись. И держат ГЛАВНОЕ решение блока — вердикт по
 * СРЕДНЕМУ потоку, а не по максимуму: доказывается прогоном, а не комментарием.
 */
import { describe, expect, it } from 'vitest';

import { SpectralFluxDetector } from './spectral-flux-detector.js';

const SAMPLE_RATE = 48_000;
const FFT = 2048;

/** Тон заданной частоты, начиная с фазы `offset` сэмплов. */
function tone(hz: number, length: number, offset = 0): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = Math.sin((2 * Math.PI * hz * (i + offset)) / SAMPLE_RATE);
  return out;
}

/** Детерминированный «шум»: без Math.random, иначе зуб краснел бы через раз. */
function noise(length: number, seed = 1): Float32Array {
  const out = new Float32Array(length);
  let s = seed;
  for (let i = 0; i < length; i += 1) {
    s = (s * 1103515245 + 12345) % 2147483648;
    out[i] = (s / 2147483648) * 2 - 1;
  }
  return out;
}

const detect = (samples: Float32Array, timestamp = 0) =>
  new SpectralFluxDetector().detect({ samples, sampleRate: SAMPLE_RATE, timestamp });

describe('запись длиннее окна судится целиком', () => {
  it('вторая половина влияет на поток — первая его больше не решает', async () => {
    // Две записи с ОДИНАКОВОЙ первой половиной: устойчивый тон. Вторые половины разные —
    // тон против шума. До починки обе судились по первым 2048 сэмплам и давали один результат.
    const half = FFT * 4;
    const head = tone(200, half);

    const steady = new Float32Array(half * 2);
    steady.set(head, 0);
    steady.set(tone(200, half, half), half);

    const broken = new Float32Array(half * 2);
    broken.set(head, 0);
    broken.set(noise(half), half);

    const a = await detect(steady);
    const b = await detect(broken);

    expect(a.features?.spectralFlux).not.toBe(b.features?.spectralFlux);
    expect(b.features?.spectralFlux as number).toBeGreaterThan(a.features?.spectralFlux as number);
  });

  it('вердикт выносится, а не откладывается: запись длиннее окна — уже не «первый кадр»', async () => {
    // Ловушка, ради которой зуб написан: признак «первый кадр» брался из timestamp === 0.
    // Для целой записи это оставило бы детектор в вечном «ждём следующий кадр» — обрезка
    // вылечена, а вердикта нет.
    const r = await detect(tone(200, FFT * 8));
    expect(r.reasoning).not.toContain('Первый кадр');
  });
});

describe('среднее против максимума — решение блока, проверенное прогоном', () => {
  it('устойчивый тон с одним импульсом остаётся ближе к тону, чем к шуму (этот образец)', async () => {
    // Пять «секунд» тона, посередине короткий хлопок. По максимуму потока запись выглядела бы
    // рванью; по среднему — тем, чем является: устойчивым источником с одним событием.
    //
    // ЧТО ЭТОТ ЗУБ ДОКАЗЫВАЕТ И ЧТО НЕТ (замечание Дынина на разборе блока). Он показывает,
    // что среднее ведёт себя заявленным образом НА ЭТОМ образце, и этого довольно, чтобы
    // выбор «среднее, а не максимум» не остался словами. Универсальным свойством это не
    // является: серия часто расставленных импульсов даст спектр, похожий на шум, и среднее
    // будет велико. Утверждение «импульсы отсеиваются» потребовало бы корпуса, которого нет,
    // — и потому здесь не делается.
    const length = FFT * 10;
    const withClap = tone(200, length);
    withClap.set(noise(FFT, 7), FFT * 4);

    const steady = await detect(tone(200, length));
    const clapped = await detect(withClap);

    const s = steady.features?.spectralFlux as number;
    const c = clapped.features?.spectralFlux as number;

    // Один импульс на десять кадров поднимает средний поток, но не в разы: он остаётся ближе
    // к устойчивому тону, чем к сплошному шуму.
    const noisy = await detect(noise(length, 3));
    const n = noisy.features?.spectralFlux as number;

    expect(c).toBeGreaterThan(s);
    expect(c).toBeLessThan(n);
    expect(Math.abs(c - s)).toBeLessThan(Math.abs(n - c));
  });

  it('сплошные щелчки дают высокий средний поток — мерка не слепа к настоящей рвани', async () => {
    const steady = await detect(tone(200, FFT * 10));
    const noisy = await detect(noise(FFT * 10, 5));

    expect(noisy.features?.spectralFlux as number).toBeGreaterThan(
      steady.features?.spectralFlux as number,
    );
  });
});

describe('прежние пути не сдвинуты', () => {
  it('вход ровно в окно: первый кадр по-прежнему ждёт следующего', async () => {
    const r = await detect(tone(200, FFT));
    expect(r.isDrone).toBe(false);
    expect(r.reasoning).toContain('Первый кадр');
    expect(r.features?.spectralFlux).toBe(0);
  });

  it('вход ровно в окно, продолжение потока: вердикт считается по паре кадров', async () => {
    const detector = new SpectralFluxDetector();
    const first = await detector.detect({ samples: tone(200, FFT), sampleRate: SAMPLE_RATE, timestamp: 0 });
    const second = await detector.detect({
      samples: tone(200, FFT, FFT),
      sampleRate: SAMPLE_RATE,
      timestamp: 1,
    });

    expect(first.reasoning).toContain('Первый кадр');
    expect(second.reasoning).not.toContain('Первый кадр');
  });

  it('короткий вход дополняется нулями и остаётся одним кадром', async () => {
    const r = await detect(tone(200, 1024));
    expect(r.features?.spectralFlux).toBe(0);
    expect(r.reasoning).toContain('Первый кадр');
  });
});
