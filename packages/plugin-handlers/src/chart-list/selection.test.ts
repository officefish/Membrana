/**
 * Зубы отбора чарт-листа. Блок c2b спринта `chart-list-plugin`.
 *
 * Гоняются на ЧИСЛАХ, без декодирования звука: ядро отбора звука не касается, и зуб, которому
 * понадобился бы wav, доказывал бы, что граница слоёв проведена неверно.
 *
 * Проверяется не «функция вернула массив», а утверждения, ради которых критерии заведены: что
 * выбор между ними что-то значит, что отсев работает на вырожденном материале, и что отказ
 * приходит вместо списка, а не пустым списком.
 */
import { describe, expect, it } from 'vitest';

import {
  CHART_LIST_CRITERIA,
  CHART_LIST_VOLUMES,
  isChartListCriterion,
  isChartListVolume,
  selectChartList,
  filterByDateWindow,
  type ChartListCandidate,
} from './selection.js';
import type { EventFeatures } from '../session-metrics/index.js';

const features = (over: Partial<EventFeatures> = {}): EventFeatures => ({
  centroidHz: 1000,
  rolloffHz: 4000,
  flatness: 0.1,
  zeroCrossingRate: 0.05,
  flux: 0.2,
  ...over,
});

const cand = (over: Partial<ChartListCandidate> = {}): ChartListCandidate => ({
  entryId: 'e1',
  sampleId: 's1',
  at: 1_755_000_000_000,
  deltaDb: 15,
  peakDb: -20,
  flatness: 0.1,
  structure: 'tonal',
  durationSec: 1.5,
  features: features(),
  ...over,
});

/** Разнородный материал: у каждого своя спектральная форма — отсеву нечего вытеснять. */
const varied = (n: number): ChartListCandidate[] =>
  Array.from({ length: n }, (_, i) =>
    cand({
      entryId: `e${i}`,
      sampleId: `s${i}`,
      deltaDb: 30 - i,
      flatness: 0.02 + i * 0.03,
      structure: i < 3 ? 'tonal' : 'broadband',
      durationSec: 0.5 + i,
      features: features({ centroidHz: 500 + i * 900, rolloffHz: 2000 + i * 1500, flux: i * 0.3 }),
    }),
  );

/** Вырожденный материал: восемь копий одного хлопка, отличаются только громкостью. */
const clones = (n: number): ChartListCandidate[] =>
  Array.from({ length: n }, (_, i) =>
    cand({
      entryId: `c${i}`,
      sampleId: `cs${i}`,
      deltaDb: 25 - i * 0.1,
      structure: 'broadband',
      flatness: 0.4,
      durationSec: 1,
      features: features({ centroidHz: 3000, rolloffHz: 7000, flatness: 0.4, flux: 1 }),
    }),
  );

describe('закрытые списки настроек', () => {
  it('объёмы — ровно заказ владельца, произвольного числа нет', () => {
    expect([...CHART_LIST_VOLUMES]).toEqual([200, 100, 60, 20]);
    expect(isChartListVolume(50)).toBe(false);
    expect(isChartListVolume(20)).toBe(true);
  });

  it('критериев ровно три — четвёртый отвергнут командой 3/3', () => {
    expect(CHART_LIST_CRITERIA).toHaveLength(3);
    expect(isChartListCriterion('rare')).toBe(false);
    expect(isChartListCriterion('редкие')).toBe(false);
  });
});

describe('критерий «превышение над фоном»', () => {
  it('порядок — по превышению, самый громкий первым', () => {
    const s = selectChartList(varied(5), 'loudness-over-floor', 20);
    expect(s.picks.map((p) => p.deltaDb)).toEqual([30, 29, 28, 27, 26]);
    expect(s.picks[0]?.rank).toBe(1);
  });

  it('похожее НЕ отсеивает — иначе выбор между первым и вторым критерием ничего не значил бы', () => {
    const s = selectChartList(clones(8), 'loudness-over-floor', 20);
    expect(s.picks).toHaveLength(8);
    expect(s.picks.every((p) => p.displaced === 0)).toBe(true);
  });
});

