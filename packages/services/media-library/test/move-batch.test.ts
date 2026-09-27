/**
 * Зубы переноса пачкой (заказ владельца 27.09).
 *
 * ПРЕДМЕТ — слова и числа, которые прочтёт человек, и путь до двери. Именно здесь живёт
 * риск: доля, названная константой, и план, показанный как факт, — две лжи, которые дом
 * произнёс бы уверенным голосом. Проверяем то, что можно испортить.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createServerStorageBackend } from '../src/backends/server-storage-backend.js';
import { BUFFER_COLLECTION_ID } from '../src/constants.js';
import {
  MOVE_BATCH_START,
  describeMoveBatchOutcome,
  describeMoveBatchPlan,
  formatMoveBatchBytes,
  moveBatchReducer,
  moveBatchTargets,
  pluralSamples,
  type MoveBatchOutcome,
  type MoveBatchSource,
} from '../src/move-batch.js';
import type { Collection } from '../src/types.js';

const BUFFER: MoveBatchSource = { name: 'Буфер', isBuffer: true };

/** Живой случай 27.09: прибор 9e86ec85 — 1057 проб на 486.7 МБ из 512 МБ. */
const LIVE: MoveBatchOutcome = {
  plan: { willMove: 740, willStay: 317, moveBytes: 357_564_416, stayBytes: 153_092_096 },
  moved: [],
  stayed: [],
  userStorage: { usedBytes: 510_378_803, limitBytes: 536_870_912 },
  buffer: { usedBytes: 510_378_803, limitBytes: 536_870_912 },
};

function collection(id: string, kind: Collection['kind'], name = id): Collection {
  return { id, name, kind, createdAt: '2026-09-27T00:00:00.000Z', updatedAt: '2026-09-27T00:00:00.000Z' };
}

describe('куда разрешено переносить', () => {
  const all = [
    collection(BUFFER_COLLECTION_ID, 'buffer', 'Буфер'),
    collection('tariff', 'system', 'Базовый набор'),
    collection('night', 'user', 'Ночь 27.09'),
    collection('day', 'user', 'День'),
  ];

  it('БУФЕР В ВЫБОР НЕ ПОПАДАЕТ — перенос в буфер это не перенос', () => {
    const targets = moveBatchTargets(all, 'night');
    expect(targets.map((c) => c.id)).toEqual(['day']);
  });

  it('системный набор и сам источник тоже не адресаты', () => {
    const targets = moveBatchTargets(all, BUFFER_COLLECTION_ID);
    expect(targets.map((c) => c.id)).toEqual(['night', 'day']);
    expect(targets.some((c) => c.kind === 'system')).toBe(false);
  });
});

