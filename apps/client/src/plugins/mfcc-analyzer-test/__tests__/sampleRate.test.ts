/**
 * Частота — несущая настройка прибора (#1590-соседний долг, десятка 01.08 №2).
 *
 * Дефект, который эти зубы держат: калибратор снимал ворота на 48 000, живая считалка
 * частоту не ставила вовсе и работала на умолчании библиотеки, а отпечаток
 * `mel40-c24-buf4096` частоту не нёс — значит подмену не ловило ничто. Длина вектора
 * совпадала, и вердикт выносился о другом.
 */
import { describe, expect, it } from 'vitest';

import { configFromHash } from '../mfccAnalyzerPlugin';
import { createMfccExtractor } from '../mfccExtractor';
import { MFCC_PRESET_FIRST_CUT } from '../presets';

describe('отпечаток несёт частоту', () => {
  it('разбирает все четыре настройки, включая частоту', () => {
    expect(configFromHash('mel40-c24-buf4096-sr48000')).toEqual({
      melBands: 40,
      numberOfCoefficients: 24,
      bufferSize: 4096,
      sampleRate: 48_000,
    });
  });

  it('отпечаток без частоты отвергается, а не достраивается умолчанием', () => {
    // Прежний формат. Достроить его «наверное, 48 000» значило бы вернуть ровно тот дефект,
    // ради которого частота и заведена в отпечаток.
    expect(configFromHash('mel40-c24-buf4096')).toBeNull();
  });

  it('боевой пресет объявляет частоту, на которой снят', () => {
    const parsed = configFromHash(MFCC_PRESET_FIRST_CUT.configHash);
    expect(parsed).not.toBeNull();
    expect(parsed?.sampleRate).toBe(48_000);
  });
});

describe('считалка отвергает кадр чужой частоты', () => {
  const hash = 'mel40-c24-buf4096-sr48000';

  it('кадр на частоте пресета считается', () => {
    const extract = createMfccExtractor(hash);
    const vector = extract(new Float32Array(4096), 48_000);
    expect(vector).not.toBeNull();
    expect(vector).toHaveLength(24);
  });

  it('кадр на 44 100 не считается — это не ноль коэффициентов, а отказ', () => {
    const extract = createMfccExtractor(hash);
    // Движок создаёт AudioContext без явной частоты, то есть берёт устройство: 44 100
    // случай не выдуманный. Вернуть вектор здесь значило бы судить его воротами, снятыми
    // на другом банке мел-фильтров.
    expect(extract(new Float32Array(4096), 44_100)).toBeNull();
  });

  it('кадр чужой длины по-прежнему отвергается — прежний зуб не сломан', () => {
    const extract = createMfccExtractor(hash);
    expect(extract(new Float32Array(2048), 48_000)).toBeNull();
  });

  it('неразобранный отпечаток — отказ на входе, а не считалка на умолчаниях', () => {
    expect(() => createMfccExtractor('mel40-c24-buf4096')).toThrow(/не разбирается/u);
  });
});