describe('критерий «разнообразие спектральной формы»', () => {
  it('на вырожденном материале оставляет ОДИН звук, а не двадцать кусков одного хлопка', () => {
    const s = selectChartList(clones(8), 'spectral-variety', 20);
    expect(s.picks).toHaveLength(1);
    expect(s.picks[0]?.displaced).toBe(7);
  });

  it('на разнородном материале не выбрасывает никого — ноль вытесненных законен', () => {
    const s = selectChartList(varied(6), 'spectral-variety', 20);
    expect(s.picks).toHaveLength(6);
    expect(s.picks.every((p) => p.displaced === 0)).toBe(true);
  });

  it('громкие идут вперёд среди непохожих — отсев меняет состав, а не смысл порядка', () => {
    const s = selectChartList(varied(6), 'spectral-variety', 20);
    expect(s.picks[0]?.deltaDb).toBe(30);
  });
});

describe('пары «оставленный / вытесненный»', () => {
  it('вытесненные приходят АДРЕСАМИ, а не только счётчиком — иначе порог нечем проверить слухом', () => {
    const s = selectChartList(clones(8), 'spectral-variety', 20);
    expect(s.displacements).toHaveLength(1);
    expect(s.displacements[0]?.keeperRank).toBe(1);
    expect(s.displacements[0]?.displaced).toHaveLength(7);
    for (const d of s.displacements[0]!.displaced) {
      expect(typeof d.entryId).toBe('string');
      expect(d.entryId.length).toBeGreaterThan(0);
    }
  });

  it('счётчик и число адресов сходятся — два способа сказать одно не расходятся', () => {
    const s = selectChartList(clones(8), 'spectral-variety', 20);
    const byRank = new Map(s.displacements.map((d) => [d.keeperRank, d.displaced.length]));
    for (const p of s.picks) expect(byRank.get(p.rank) ?? 0).toBe(p.displaced);
  });

  it('вытесненный несёт ВРЕМЯ — соседство по времени и есть та слепота, которую проверяют слухом', () => {
    const s = selectChartList(clones(8), 'spectral-variety', 20);
    for (const d of s.displacements[0]!.displaced) expect(Number.isFinite(d.at)).toBe(true);
  });

  it('оставленного среди вытесненных НЕТ — иначе строка вытеснила бы сама себя', () => {
    const s = selectChartList(clones(8), 'spectral-variety', 20);
    const kept = new Set(s.picks.map((p) => p.entryId));
    for (const d of s.displacements.flatMap((x) => x.displaced)) {
      expect(kept.has(d.entryId)).toBe(false);
    }
  });

  it('на разнородном материале пар нет — ноль вытесненных законен', () => {
    expect(selectChartList(varied(6), 'spectral-variety', 20).displacements).toHaveLength(0);
  });

  it('у критериев БЕЗ отсева пар нет по природе — там вытеснять некому', () => {
    expect(selectChartList(clones(8), 'loudness-over-floor', 20).displacements).toHaveLength(0);
    expect(selectChartList(clones(8), 'drone-likeness', 20).displacements).toHaveLength(0);
  });

  it('отказ несёт пустые пары, а не отсутствующее поле — форма ответа одна на все исходы', () => {
    expect(selectChartList([], 'spectral-variety', 20).displacements).toEqual([]);
    expect(selectChartList(clones(4), 'нет-такого', 20).displacements).toEqual([]);
  });
});

describe('критерий «близость к портрету дрона»', () => {
  it('тональное впереди широкополосного — портрет, а не громкость', () => {
    const s = selectChartList(varied(6), 'drone-likeness', 20);
    expect(s.picks[0]?.structure).toBe('tonal');
    expect(s.picks.at(-1)?.structure).toBe('broadband');
  });

  it('порядок отличается от порядка по громкости — иначе критерий был бы синонимом', () => {
    const material = [
      cand({ entryId: 'громкий-шум', deltaDb: 40, flatness: 0.9, structure: 'broadband' }),
      cand({ entryId: 'тихий-тон', deltaDb: 12, flatness: 0.03, structure: 'tonal' }),
    ];
    expect(selectChartList(material, 'loudness-over-floor', 20).picks[0]?.entryId).toBe('громкий-шум');
    expect(selectChartList(material, 'drone-likeness', 20).picks[0]?.entryId).toBe('тихий-тон');
  });
});