describe('слова плана до подтверждения', () => {
  it('ЖИВЫЕ ЧИСЛА, а не процент: «перенесётся 740 из 1057 · 341 МБ»', () => {
    const words = describeMoveBatchPlan({
      plan: LIVE.plan,
      requested: 1057,
      source: BUFFER,
      userStorage: LIVE.userStorage,
    });
    expect(words.headline).toBe('Перенесётся 740 из 1057 · 341.0 МБ');
    // ПОРЧА: вернуть долю — процент в словах плана запрещён, он и был «выдуманной пропорцией».
    expect(words.headline).not.toMatch(/%/u);
    expect(words.warning).not.toMatch(/%/u);
  });

  it('ПРЕДУПРЕЖДЕНИЕ ТОЛЬКО ПРИ willStay > 0', () => {
    const fits = describeMoveBatchPlan({
      plan: { willMove: 1057, willStay: 0, moveBytes: 510_378_803, stayBytes: 0 },
      requested: 1057,
      source: BUFFER,
      userStorage: LIVE.userStorage,
    });
    expect(fits.warning).toBeNull();
  });

  it('предупреждение говорит «останется в буфере» и называет числа остатка', () => {
    const words = describeMoveBatchPlan({
      plan: LIVE.plan,
      requested: 1057,
      source: BUFFER,
      userStorage: LIVE.userStorage,
    });
    expect(words.warning).toContain('останется в буфере');
    expect(words.warning).toContain('317 проб');
    expect(words.warning).toContain('146.0 МБ');
    expect(words.warning).toContain('740 из 1057');
  });

  it('ВИНОВАТ НЕ НАБОР, А ХРАНИЛИЩЕ: у набора ёмкости нет, и окно это говорит', () => {
    // Замер ведущей по devices.service.ts:254-263 — пробы набора считаются осью
    // userStorage, ёмкости у набора не существует. «Набор полон» послало бы человека
    // чистить то, у чего нет предела.
    const words = describeMoveBatchPlan({
      plan: LIVE.plan,
      requested: 1057,
      source: BUFFER,
      userStorage: LIVE.userStorage,
    });
    expect(words.warning).toContain('ёмкости у набора нет');
    expect(words.warning).toContain('хранилище мембраны');
    expect(words.warning).toContain('486.7 МБ из 512.0 МБ');
    expect(words.warning).not.toMatch(/набор полон|набор переполнен/iu);
  });

  it('источник — не буфер: остаток остаётся в СВОЁМ наборе, а не «в буфере»', () => {
    const words = describeMoveBatchPlan({
      plan: LIVE.plan,
      requested: 1057,
      source: { name: 'Ночь 27.09', isBuffer: false },
      userStorage: LIVE.userStorage,
    });
    expect(words.warning).toContain('останется в наборе «Ночь 27.09»');
    expect(words.warning).not.toContain('в буфере');
  });

  it('план посчитан не по заказанному — это названо, а не проглочено', () => {
    const words = describeMoveBatchPlan({
      plan: LIVE.plan,
      requested: 1100,
      source: BUFFER,
      userStorage: LIVE.userStorage,
    });
    expect(words.requestedMismatch).toContain('Заказано 1100 проб');
    expect(words.requestedMismatch).toContain('1057');
  });
});

describe('слова после прогона', () => {
  it('итог — по moved, и расхождение с планом названо ОБОИМИ числами', () => {
    const words = describeMoveBatchOutcome({
      outcome: {
        ...LIVE,
        moved: Array.from({ length: 700 }, (_, i) => `s-${i}`),
        stayed: Array.from({ length: 357 }, (_, i) => ({ sampleId: `r-${i}`, reason: 'no-space' as const })),
      },
      requested: 1057,
      source: BUFFER,
    });
    expect(words.headline).toBe('Перенесено 700 из 1057');
    expect(words.planMismatch).toContain('План обещал 740, перенеслось 700');
    expect(words.planMismatch).toContain('планом, а не фактом');
  });

  it('план сошёлся с фактом — второго слова не нужно', () => {
    const words = describeMoveBatchOutcome({
      outcome: { ...LIVE, moved: Array.from({ length: 740 }, (_, i) => `s-${i}`) },
      requested: 1057,
      source: BUFFER,
    });
    expect(words.planMismatch).toBeNull();
    expect(words.stayed).toBeNull();
  });

  it('оставшиеся названы ПРИЧИНАМИ и числами по каждой', () => {
    const words = describeMoveBatchOutcome({
      outcome: {
        ...LIVE,
        plan: { willMove: 2, willStay: 3, moveBytes: 1024, stayBytes: 2048 },
        moved: ['a', 'b'],
        stayed: [
          { sampleId: 'x', reason: 'no-space' },
          { sampleId: 'y', reason: 'no-space' },
          { sampleId: 'z', reason: 'not-found' },
        ],
      },
      requested: 5,
      source: BUFFER,
    });
    expect(words.stayed).toBe('Останется в буфере 3 пробы · не хватило места в хранилище — 2; проба не найдена — 1.');
  });
});

