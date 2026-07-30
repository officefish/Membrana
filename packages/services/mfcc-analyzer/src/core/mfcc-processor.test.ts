import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { AudioWindow, MfccConfig, MfccExtractor } from '../types.js';
import { configHashOf, configProblem, processWindow } from './mfcc-processor.js';
import { acceptWindow, createEngine, reconfigure, snapshot } from './mfcc-engine.js';

const CONFIG: MfccConfig = { melBands: 40, numberOfCoefficients: 20, bufferSize: 512 };

const windowOf = (over: Partial<AudioWindow> = {}): AudioWindow => ({
  samples: new Float32Array(CONFIG.bufferSize),
  sampleRate: 48_000,
  startIndex: 0,
  nodeId: 'mic-1',
  ...over,
});

/** Стаб извлекателя: библиотека приходит параметром, поэтому ядро тестируется без неё. */
const stubExtract: MfccExtractor = (_samples, config) =>
  Array.from({ length: config.numberOfCoefficients }, (_v, i) => i / 10);

describe('настройки судятся ДО свёртки, отказ несёт причину', () => {
  it('валидные настройки проблем не дают', () => {
    expect(configProblem(CONFIG)).toBeNull();
  });

  it.each([
    ['melBands', { ...CONFIG, melBands: 0 }],
    ['numberOfCoefficients', { ...CONFIG, numberOfCoefficients: 0 }],
    ['bufferSize', { ...CONFIG, bufferSize: 1 }],
  ])('%s вне области — названо поимённо, а не «настройки плохие»', (field, cfg) => {
    expect(configProblem(cfg)).toContain(field);
  });

  it('коэффициентов больше, чем фильтров — ловим У СЕБЯ, а не в библиотеке', () => {
    // Ответ библиотеки на такой вход контрактом не определён; молчаливо принять его значило бы
    // отдать наружу число, смысл которого никто не назвал.
    expect(configProblem({ ...CONFIG, numberOfCoefficients: 41 })).toContain('> melBands');
  });
});

describe('свёртка кадра', () => {
  it('годный кадр даёт вектор с адресом и отпечатком настроек', () => {
    const r = processWindow(windowOf({ startIndex: 4096 }), CONFIG, stubExtract);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.vector.coefficients).toHaveLength(20);
    expect(r.vector.windowStartIndex).toBe(4096);
    expect(r.vector.configHash).toBe('mel40-c20-buf512');
  });

  it('кадр не той длины — ОТКАЗ, а не дополнение нулями', () => {
    // Дополнение исказило бы спектр и осталось бы невидимым в выходе.
    const r = processWindow(windowOf({ samples: new Float32Array(256) }), CONFIG, stubExtract);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain('≠ bufferSize');
  });

  it('NaN от извлекателя — отказ: тихий яд переживёт любое усреднение', () => {
    const poison: MfccExtractor = (_s, c) => Array.from({ length: c.numberOfCoefficients }, () => NaN);
    const r = processWindow(windowOf(), CONFIG, poison);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain('нечисловое');
  });

  it('извлекатель вернул не ту длину — отказ с обоими числами', () => {
    const short: MfccExtractor = () => [1, 2, 3];
    const r = processWindow(windowOf(), CONFIG, short);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/3 значений.*20/u);
  });

  it('отпечаток детерминирован и не зависит от порядка полей объекта', () => {
    const a: MfccConfig = { melBands: 40, numberOfCoefficients: 20, bufferSize: 512 };
    const b: MfccConfig = { bufferSize: 512, numberOfCoefficients: 20, melBands: 40 } as MfccConfig;
    expect(configHashOf(a)).toBe(configHashOf(b));
  });
});

describe('граница структурщика: процессор БЕЗ состояния', () => {
  it('исходник процессора не объявляет ни одного модульного let/var', () => {
    // Зуб на самое вероятное место протечки, названное структурщиком: если сюда заедет логика
    // окна (хоп, накопление), получится «один король, два скипетра». Судим КОД, а не обещание.
    const src = readFileSync(fileURLToPath(new URL('./mfcc-processor.ts', import.meta.url)), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .replace(/\/\/.*$/gmu, '');
    expect(src).not.toMatch(/^\s*(let|var)\s/mu);
  });

  it('процессор не импортирует библиотеку — она приходит параметром', () => {
    const src = readFileSync(fileURLToPath(new URL('./mfcc-processor.ts', import.meta.url)), 'utf8');
    expect(src).not.toMatch(/from\s+['"]meyda['"]/u);
  });

  it('один и тот же вход даёт бит-в-бит один выход', () => {
    const one = processWindow(windowOf(), CONFIG, stubExtract);
    const two = processWindow(windowOf(), CONFIG, stubExtract);
    expect(one).toEqual(two);
  });
});

describe('движок: состояние живёт здесь и только здесь', () => {
  it('отказы не теряются — иначе «векторов мало» неотличимо от «кадры были плохие»', () => {
    let s = createEngine(CONFIG);
    s = acceptWindow(s, windowOf({ startIndex: 0 }), stubExtract);
    s = acceptWindow(s, windowOf({ samples: new Float32Array(8), startIndex: 512 }), stubExtract);
    const snap = snapshot(s);
    expect(snap.accepted).toBe(1);
    expect(snap.refused).toBe(1);
  });

  it('смена настройки ОТБРАСЫВАЕТ накопленное, а не досчитывает', () => {
    // Векторы разных свёрток несравнимы; оставить их рядом значило бы усреднить несопоставимое.
    let s = createEngine(CONFIG);
    s = acceptWindow(s, windowOf(), stubExtract);
    expect(snapshot(s).accepted).toBe(1);
    s = reconfigure(s, { ...CONFIG, melBands: 26 });
    expect(snapshot(s).accepted).toBe(0);
    expect(snapshot(s).configHash).toBe('mel26-c20-buf512');
  });

  it('та же настройка состояние не трогает', () => {
    let s = createEngine(CONFIG);
    s = acceptWindow(s, windowOf(), stubExtract);
    expect(reconfigure(s, { ...CONFIG })).toBe(s);
  });
});