describe('объём и недобор', () => {
  it('объём режет список, а не материал: заказано 20 — пришло 20 из 40', () => {
    const s = selectChartList(varied(40), 'loudness-over-floor', 20);
    expect(s.picks).toHaveLength(20);
    expect(s.shortfall).toBe(0);
  });

  it('недобор назван числом, а не молчанием', () => {
    const s = selectChartList(varied(7), 'loudness-over-floor', 20);
    expect(s.picks).toHaveLength(7);
    expect(s.shortfall).toBe(13);
  });
});

describe('отказы приходят ВМЕСТО списка', () => {
  it('кандидатов нет — отказ назван, а не пустой список без причины', () => {
    const s = selectChartList([], 'loudness-over-floor', 20);
    expect(s.refusal?.reason).toBe('no-candidates');
    expect(s.picks).toEqual([]);
  });

  it('критерий вне тройки — отказ, а не тихая подстановка первого', () => {
    const s = selectChartList(varied(3), 'rare', 20);
    expect(s.refusal?.reason).toBe('unknown-criterion');
    expect(s.picks).toEqual([]);
  });

  it('объём вне списка — отказ, а не округление к ближайшему', () => {
    const s = selectChartList(varied(3), 'loudness-over-floor', 50);
    expect(s.refusal?.reason).toBe('unknown-volume');
    expect(s.picks).toEqual([]);
  });

  it('успешный отбор отказа не несёт — отказ и список взаимоисключающи', () => {
    const s = selectChartList(varied(3), 'loudness-over-floor', 20);
    expect(s.refusal).toBeNull();
    expect(s.picks.length).toBeGreaterThan(0);
  });
});

describe('строка несёт ровно названное владельцем', () => {
  it('превышение над фоном, структура и пик — есть', () => {
    const p = selectChartList(varied(1), 'loudness-over-floor', 20).picks[0]!;
    expect(p).toHaveProperty('deltaDb');
    expect(p).toHaveProperty('structure');
    expect(p).toHaveProperty('peakDb');
  });

  it('узла, длительности, частоты и режима захвата НЕТ — они уже в карточке журнала', () => {
    const p = selectChartList(varied(1), 'loudness-over-floor', 20).picks[0]!;
    for (const absent of ['nodeId', 'durationSec', 'sampleRate', 'captureMode']) {
      expect(absent in p).toBe(false);
    }
  });

  it('адреса записи и блоба оба на месте: по первому строка ищет себя, по второму играет звук', () => {
    const p = selectChartList(varied(1), 'loudness-over-floor', 20).picks[0]!;
    expect(p.entryId).toBeTruthy();
    expect(p.sampleId).toBeTruthy();
  });
});

// ── окно дат (#2110) ──────────────────────────────────────────────────────────

