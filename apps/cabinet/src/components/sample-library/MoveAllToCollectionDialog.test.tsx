/**
 * Зубы окна переноса пачкой — на ПОДСТАВНОМ ПОРТЕ (заказ владельца 27.09).
 *
 * Дверь media (`POST /v1/devices/:deviceId/samples/move-batch`) приезжает серверной половиной
 * (#2488), и окно построено против типизированного порта, а не против `fetch`: тогда зубы
 * ходят тем же путём, каким ходит дом, и интеграция сходится в стволе.
 *
 * ПОЧЕМУ ВСЁ ЗДЕСЬ, В КАБИНЕТЕ. jsdom настроен у него (`apps/cabinet/vite.config.ts`,
 * `environmentMatchGlobs` для `*.test.tsx`), у Studio проверка идёт в node. Тела окон
 * побайтно совпадают (зуб `apps/client/src/modules/move-all-dialog-twins.test.ts`), поэтому
 * проверенное здесь относится к ОБОИМ носителям — иначе один из домов остался бы без зуба.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BUFFER_COLLECTION_ID } from '@membrana/media-library-service';
import type { Collection, MoveBatchOutcome } from '@membrana/media-library-service';

import {
  MOVE_ALL_START,
  MOVE_ALL_STAY_REASON_TITLE,
  MoveAllToCollectionDialog,
  canOfferMoveAll,
  describeMoveAllOutcome,
  describeMoveAllPlan,
  formatMoveAllBytes,
  isMoveAllSourceBuffer,
  moveAllAxesLine,
  moveAllReducer,
  moveAllTargets,
  pluralSamples,
  type MoveAllPort,
  type MoveAllSource,
} from './MoveAllToCollectionDialog';

const COLLECTIONS: readonly Collection[] = [
  { id: 'buffer', name: 'Буфер', kind: 'buffer', createdAt: 'x', updatedAt: 'x' },
  { id: 'tariff', name: 'Базовый набор', kind: 'system', createdAt: 'x', updatedAt: 'x' },
  { id: 'night', name: 'Ночь 27.09', kind: 'user', createdAt: 'x', updatedAt: 'x' },
];

const BUFFER: MoveAllSource = { name: 'Буфер', isBuffer: true };

const ids = (n: number) => Array.from({ length: n }, (_, i) => `s-${i}`);

/**
 * Остающиеся живого случая — ПОИМЁННО и с причиной у каждой.
 *
 * Прежняя редакция держала в образце `stayed: []` при `willStay: 317`, то есть описывала исход,
 * которого дверь не отдаёт: планировщик кладёт причину КАЖДОМУ остающемуся
 * (`packages/background-media/src/modules/samples/move-batch-plan.ts`). На таком образце зуб
 * «виноват не набор» был зелёным не потому, что окно право, а потому, что судить было не по чему.
 */
const STAY_NO_SPACE = ids(317).map((sampleId) => ({ sampleId, reason: 'no-space' as const }));

/** Живой случай 27.09: прибор 9e86ec85 — 1057 проб, 486.7 МБ из 512 МБ, места на 740. */
const TIGHT: MoveBatchOutcome = {
  plan: { willMove: 740, willStay: 317, moveBytes: 357_564_416, stayBytes: 153_092_096 },
  moved: [],
  stayed: STAY_NO_SPACE,
  userStorage: { usedBytes: 510_378_803, limitBytes: 536_870_912 },
  buffer: { usedBytes: 510_378_803, limitBytes: 536_870_912 },
  maxBatch: 2000,
};