describe('счёт и единицы', () => {
  it('согласование числа с «пробой»', () => {
    expect(pluralSamples(1)).toBe('1 проба');
    expect(pluralSamples(2)).toBe('2 пробы');
    expect(pluralSamples(5)).toBe('5 проб');
    expect(pluralSamples(11)).toBe('11 проб');
    expect(pluralSamples(21)).toBe('21 проба');
    expect(pluralSamples(317)).toBe('317 проб');
    expect(pluralSamples(0)).toBe('0 проб');
  });

  it('байты — теми же единицами, что у соседей по пакету', () => {
    expect(formatMoveBatchBytes(0)).toBe('0 Б');
    expect(formatMoveBatchBytes(2048)).toBe('2.0 КБ');
    expect(formatMoveBatchBytes(536_870_912)).toBe('512.0 МБ');
    expect(formatMoveBatchBytes(-1)).toBe('н/д');
  });
});

describe('машина шагов окна', () => {
  it('переносить можно ТОЛЬКО из показанного плана', () => {
    // Без плана нет ни списка, ни слова человека: «move-start» из выбора — не шаг.
    const chosen = moveBatchReducer(MOVE_BATCH_START, { type: 'choose', toCollectionId: 'night' });
    expect(moveBatchReducer(chosen, { type: 'move-start' }).phase.kind).toBe('choose');
  });

  it('смена адресата отменяет прежний план — он считался для другого набора', () => {
    let s = moveBatchReducer(MOVE_BATCH_START, { type: 'choose', toCollectionId: 'night' });
    s = moveBatchReducer(s, { type: 'plan-start' });
    s = moveBatchReducer(s, { type: 'plan-done', sampleIds: ['a'], outcome: LIVE });
    expect(s.phase.kind).toBe('planned');
    s = moveBatchReducer(s, { type: 'choose', toCollectionId: 'day' });
    expect(s.phase.kind).toBe('choose');
    expect(s.toCollectionId).toBe('day');
  });

  it('закрытие возвращает окно к началу: второй перенос не начинается с плана первого', () => {
    let s = moveBatchReducer(MOVE_BATCH_START, { type: 'choose', toCollectionId: 'night' });
    s = moveBatchReducer(s, { type: 'plan-start' });
    s = moveBatchReducer(s, { type: 'plan-done', sampleIds: ['a'], outcome: LIVE });
    expect(moveBatchReducer(s, { type: 'close' })).toEqual(MOVE_BATCH_START);
  });

  it('заказ итога — длина ПОКАЗАННОГО списка, а не число из плана', () => {
    let s = moveBatchReducer(MOVE_BATCH_START, { type: 'choose', toCollectionId: 'night' });
    s = moveBatchReducer(s, { type: 'plan-start' });
    s = moveBatchReducer(s, { type: 'plan-done', sampleIds: ['a', 'b', 'c'], outcome: LIVE });
    s = moveBatchReducer(s, { type: 'move-start' });
    s = moveBatchReducer(s, { type: 'move-done', outcome: { ...LIVE, moved: ['a'] } });
    expect(s.phase).toMatchObject({ kind: 'done', requested: 3 });
  });
});

describe('дверь переноса в серверном бэкенде', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('заказ уходит контрактом ведущей: POST /samples/move-batch, тело с dryRun', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string | URL, init?: RequestInit) => {
        calls.push({ url: String(url), init });
        return new Response(JSON.stringify(LIVE), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }),
    );
    const backend = createServerStorageBackend({
      baseUrl: 'https://media.test',
      deviceId: '9e86ec85',
      mediaToken: 'token',
    });

    const outcome = await backend.moveSamplesBatch({
      sampleIds: ['a', 'b'],
      toCollectionId: 'night',
      dryRun: true,
    });

    expect(outcome.plan.willStay).toBe(317);
    expect(calls[0]?.url).toBe('https://media.test/v1/devices/9e86ec85/samples/move-batch');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      sampleIds: ['a', 'b'],
      toCollectionId: 'night',
      dryRun: true,
    });
  });

  it('ПОРЧА: перенос без перечня отбивается до двери', async () => {
    const backend = createServerStorageBackend({
      baseUrl: 'https://media.test',
      deviceId: '9e86ec85',
      mediaToken: 'token',
    });
    await expect(backend.moveSamplesBatch({ sampleIds: [], toCollectionId: 'night' })).rejects.toThrow(
      /Перенос без списка/u,
    );
  });
});