describe('filterByDateWindow', () => {
  const DAY = 86_400_000;
  const t0 = 1_755_000_000_000;
  /** Три записи в три «дня»: вчера, сегодня, завтра. */
  const spread = [
    cand({ entryId: 'вчера', sampleId: 'sв', at: t0 - DAY }),
    cand({ entryId: 'сегодня', sampleId: 'sс', at: t0 }),
    cand({ entryId: 'завтра', sampleId: 'sз', at: t0 + DAY }),
  ];

  it('без окна кандидаты проходят как есть — старые вызовы не меняют поведения', () => {
    expect(filterByDateWindow(spread, null).candidates).toHaveLength(3);
    expect(filterByDateWindow(spread, {}).candidates).toHaveLength(3);
    expect(filterByDateWindow(spread, undefined).refusal).toBeNull();
  });

  it('окно сужает с обеих сторон, границы ВКЛЮЧИТЕЛЬНЫ', () => {
    // «с 20.08 по 22.08» для человека значит «включая оба дня» — запись ровно на границе своя.
    const { candidates, refusal } = filterByDateWindow(spread, { fromMs: t0, toMs: t0 + DAY });
    expect(refusal).toBeNull();
    expect(candidates.map((c) => c.entryId)).toEqual(['сегодня', 'завтра']);
  });

  it('полуоткрытые окна законны: только from и только to', () => {
    expect(filterByDateWindow(spread, { fromMs: t0 }).candidates.map((c) => c.entryId)).toEqual([
      'сегодня',
      'завтра',
    ]);
    expect(filterByDateWindow(spread, { toMs: t0 }).candidates.map((c) => c.entryId)).toEqual([
      'вчера',
      'сегодня',
    ]);
  });

  it('ПУСТОЕ ОКНО — отказ словом, отличимый от «кандидатов нет вовсе»', () => {
    const { candidates, refusal } = filterByDateWindow(spread, {
      fromMs: t0 + 10 * DAY,
      toMs: t0 + 11 * DAY,
    });
    expect(candidates).toHaveLength(0);
    expect(refusal?.reason).toBe('empty-window');
  });

  it('ПЕРЕПУТАННЫЕ ГРАНИЦЫ — отказ invalid-window, а не молчаливое пусто', () => {
    // Опечатка в датах не то же самое, что «в этот период ничего не было».
    const { refusal } = filterByDateWindow(spread, { fromMs: t0 + DAY, toMs: t0 - DAY });
    expect(refusal?.reason).toBe('invalid-window');
    expect(refusal?.detail).toContain('перепутаны');
  });

  it('нечисловая граница — отказ, а не сравнение с NaN', () => {
    expect(filterByDateWindow(spread, { fromMs: Number.NaN }).refusal?.reason).toBe('invalid-window');
  });
});

describe('selectChartList с окном', () => {
  const DAY = 86_400_000;
  const t0 = 1_755_000_000_000;

  it('окно сужает ДО отбора: выборка на 20 берёт лучших ИЗ ПРОМЕЖУТКА, а не прячет из готовой', () => {
    // Десять записей: пять старых ГРОМКИХ и пять свежих тихих. Отбор «громче фона» при окне
    // на свежие обязан вернуть пять свежих — если бы окно применялось ПОСЛЕ отбора, вернулось
    // бы пусто: топ-20 за всё время заняли бы старые громкие.
    const olderLoud = Array.from({ length: 5 }, (_, i) =>
      cand({ entryId: `старый${i}`, sampleId: `so${i}`, at: t0 - 10 * DAY, deltaDb: 30 + i }),
    );
    const freshQuiet = Array.from({ length: 5 }, (_, i) =>
      cand({ entryId: `свежий${i}`, sampleId: `sf${i}`, at: t0 + i, deltaDb: 5 + i }),
    );
    const out = selectChartList([...olderLoud, ...freshQuiet], 'loudness-over-floor', 20, undefined, {
      fromMs: t0,
    });
    expect(out.refusal).toBeNull();
    expect(out.picks).toHaveLength(5);
    expect(out.picks.every((p) => p.entryId.startsWith('свежий'))).toBe(true);
  });

  it('отказ окна доезжает до выборки целиком, отбор не запускается', () => {
    const out = selectChartList([cand()], 'loudness-over-floor', 20, undefined, {
      fromMs: t0 + DAY,
      toMs: t0 - DAY,
    });
    expect(out.refusal?.reason).toBe('invalid-window');
    expect(out.picks).toHaveLength(0);
  });

  it('без окна подпись вызова прежняя — пятый аргумент необязателен', () => {
    const out = selectChartList([cand()], 'loudness-over-floor', 20);
    expect(out.refusal).toBeNull();
    expect(out.picks).toHaveLength(1);
  });
});
