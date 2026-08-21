/**
 * Зубы мер разбора сеанса (j1). Каждое требование владельца 21.08 — отдельным зубом:
 * относительность громкости, отсев похожего, различение шума и структуры. Плюс отказы:
 * «нечем судить» не притворяется «не найдено».
 */
import { describe, expect, it } from 'vitest';

import {
  dbOverFloor,
  dedupeGreedy,
  euclidean,
  findEvents,
  loudnessEnvelope,
  normalizeFeatures,
  refuseSession,
  sessionFloor,
  shortfallOf,
  structureBoundary,
  structureOf,
  type EventFeatures,
} from './index.js';

const tone = (length: number, amp: number, hz = 440, sr = 48000): Float32Array => {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = amp * Math.sin((2 * Math.PI * hz * i) / sr);
  return out;
};

const features = (over: Partial<EventFeatures> = {}): EventFeatures => ({
  centroidHz: 1000,
  rolloffHz: 4000,
  flatness: 0.2,
  zeroCrossingRate: 0.1,
  flux: 0,
  ...over,
});

describe('громкость относительна (требование 1)', () => {
  it('одно и то же событие при разном усилении даёт ОДИН и тот же дБ над фоном', () => {
    // Тракт погромче в 4 раза: и фон, и пик выросли одинаково — превышение обязано не сдвинуться.
    expect(dbOverFloor(0.4, 0.01)).toBeCloseTo(dbOverFloor(1.6, 0.04), 10);
  });

  it('20·log10 — именно дБ, а не отношение', () => {
    expect(dbOverFloor(0.1, 0.01)).toBeCloseTo(20, 10);
    expect(dbOverFloor(0.01, 0.01)).toBeCloseTo(0, 10);
  });

  it('вырожденный вход не даёт NaN — он даёт «минус бесконечность», и это видно', () => {
    expect(dbOverFloor(0, 0.01)).toBe(Number.NEGATIVE_INFINITY);
    expect(dbOverFloor(0.1, 0)).toBe(Number.NEGATIVE_INFINITY);
  });

  it('фон короче двадцати кадров помечается как НЕ измеренный', () => {
    expect(sessionFloor(new Array(19).fill(0.02)).floorIsFallback).toBe(true);
    expect(sessionFloor(new Array(200).fill(0.02)).floorIsFallback).toBe(false);
  });
});

describe('события — точка во времени, не весь трек', () => {
  const envelope = Float32Array.from([0.01, 0.01, 0.5, 0.6, 0.01, 0.01, 0.9, 0.01]);

  it('границы и смещение считаются от кадров; порог берётся от фона', () => {
    const events = findEvents(envelope, 0.01, 12, 4800, 48000);
    expect(events).toHaveLength(1);
    expect(events[0]!.startSec).toBeCloseTo(0.2, 10);
    expect(events[0]!.endSec).toBeCloseTo(0.4, 10);
    // 6 знаков, а не 10: огибающая живёт в Float32Array, и 0.6 в ней — 0.60000002. Это предел
    // контейнера, а не погрешность меры; требовать больше значило бы проверять не то.
    expect(events[0]!.peak).toBeCloseTo(0.6, 6);
  });

  it('одиночный кадр над порогом событием не считается (щелчок оцифровки ≠ хлопок)', () => {
    // 0.9 в предпоследнем кадре — один кадр, и он отброшен: в результате только двухкадровое.
    expect(findEvents(envelope, 0.01, 12, 4800, 48000).map((e) => e.frameCount)).toEqual([2]);
  });

  it('порог поднят — событий нет, и это пустой список, а не выдуманное событие', () => {
    expect(findEvents(envelope, 0.01, 60, 4800, 48000)).toEqual([]);
  });

  it('огибающая короче кадра — пусто, без броска', () => {
    expect(loudnessEnvelope(tone(100, 0.5), 4096)).toHaveLength(0);
  });
});

describe('отсев похожего (требование 2)', () => {
  it('двадцать кусков одного хлопка схлопываются в один', () => {
    const same = Array.from({ length: 5 }, () => features());
    const far = features({ centroidHz: 6000, rolloffHz: 12000, flatness: 0.9, zeroCrossingRate: 0.8 });
    const vectors = normalizeFeatures([...same, far]);
    const order = [0, 1, 2, 3, 4, 5];
    const { kept, droppedAs } = dedupeGreedy(vectors, order, 0.05, 20);
    expect(kept).toEqual([0, 5]);
    expect([...droppedAs.keys()].sort()).toEqual([1, 2, 3, 4]);
    expect(droppedAs.get(3)).toBe(0);
  });

  it('порядок несущий: первым остаётся тот, кого подали громчайшим', () => {
    const vectors = normalizeFeatures([features(), features(), features({ centroidHz: 5000 })]);
    expect(dedupeGreedy(vectors, [1, 0, 2], 0.05, 20).kept[0]).toBe(1);
  });

  it('limit держится: из ста разных берём двадцать', () => {
    const many = Array.from({ length: 100 }, (_, i) => features({ centroidHz: 200 + i * 80 }));
    const vectors = normalizeFeatures(many);
    expect(dedupeGreedy(vectors, many.map((_, i) => i), 0.001, 20).kept).toHaveLength(20);
  });

  it('нормировка по диапазону сеанса: вырожденная ось молчит, а не тянет расстояние', () => {
    const v = normalizeFeatures([features(), features({ centroidHz: 2000 })]);
    expect(v[0]).toEqual([0, 0, 0, 0]);
    expect(v[1]![0]).toBe(1);
    expect(v[1]!.slice(1)).toEqual([0, 0, 0]);
    expect(euclidean(v[0]!, v[1]!)).toBeCloseTo(1, 10);
  });
});

describe('шум против структуры (требование 3)', () => {
  it('граница — квантиль сеанса, а не константа', () => {
    const flat = [0.1, 0.2, 0.3, 0.8, 0.9];
    expect(structureBoundary(flat, 0.5)).toBe(0.3);
    expect(structureBoundary(flat, 0)).toBe(0.1);
    // Тот же квантиль на «шумном» сеансе даёт ДРУГОЕ число — в этом и смысл.
    expect(structureBoundary([0.7, 0.8, 0.9], 0.5)).toBe(0.8);
  });

  it('тон уходит в опорные, широкополосный всплеск — в негативный материал', () => {
    const boundary = structureBoundary([0.1, 0.2, 0.9, 0.95], 0.5);
    expect(structureOf(0.1, boundary)).toBe('tonal');
    expect(structureOf(0.95, boundary)).toBe('broadband');
  });
});

describe('отказы и недобор', () => {
  it('отказ несёт имя причины и подробность', () => {
    const r = refuseSession('floor-not-measured', 'кадров 12 < 20');
    expect(r).toEqual({ ok: false, reason: 'floor-not-measured', detail: 'кадров 12 < 20' });
  });

  it('недобор — не отказ: отдаём сколько есть и называем недостачу числом', () => {
    expect(shortfallOf(14, 20)).toBe(6);
    expect(shortfallOf(20, 20)).toBe(0);
    expect(shortfallOf(25, 20)).toBe(0);
  });
});
