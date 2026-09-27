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
import type { Collection, MoveBatchOutcome } from '@membrana/media-library-service';

import {
  MOVE_ALL_START,
  MOVE_ALL_STAY_REASON_TITLE,
  MoveAllToCollectionDialog,
  describeMoveAllOutcome,
  describeMoveAllPlan,
  formatMoveAllBytes,
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

/** Живой случай 27.09: прибор 9e86ec85 — 1057 проб, 486.7 МБ из 512 МБ, места на 740. */
const TIGHT: MoveBatchOutcome = {
  plan: { willMove: 740, willStay: 317, moveBytes: 357_564_416, stayBytes: 153_092_096 },
  moved: [],
  stayed: [],
  userStorage: { usedBytes: 510_378_803, limitBytes: 536_870_912 },
  buffer: { usedBytes: 510_378_803, limitBytes: 536_870_912 },
  maxBatch: 2000,
};

const ids = (n: number) => Array.from({ length: n }, (_, i) => `s-${i}`);

function stubPort(overrides: Partial<MoveAllPort> = {}): MoveAllPort {
  return {
    enumerate: vi.fn(async () => ids(1057)),
    run: vi.fn(async (_sampleIds, _toCollectionId, options) =>
      options?.dryRun === true ? TIGHT : { ...TIGHT, moved: ids(740), stayed: [] },
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

describe('слова плана до подтверждения', () => {
  it('ЖИВЫЕ ЧИСЛА, а не процент: «перенесётся 740 из 1057 · 341 МБ»', () => {
    const words = describeMoveAllPlan({
      plan: TIGHT.plan,
      requested: 1057,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
    });
    expect(words.headline).toBe('Перенесётся 740 из 1057 · 341.0 МБ');
    // ПОРЧА: вернуть долю — процент запрещён, он и был «выдуманной пропорцией» (владелец 27.09).
    expect(words.headline).not.toMatch(/%/u);
    expect(words.warning).not.toMatch(/%/u);
  });

  it('ПРЕДУПРЕЖДЕНИЕ ТОЛЬКО ПРИ willStay > 0', () => {
    const fits = describeMoveAllPlan({
      plan: { willMove: 1057, willStay: 0, moveBytes: 510_378_803, stayBytes: 0 },
      requested: 1057,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
    });
    expect(fits.warning).toBeNull();
  });

  it('предупреждение говорит «останется в буфере» и называет числа остатка', () => {
    const words = describeMoveAllPlan({
      plan: TIGHT.plan,
      requested: 1057,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
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
    });
    expect(words.warning).toContain('останется в наборе «Ночь 27.09»');
    expect(words.warning).not.toContain('в буфере');
  });

  it('план посчитан не по заказанному — это названо, а не проглочено', () => {
    const words = describeMoveAllPlan({
      plan: TIGHT.plan,
      requested: 1100,
      source: BUFFER,
      userStorage: TIGHT.userStorage,
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

  it('план сошёлся с фактом — второго слова не нужно', () => {
    const words = describeMoveAllOutcome({
      outcome: { ...TIGHT, moved: ids(740) },
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

  it('слова причины «нет в исходном наборе» годятся и тарифной пробе, и гонке', () => {
    expect(MOVE_ALL_STAY_REASON_TITLE['not-in-buffer']).toBe('пробы нет в исходном наборе');
    expect(MOVE_ALL_STAY_REASON_TITLE['not-in-buffer']).not.toContain('уже');
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