/** Ожидание, которым зуб держит окно «занятым» ровно столько, сколько нужно проверке. */
function deferred<T>(): { readonly promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function stubPort(overrides: Partial<MoveAllPort> = {}): MoveAllPort {
  return {
    enumerate: vi.fn(async () => ids(1057)),
    /**
     * Настоящий прогон отдаёт ТЕХ ЖЕ остающихся, что и план: дверь обещает, что при неизменном
     * состоянии множество одно (`planMoveBatch` чист и `dryRun` не видит). Прежний образец
     * гасил здесь `stayed`, и вместе с ним гасил единственную проверку слов об остатке в итоге.
     */
    run: vi.fn(async (_sampleIds, _toCollectionId, options) =>
      options?.dryRun === true ? TIGHT : { ...TIGHT, moved: ids(740) },
    ),
    ...overrides,
  };
}

function open(port: MoveAllPort, extra: { readonly onMoved?: () => void } = {}) {
  return render(
    <MoveAllToCollectionDialog
      open
      source={BUFFER}
      sourceTotal={1057}
      collections={COLLECTIONS}
      sourceCollectionId="buffer"
      port={port}
      onClose={() => undefined}
      {...extra}
    />,
  );
}

async function reachPlan(port: MoveAllPort) {
  open(port);
  fireEvent.change(screen.getByTestId('move-all-target'), { target: { value: 'night' } });
  fireEvent.click(screen.getByTestId('move-all-plan-request'));
  await waitFor(() => expect(screen.getByTestId('move-all-plan')).toBeTruthy());
}

afterEach(() => {
  cleanup();
});

describe('куда разрешено переносить', () => {
  const all: readonly Collection[] = [
    ...COLLECTIONS,
    { id: 'day', name: 'День', kind: 'user', createdAt: 'x', updatedAt: 'x' },
  ];

  it('БУФЕР В ВЫБОР НЕ ПОПАДАЕТ — перенос в буфер это не перенос', () => {
    expect(moveAllTargets(all, 'night').map((c) => c.id)).toEqual(['day']);
  });

  it('системный набор и сам источник тоже не адресаты', () => {
    expect(moveAllTargets(all, 'buffer').map((c) => c.id)).toEqual(['night', 'day']);
  });
});

describe('когда орган массового переноса вообще показывают', () => {
  const targets: readonly Collection[] = [
    { id: 'night', name: 'Ночь 27.09', kind: 'user', createdAt: 'x', updatedAt: 'x' },
  ];

  it('ВНЕ БУФЕРА КНОПКИ НЕТ: дверь возит пачкой только из буфера (слово владельца 27.09)', () => {
    /**
     * «Полагаю, вне буфера она не нужна». Дверь ставит `not-in-buffer` на ВСЁ, когда источник —
     * свой набор человека, то есть окно могло сказать ровно одно: «не поедет ничего». Орган,
     * который не работает, показывать не надо.
     *
     * ПОРЧА: снять условие буфера из `canOfferMoveAll` (вернуть `targets.length > 0`) — зуб
     * краснеет на своём наборе и на виде без набора.
     */
    expect(canOfferMoveAll('night', targets)).toBe(false);
    expect(canOfferMoveAll(null, targets)).toBe(false);
    expect(canOfferMoveAll('', targets)).toBe(false);
    expect(canOfferMoveAll(BUFFER_COLLECTION_ID, targets)).toBe(true);
  });

  it('в буфере, но переносить некуда — кнопки тоже нет', () => {
    // ПОРЧА: убрать `targets.length > 0` — кнопка открыла бы окно с пустым выбором адресата.
    expect(canOfferMoveAll(BUFFER_COLLECTION_ID, [])).toBe(false);
  });

  it('признак буфера — АДРЕС набора, один на кнопку и на слова окна', () => {
    // Второе написание того же признака (`kind === 'buffer'`) разъехалось бы молча: кнопки нет,
    // а окно говорит «останется в наборе». ПОРЧА: сравнить не с BUFFER_COLLECTION_ID.
    expect(isMoveAllSourceBuffer(BUFFER_COLLECTION_ID)).toBe(true);
    expect(isMoveAllSourceBuffer('buffer')).toBe(false);
    expect(isMoveAllSourceBuffer(undefined)).toBe(false);
  });
});

describe('слова плана до подтверждения', () => {
  it('ЖИВЫЕ ЧИСЛА, а не процент: «перенесётся 740 из 1057 · 341 МБ»', () => {
    const words = describeMoveAllPlan({
      plan: TIGHT.plan,
      requested: 1057,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
      stayed: STAY_NO_SPACE,
    });
    expect(words.headline).toBe('Перенесётся 740 из 1057 · 341.0 МБ');
    // ПОРЧА: вернуть долю — процент запрещён, он и был «выдуманной пропорцией» (владелец 27.09).
    expect(words.headline).not.toMatch(/%/u);
    expect(words.warning).not.toMatch(/%/u);
  });

  it('ПРЕДУПРЕЖДЕНИЕ ТОЛЬКО ПРИ willStay > 0', () => {
    // ПОРЧА: снять условие `plan.willStay > 0` — предупреждение полезет туда, где помещается
    // всё, а предупреждение «на всякий случай» перестают читать целиком.
    const fits = describeMoveAllPlan({
      plan: { willMove: 1057, willStay: 0, moveBytes: 510_378_803, stayBytes: 0 },
      requested: 1057,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
      stayed: [],
    });
    expect(fits.warning).toBeNull();
  });

  it('предупреждение говорит «останется в буфере» и называет числа остатка', () => {
    const words = describeMoveAllPlan({
      plan: TIGHT.plan,
      requested: 1057,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
      stayed: STAY_NO_SPACE,
    });
    expect(words.warning).toContain('останется в буфере');
    expect(words.warning).toContain('317 проб');
    expect(words.warning).toContain('146.0 МБ');
    expect(words.warning).toContain('740 из 1057');
  });

  it('ВИНОВАТ НЕ НАБОР, А ХРАНИЛИЩЕ: у набора ёмкости нет, и окно это говорит', () => {
    // Замер по devices.service.ts:254-263 — пробы набора считаются осью userStorage, ёмкости у
    // набора не существует. «Набор полон» послало бы человека чистить то, у чего нет предела.
    const words = describeMoveAllPlan({
      plan: TIGHT.plan,
      requested: 1057,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
      stayed: STAY_NO_SPACE,
    });
    expect(words.warning).toContain('ёмкости у набора нет');
    expect(words.warning).toContain('хранилище мембраны');
    expect(words.warning).toContain('486.7 МБ из 512.0 МБ');
    expect(words.warning).not.toMatch(/набор полон|набор переполнен/iu);
  });

  it('МЕГАБАЙТЫ ОСТАТКА НЕПОЛНЫ, если дверь чего-то не нашла — оговорка названа', () => {
    // Уточнение двери 27.09: веса проб с причиной `not-found` сервер не знает, в stayBytes их
    // нет, а в willStay они есть счётом. Молча показать оба числа — выдать неполные МБ за полные.
    const words = describeMoveAllPlan({
      plan: TIGHT.plan,
      requested: 1057,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
      stayed: [
        ...Array.from({ length: 315 }, (_, i) => ({ sampleId: `n-${i}`, reason: 'no-space' as const })),
        { sampleId: 'gone-1', reason: 'not-found' as const },
        { sampleId: 'gone-2', reason: 'not-found' as const },
      ],
    });
    expect(words.warning).toContain('мегабайты неполны: веса ненайденных проб дверь не знает, их 2');
  });

  it('все остающиеся взвешены — лишней оговорки нет', () => {
    const words = describeMoveAllPlan({
      plan: TIGHT.plan,
      requested: 1057,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
      stayed: [{ sampleId: 'x', reason: 'no-space' }],
    });
    expect(words.warning).not.toContain('мегабайты неполны');
  });

  it('источник — не буфер: остаток остаётся в СВОЁМ наборе, а не «в буфере»', () => {
    const words = describeMoveAllPlan({
      plan: TIGHT.plan,
      requested: 1057,
      source: { name: 'Ночь 27.09', isBuffer: false },
      userStorage: TIGHT.userStorage,
      stayed: STAY_NO_SPACE,
    });
    expect(words.warning).toContain('останется в наборе «Ночь 27.09»');
    expect(words.warning).not.toContain('останется в буфере');
  });

  it('ПОЧЕМУ ОСТАЁТСЯ — НАЗВАНО ПРИЧИНАМИ И ЧИСЛАМИ, теми же словами, что и в итоге', () => {
    // ПОРЧА: убрать перечень причин из предупреждения — человек узнаёт «осталось 317» и не
    // узнаёт, чинить ли ему место или дверь вообще не его набор возит.
    const words = describeMoveAllPlan({
      plan: { willMove: 2, willStay: 3, moveBytes: 1024, stayBytes: 2048 },
      requested: 5,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
      stayed: [
        { sampleId: 'x', reason: 'no-space' },
        { sampleId: 'y', reason: 'no-space' },
        { sampleId: 'z', reason: 'not-in-buffer' },
      ],
    });
    expect(words.warning).toContain('Почему остаётся: не хватило места в хранилище — 2; проба не в буфере прибора — 1.');
  });

  it('ВИНОВНИК — ПО ПРИЧИНАМ, А НЕ ПО willStay: место не винят, когда места хватило', () => {
    /**
     * Живой случай: источником выбран свой набор, а не буфер. Дверь возит пачкой ТОЛЬКО из
     * буфера, поэтому отдаёт `not-in-buffer` на ВСЁ — при том, что в хранилище свободно почти
     * всё. Безусловное «места не хватает, освободите место или смените тариф» врёт ровно тем же
     * способом, каким врало бы «набор полон»: называет виновным не то, что отказало.
     *
     * ПОРЧА: снять условие `noSpace > 0` у обвинения — предупреждение снова пошлёт человека
     * чистить хранилище и менять тариф там, где место ни при чём.
     */
    const words = describeMoveAllPlan({
      plan: { willMove: 0, willStay: 3, moveBytes: 0, stayBytes: 3072 },
      requested: 3,
      source: { name: 'День 27.09', isBuffer: false },
      userStorage: { usedBytes: 1024, limitBytes: 536_870_912 },
      stayed: ['a', 'b', 'c'].map((sampleId) => ({ sampleId, reason: 'not-in-buffer' as const })),
    });
    expect(words.warning).toContain('проба не в буфере прибора — 3');
    expect(words.warning).toContain('Места в хранилище мембраны хватает');
    expect(words.warning).toContain('только из буфера прибора');
    expect(words.warning).not.toMatch(/Освободите место|смените тариф|ёмкости у набора нет/u);
  });

  it('место ВИНЯТ, когда оно и виновато — обвинение не потерялось вместе с условием', () => {
    // Обратная сторона того же зуба: снять обвинение целиком было бы вторым способом соврать.
    const words = describeMoveAllPlan({
      plan: TIGHT.plan,
      requested: 1057,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
      stayed: STAY_NO_SPACE,
    });
    expect(words.warning).toContain('ёмкости у набора нет');
    expect(words.warning).toContain('Освободите место или смените тариф');
    expect(words.warning).not.toContain('Места в хранилище мембраны хватает');
  });

  it('ОСТАТОК ТОЛЬКО ИЗ НЕНАЙДЕННЫХ: совет НЕ предлагает переносить их по одной (#2496)', () => {
    /**
     * Живой случай: окно перечисляет пробы `port.enumerate()`, дверь считает план позже, и
     * проба, удалённая между этим, приезжает с причиной `not-found`
     * (`packages/background-media/src/modules/samples/move-batch-plan.ts:108-112`). Человек
     * читал «проба не найдена — 3» и тут же «остальное переносите по одной пробе» — совет о
     * пробе, которой нет; ровно от такого предупреждения перестают читать все предупреждения.
     *
     * ПОРЧА: свести совет назад к двузначной развилке (одна ветка на `not-in-buffer` и
     * `not-found`) — зуб краснеет на «переносите по одной» там, где переносить нечего.
     */
    const words = describeMoveAllPlan({
      plan: { willMove: 0, willStay: 3, moveBytes: 0, stayBytes: 0 },
      requested: 3,
      source: BUFFER,
      userStorage: { usedBytes: 1024, limitBytes: 536_870_912 },
      stayed: ['a', 'b', 'c'].map((sampleId) => ({ sampleId, reason: 'not-found' as const })),
    });
    expect(words.warning).toContain('проба не найдена — 3');
    expect(words.warning).toContain('Места в хранилище мембраны хватает');
    expect(words.warning).toContain('Ненайденные пробы переносить нечем');
    expect(words.warning).toContain('обновите список набора');
    expect(words.warning, 'совет о пробе, которой нет').not.toMatch(/переносите по одной/u);
    expect(words.warning).not.toMatch(/Освободите место|смените тариф|ёмкости у набора нет/u);
  });

  it('СМЕСЬ «не в буфере» + «не найдена»: «по одной» относится ТОЛЬКО к тем, кто вне буфера', () => {
    // ПОРЧА: склеить обе причины в один совет — «по одной» накроет и ненайденные, то есть
    // соврёт про 3 из 5, как врала двузначная развилка до #2496.
    const words = describeMoveAllPlan({
      plan: { willMove: 0, willStay: 5, moveBytes: 0, stayBytes: 2048 },
      requested: 5,
      source: BUFFER,
      userStorage: { usedBytes: 1024, limitBytes: 536_870_912 },
      stayed: [
        { sampleId: 'b-1', reason: 'not-in-buffer' as const },
        { sampleId: 'b-2', reason: 'not-in-buffer' as const },
        { sampleId: 'g-1', reason: 'not-found' as const },
        { sampleId: 'g-2', reason: 'not-found' as const },
        { sampleId: 'g-3', reason: 'not-found' as const },
      ],
    });
    expect(words.warning).toContain('Места в хранилище мембраны хватает');
    expect(words.warning).toContain('пробы вне буфера переносите по одной');
    expect(words.warning).toContain('Ненайденные пробы переносить нечем');
    // Совет назван по каждой причине, а не «остальное» — «остальное» и было ложью на смеси.
    expect(words.warning).not.toContain('остальное переносите по одной пробе');
  });

  it('СМЕСЬ «нет места» + «не найдена»: место винят, а про ненайденные сказано отдельно', () => {
    // ПОРЧА: оставить обвинение места единственным слагаемым — человек не узнает, что часть
    // остатка не поедет НИКОГДА, сколько места ни освободи.
    const words = describeMoveAllPlan({
      plan: { willMove: 1, willStay: 4, moveBytes: 1024, stayBytes: 2048 },
      requested: 5,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
      stayed: [
        { sampleId: 'n-1', reason: 'no-space' as const },
        { sampleId: 'n-2', reason: 'no-space' as const },
        { sampleId: 'g-1', reason: 'not-found' as const },
        { sampleId: 'g-2', reason: 'not-found' as const },
      ],
    });
    expect(words.warning).toContain('ёмкости у набора нет');
    expect(words.warning).toContain('Освободите место или смените тариф');
    expect(words.warning).toContain('Ненайденные пробы переносить нечем');
    expect(words.warning, 'вне буфера никого нет — совета «по одной» быть не должно').not.toMatch(
      /переносите по одной/u,
    );
  });

  it('план посчитан не по заказанному — это названо, а не проглочено', () => {
    const words = describeMoveAllPlan({
      plan: TIGHT.plan,
      requested: 1100,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
      stayed: STAY_NO_SPACE,
    });
    expect(words.requestedMismatch).toContain('Заказано 1100 проб');
    expect(words.requestedMismatch).toContain('1057');
  });
});

describe('слова после прогона', () => {
  it('итог — по moved, и расхождение с планом названо ОБОИМИ числами', () => {
    const words = describeMoveAllOutcome({
      outcome: {
        ...TIGHT,
        moved: ids(700),
        stayed: Array.from({ length: 357 }, (_, i) => ({ sampleId: `r-${i}`, reason: 'no-space' as const })),
      },
      requested: 1057,
      source: BUFFER,
    });
    expect(words.headline).toBe('Перенесено 700 из 1057');
    expect(words.planMismatch).toContain('План обещал 740, перенеслось 700');
    expect(words.planMismatch).toContain('планом, а не фактом');
  });

  it('план сошёлся с фактом и не осталось никого — второго слова не нужно', () => {
    // Уехало ВСЁ: и расхождения с планом нет, и об остатке говорить нечего.
    const words = describeMoveAllOutcome({
      outcome: {
        ...TIGHT,
        plan: { willMove: 1057, willStay: 0, moveBytes: 510_378_803, stayBytes: 0 },
        moved: ids(1057),
        stayed: [],
      },
      requested: 1057,
      source: BUFFER,
    });
    expect(words.planMismatch).toBeNull();
    expect(words.stayed).toBeNull();
  });

  it('оставшиеся названы ПРИЧИНАМИ и числами по каждой', () => {
    const words = describeMoveAllOutcome({
      outcome: {
        ...TIGHT,
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

  it('ОСИ — СВЕЖИЕ и с ОБЪЯВЛЕННЫМ пределом пачки, а не с угаданным', () => {
    // Уточнение двери 27.09: оси перечитаны из базы на конец вызова, предел пачки объявлен
    // полем maxBatch. Своего числа окно не держит: копия разошлась бы с дверью молча.
    expect(
      moveAllAxesLine({ ...TIGHT, userStorage: { usedBytes: 536_870_912, limitBytes: 536_870_912 } }),
    ).toBe(
      'Хранилище наборов: занято 512.0 МБ из 512.0 МБ · буфер: 486.7 МБ из 512.0 МБ · дверь принимает до 2000 проб за вызов',
    );
  });

  it('СЛОВО ПРИЧИНЫ not-in-buffer годится ВСЕМ ТРЁМ её случаям, включая источник-не-буфер', () => {
    /**
     * Дверь ставит эту причину по одному признаку — `row.inBuffer === false`
     * (`move-batch-plan.ts`), и третий её случай живой: человек выбрал источником свой набор,
     * а не буфер (кнопка к буферу не привязана, #2249), и причина приходит на КАЖДУЮ пробу.
     *
     * ПОРЧА: вернуть «пробы нет в исходном наборе» — на третьем случае это прямая ложь, проба
     * лежит ровно в том наборе, который человек назвал источником.
     */
    expect(MOVE_ALL_STAY_REASON_TITLE['not-in-buffer']).toBe('проба не в буфере прибора');
    expect(MOVE_ALL_STAY_REASON_TITLE['not-in-buffer']).not.toMatch(/нет в исходном наборе|уже/u);
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

  it('байты — теми же единицами, что у соседей по смыслу', () => {
    expect(formatMoveAllBytes(0)).toBe('0 Б');
    expect(formatMoveAllBytes(2048)).toBe('2.0 КБ');
    expect(formatMoveAllBytes(536_870_912)).toBe('512.0 МБ');
    expect(formatMoveAllBytes(-1)).toBe('н/д');
  });
});

describe('машина шагов окна', () => {
  it('переносить можно ТОЛЬКО из показанного плана', () => {
    const chosen = moveAllReducer(MOVE_ALL_START, { type: 'choose', toCollectionId: 'night' });
    expect(moveAllReducer(chosen, { type: 'move-start' }).phase.kind).toBe('choose');
  });

  it('смена адресата отменяет прежний план — он считался для другого набора', () => {
    let s = moveAllReducer(MOVE_ALL_START, { type: 'choose', toCollectionId: 'night' });
    s = moveAllReducer(s, { type: 'plan-start' });
    s = moveAllReducer(s, { type: 'plan-done', sampleIds: ['a'], outcome: TIGHT });
    expect(s.phase.kind).toBe('planned');
    s = moveAllReducer(s, { type: 'choose', toCollectionId: 'day' });
    expect(s.phase.kind).toBe('choose');
    expect(s.toCollectionId).toBe('day');
  });

  it('закрытие возвращает окно к началу: второй перенос не начинается с плана первого', () => {
    let s = moveAllReducer(MOVE_ALL_START, { type: 'choose', toCollectionId: 'night' });
    s = moveAllReducer(s, { type: 'plan-start' });
    s = moveAllReducer(s, { type: 'plan-done', sampleIds: ['a'], outcome: TIGHT });
    expect(moveAllReducer(s, { type: 'close' })).toEqual(MOVE_ALL_START);
  });

  it('заказ итога — длина ПОКАЗАННОГО списка, а не число из плана', () => {
    let s = moveAllReducer(MOVE_ALL_START, { type: 'choose', toCollectionId: 'night' });
    s = moveAllReducer(s, { type: 'plan-start' });
    s = moveAllReducer(s, { type: 'plan-done', sampleIds: ['a', 'b', 'c'], outcome: TIGHT });
    s = moveAllReducer(s, { type: 'move-start' });
    s = moveAllReducer(s, { type: 'move-done', outcome: { ...TIGHT, moved: ['a'] } });
    expect(s.phase).toMatchObject({ kind: 'done', requested: 3 });
  });
});

describe('окно переноса — доступность', () => {
  it('модальный диалог объявлен как диалог и подписан заголовком', () => {
    open(stubPort());
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(String(labelledBy))?.textContent).toBe('Перенести все в набор');
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('Esc закрывает окно', () => {
    const onClose = vi.fn();
    render(
      <MoveAllToCollectionDialog
        open
        source={BUFFER}
        sourceTotal={1057}
        collections={COLLECTIONS}
        sourceCollectionId="buffer"
        port={stubPort()}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('фокус входит в окно при открытии', () => {
    open(stubPort());
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });

  it('ПОКА ОКНО ЗАНЯТО, ОРГАНОВ НЕТ ВОВСЕ — и фокус всё равно не уходит наружу', async () => {
    /**
     * Предмет — те секунды, когда окно считает план: закрытие, отмена, выбор набора и кнопка
     * плана погашены ВСЕ. Прежняя редакция держала захват фокуса, возврат фокуса и клавиатуру
     * одним эффектом с `busy` в зависимостях, и на каждой смене занятости чистка эффекта
     * отдавала фокус кнопке СНАРУЖИ окна, а ловушка Tab, упираясь в пустой перечень органов,
     * выпускала человека на страницу ПОД модальным окном.
     *
     * ПОРЧА 1: вернуть `busy` в зависимости эффекта захвата — фокус уедет на кнопку снаружи.
     * ПОРЧА 2: вернуть `if (list.length === 0) return` в обработчик Tab — Tab оставит фокус
     * снаружи, то есть модальность окна кончится ровно там, где человек ждёт работы.
     */
    const gate = deferred<MoveBatchOutcome>();
    const outside = document.createElement('button');
    outside.textContent = 'кнопка снаружи';
    document.body.appendChild(outside);
    outside.focus();

    open(stubPort({ run: vi.fn(() => gate.promise) }));
    fireEvent.change(screen.getByTestId('move-all-target'), { target: { value: 'night' } });
    fireEvent.click(screen.getByTestId('move-all-plan-request'));
    await waitFor(() => expect(screen.getByTestId('move-all-planning')).toBeTruthy());

    const dialog = screen.getByRole('dialog');
    // Посылка зуба — замером, а не на слово: органов, берущих фокус, в эти секунды нет.
    expect(
      dialog.querySelectorAll('button:not([disabled]), select:not([disabled]), input:not([disabled])'),
    ).toHaveLength(0);

    expect(document.activeElement).not.toBe(outside);
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Фокус силой уведён наружу — Tab обязан вернуть его в окно, а не оставить снаружи.
    outside.focus();
    expect(dialog.contains(document.activeElement)).toBe(false);
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(dialog.contains(document.activeElement)).toBe(true);

    gate.resolve(TIGHT);
    await waitFor(() => expect(screen.getByTestId('move-all-plan')).toBeTruthy());
    outside.remove();
  });

  it('ФОКУС УХОДИТ НАРУЖУ РОВНО ОДИН РАЗ — на закрытии, и к тому, кто окно открыл', async () => {
    /**
     * Два утверждения об одном: пока окно открыто, наружу фокус не отдаётся ВООБЩЕ, а на
     * закрытии возвращается тому, кто окно открыл.
     *
     * Первое — не придирка. Прежняя редакция держала захват фокуса, возврат и клавиатуру одним
     * эффектом с `busy` в зависимостях, а `busy` у этого окна меняет оно САМО (план пошёл, план
     * пришёл, перенос пошёл, перенос кончился). На каждой такой смене чистка эффекта исполняла
     * возврат — то есть фокус четыре раза съезжал на кнопку СНАРУЖИ открытого модального окна и
     * дёргался обратно. Человек с клавиатурой в эти секунды не в окне.
     *
     * Конец состояния при такой порче совпадает со здоровым (чистка сама же и возвращает фокус
     * внутрь на следующем проходе), поэтому предмет проверки — СОБЫТИЯ фокуса, а не снимок
     * `activeElement`: по снимку зуб был бы зелёным на сломанном окне.
     *
     * ПОРЧА 1: вернуть `busy` в зависимости эффекта захвата — счёт уходов наружу станет не 0.
     * ПОРЧА 2: убрать возврат фокуса из чистки — на закрытии человек останется у `body`.
     */
    const outside = document.createElement('button');
    outside.textContent = 'кнопка, открывшая окно';
    document.body.appendChild(outside);
    outside.focus();

    let leftToOutside = 0;
    const countLeaving = () => {
      leftToOutside += 1;
    };
    outside.addEventListener('focus', countLeaving);

    const port = stubPort();
    const view = render(
      <MoveAllToCollectionDialog
        open
        source={BUFFER}
        sourceTotal={1057}
        collections={COLLECTIONS}
        sourceCollectionId="buffer"
        port={port}
        onClose={() => undefined}
      />,
    );
    // Занятость меняется четырежды: план пошёл, план пришёл, перенос пошёл, перенос кончился.
    fireEvent.change(screen.getByTestId('move-all-target'), { target: { value: 'night' } });
    fireEvent.click(screen.getByTestId('move-all-plan-request'));
    await waitFor(() => expect(screen.getByTestId('move-all-plan')).toBeTruthy());
    fireEvent.click(screen.getByTestId('move-all-confirm'));
    await waitFor(() => expect(screen.getByTestId('move-all-result')).toBeTruthy());

    expect(leftToOutside).toBe(0);

    view.rerender(
      <MoveAllToCollectionDialog
        open={false}
        source={BUFFER}
        sourceTotal={1057}
        collections={COLLECTIONS}
        sourceCollectionId="buffer"
        port={port}
        onClose={() => undefined}
      />,
    );
    expect(document.activeElement).toBe(outside);
    expect(leftToOutside).toBe(1);
    outside.removeEventListener('focus', countLeaving);
    outside.remove();
  });
});

describe('выбор набора', () => {
  it('БУФЕР И СИСТЕМНЫЙ НАБОР в список выбора не попадают', () => {
    open(stubPort());
    const options = Array.from(screen.getByTestId('move-all-target').querySelectorAll('option')).map(
      (o) => o.textContent,
    );
    expect(options).toEqual(['Выберите набор…', 'Ночь 27.09']);
  });

  it('без выбранного набора план не запрашивается', () => {
    const port = stubPort();
    open(port);
    expect((screen.getByTestId('move-all-plan-request') as HTMLButtonElement).disabled).toBe(true);
    expect(port.enumerate).not.toHaveBeenCalled();
  });
});

describe('план до подтверждения', () => {
  it('перечисляет ПОЛНЫЙ набор и просит план без движения (dryRun)', async () => {
    const port = stubPort();
    await reachPlan(port);
    expect(port.enumerate).toHaveBeenCalledTimes(1);
    // Подпись ПОЗИЦИОННАЯ — та же, что у глагола слоя доступа (арбитраж 27.09).
    expect(port.run).toHaveBeenCalledWith(ids(1057), 'night', { dryRun: true });
  });

  it('предупреждение в окне несёт живые числа и слово «останется в буфере»', async () => {
    await reachPlan(stubPort());
    const warning = screen.getByTestId('move-all-warning').textContent ?? '';
    expect(warning).toContain('740 из 1057');
    expect(warning).toContain('останется в буфере');
    expect(warning).toContain('317 проб');
    expect(warning).toContain('ёмкости у набора нет');
    expect(warning).not.toContain('%');
  });

  it('ПОМЕЩАЕТСЯ ВСЁ — предупреждения нет вовсе', async () => {
    const fits: MoveBatchOutcome = {
      ...TIGHT,
      plan: { willMove: 1057, willStay: 0, moveBytes: 510_378_803, stayBytes: 0 },
    };
    await reachPlan(stubPort({ run: vi.fn(async () => fits) }));
    expect(screen.queryByTestId('move-all-warning')).toBeNull();
    expect(screen.getByTestId('move-all-plan').textContent).toContain('Перенесётся 1057 из 1057');
  });

  it('пустой набор — названный отказ, а не молчаливый перенос ничего', async () => {
    open(stubPort({ enumerate: vi.fn(async () => []) }));
    fireEvent.change(screen.getByTestId('move-all-target'), { target: { value: 'night' } });
    fireEvent.click(screen.getByTestId('move-all-plan-request'));
    await waitFor(() => expect(screen.getByTestId('move-all-failed').textContent).toContain('переносить нечего'));
  });

  it('БИБЛИОТЕКА ТАК НЕ УМЕЕТ: именованный отказ порта виден человеку, окно не падает', async () => {
    // Глагол порта опциональный: браузерный и electron-fs бэкенды отдают отказ, а не
    // переносят по одной. Молчание здесь было бы хуже ошибки — человек ждал бы переноса.
    open(
      stubPort({
        run: vi.fn(async () => {
          throw new Error('Массовый перенос доступен только при серверной библиотеке (media-server)');
        }),
      }),
    );
    fireEvent.change(screen.getByTestId('move-all-target'), { target: { value: 'night' } });
    fireEvent.click(screen.getByTestId('move-all-plan-request'));
    await waitFor(() =>
      expect(screen.getByTestId('move-all-failed').textContent).toContain(
        'только при серверной библиотеке',
      ),
    );
  });

  it('ИСТОЧНИК НЕ БУФЕР — дверь не двинет ничего: окно говорит правду и не даёт подтвердить', async () => {
    /**
     * Кнопка «перенести все» к буферу не привязана (#2249), а дверь вывозит пачкой ТОЛЬКО из
     * буфера (`row.inBuffer`), поэтому из своего набора план приходит нулевым, а причина у всех
     * — `not-in-buffer`. Два прежних поведения на этой дороге были ложью: предупреждение
     * посылало чистить хранилище, а кнопка «Перенести 0 в «Ночь 27.09»» обещала движение.
     *
     * ПОРЧА: снять `disabled` у подтверждения — окно обещает движение, которого дверь не сделает.
     */
    const stuck: MoveBatchOutcome = {
      ...TIGHT,
      plan: { willMove: 0, willStay: 3, moveBytes: 0, stayBytes: 3072 },
      moved: [],
      stayed: ['a', 'b', 'c'].map((sampleId) => ({ sampleId, reason: 'not-in-buffer' as const })),
      userStorage: { usedBytes: 1024, limitBytes: 536_870_912 },
    };
    render(
      <MoveAllToCollectionDialog
        open
        source={{ name: 'День 27.09', isBuffer: false }}
        sourceTotal={3}
        collections={COLLECTIONS}
        sourceCollectionId="day"
        port={stubPort({ enumerate: vi.fn(async () => ['a', 'b', 'c']), run: vi.fn(async () => stuck) })}
        onClose={() => undefined}
      />,
    );
    fireEvent.change(screen.getByTestId('move-all-target'), { target: { value: 'night' } });
    fireEvent.click(screen.getByTestId('move-all-plan-request'));
    await waitFor(() => expect(screen.getByTestId('move-all-warning')).toBeTruthy());

    const warning = screen.getByTestId('move-all-warning').textContent ?? '';
    expect(warning).toContain('проба не в буфере прибора — 3');
    expect(warning).toContain('Места в хранилище мембраны хватает');
    expect(warning).not.toMatch(/Освободите место|смените тариф/u);
    expect((screen.getByTestId('move-all-confirm') as HTMLButtonElement).disabled).toBe(true);
  });

  it('отказ двери (например цель — сам буфер) доезжает до человека словами', async () => {
    open(
      stubPort({
        run: vi.fn(async () => {
          throw new Error('Переносить в буфер нельзя');
        }),
      }),
    );
    fireEvent.change(screen.getByTestId('move-all-target'), { target: { value: 'night' } });
    fireEvent.click(screen.getByTestId('move-all-plan-request'));
    await waitFor(() =>
      expect(screen.getByTestId('move-all-failed').textContent).toContain('Переносить в буфер нельзя'),
    );
    // ПОРЧА: показать отказ как «перенесётся 0 из 1057» — человек пойдёт искать вину в квоте.
    expect(screen.queryByTestId('move-all-plan')).toBeNull();
  });
});

describe('перенос и его итог', () => {
  it('подтверждение двигает РОВНО показанный список, без dryRun', async () => {
    const port = stubPort();
    await reachPlan(port);
    fireEvent.click(screen.getByTestId('move-all-confirm'));
    await waitFor(() => expect(screen.getByTestId('move-all-result')).toBeTruthy());
    expect(port.run).toHaveBeenLastCalledWith(ids(1057), 'night', { dryRun: false });
    expect(screen.getByTestId('move-all-result').textContent).toBe('Перенесено 740 из 1057');
  });

  it('ФАКТ РАСХОДИТСЯ С ПЛАНОМ — окно говорит это, а не показывает план как итог', async () => {
    const port = stubPort({
      run: vi.fn(async (_sampleIds, _toCollectionId, options) =>
        options?.dryRun === true
          ? TIGHT
          : {
              ...TIGHT,
              moved: ids(700),
              stayed: ids(357).map((sampleId) => ({ sampleId, reason: 'no-space' as const })),
            },
      ),
    });
    await reachPlan(port);
    fireEvent.click(screen.getByTestId('move-all-confirm'));
    await waitFor(() => expect(screen.getByTestId('move-all-result-mismatch')).toBeTruthy());
    expect(screen.getByTestId('move-all-result').textContent).toBe('Перенесено 700 из 1057');
    expect(screen.getByTestId('move-all-result-mismatch').textContent).toContain(
      'План обещал 740, перенеслось 700',
    );
    expect(screen.getByTestId('move-all-result-stayed').textContent).toContain(
      'не хватило места в хранилище — 357',
    );
  });

  it('СВЕЖИЕ ОСИ после переноса — из того же ответа, без второго запроса квоты', async () => {
    const port = stubPort({
      run: vi.fn(async (_sampleIds, _toCollectionId, options) =>
        options?.dryRun === true
          ? TIGHT
          : {
              ...TIGHT,
              moved: ids(740),
              userStorage: { usedBytes: 536_870_912, limitBytes: 536_870_912 },
              buffer: { usedBytes: 131_072_000, limitBytes: 536_870_912 },
            },
      ),
    });
    await reachPlan(port);
    fireEvent.click(screen.getByTestId('move-all-confirm'));
    await waitFor(() => expect(screen.getByTestId('move-all-result-axes')).toBeTruthy());
    expect(screen.getByTestId('move-all-result-axes').textContent).toContain('512.0 МБ из 512.0 МБ');
    expect(screen.getByTestId('move-all-result-axes').textContent).toContain('буфер: 125.0 МБ');
    expect(port.run).toHaveBeenCalledTimes(2);
  });

  it('дом узнаёт о переносе — страницу проб пора перечитать', async () => {
    const onMoved = vi.fn();
    const port = stubPort();
    open(port, { onMoved });
    fireEvent.change(screen.getByTestId('move-all-target'), { target: { value: 'night' } });
    fireEvent.click(screen.getByTestId('move-all-plan-request'));
    await waitFor(() => expect(screen.getByTestId('move-all-plan')).toBeTruthy());
    fireEvent.click(screen.getByTestId('move-all-confirm'));
    await waitFor(() => expect(onMoved).toHaveBeenCalledTimes(1));
  });
});
