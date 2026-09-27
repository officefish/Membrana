/**
 * Зубы окна переноса пачкой — на ПОДСТАВНОМ ПОРТЕ (заказ владельца 27.09).
 *
 * Дверь media (`POST /v1/devices/:deviceId/samples/move-batch`) пишется параллельно, и окно
 * сознательно построено против типизированного порта, а не против `fetch`: тогда зубы ходят
 * тем же путём, каким ходит дом, а интеграция сходится в стволе.
 *
 * Дом здесь кабинетный, потому что jsdom настроен у него (`apps/cabinet/vite.config.ts`,
 * `environmentMatchGlobs` для `*.test.tsx`); у Studio вся проверка тестов идёт в node. Тела
 * окон побайтно совпадают (зуб `apps/client/src/modules/move-all-dialog-twins.test.ts`),
 * поэтому проверенное здесь поведение относится к обоим носителям.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Collection, MoveBatchOutcome, MoveBatchPort } from '@membrana/media-library-service';

import { MoveAllToCollectionDialog } from './MoveAllToCollectionDialog';

const COLLECTIONS: readonly Collection[] = [
  { id: 'buffer', name: 'Буфер', kind: 'buffer', createdAt: 'x', updatedAt: 'x' },
  { id: 'tariff', name: 'Базовый набор', kind: 'system', createdAt: 'x', updatedAt: 'x' },
  { id: 'night', name: 'Ночь 27.09', kind: 'user', createdAt: 'x', updatedAt: 'x' },
];

/** Живой случай 27.09: 1057 проб, места хватает на 740. */
const TIGHT: MoveBatchOutcome = {
  plan: { willMove: 740, willStay: 317, moveBytes: 357_564_416, stayBytes: 153_092_096 },
  moved: [],
  stayed: [],
  userStorage: { usedBytes: 510_378_803, limitBytes: 536_870_912 },
  buffer: { usedBytes: 510_378_803, limitBytes: 536_870_912 },
};

const ids = (n: number) => Array.from({ length: n }, (_, i) => `s-${i}`);

function stubPort(overrides: Partial<MoveBatchPort> = {}): MoveBatchPort {
  return {
    enumerate: vi.fn(async () => ids(1057)),
    run: vi.fn(async (request) =>
      request.dryRun === true ? TIGHT : { ...TIGHT, moved: ids(740), stayed: [] },
    ),
    ...overrides,
  };
}

function open(port: MoveBatchPort, extra: { readonly onMoved?: () => void } = {}) {
  return render(
    <MoveAllToCollectionDialog
      open
      source={{ name: 'Буфер', isBuffer: true }}
      sourceTotal={1057}
      collections={COLLECTIONS}
      sourceCollectionId="buffer"
      port={port}
      onClose={() => undefined}
      {...extra}
    />,
  );
}

async function reachPlan(port: MoveBatchPort) {
  open(port);
  fireEvent.change(screen.getByTestId('move-all-target'), { target: { value: 'night' } });
  fireEvent.click(screen.getByTestId('move-all-plan-request'));
  await waitFor(() => expect(screen.getByTestId('move-all-plan')).toBeTruthy());
}

afterEach(() => {
  cleanup();
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
        source={{ name: 'Буфер', isBuffer: true }}
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
    expect(port.run).toHaveBeenCalledWith({
      sampleIds: ids(1057),
      toCollectionId: 'night',
      dryRun: true,
    });
  });

  it('предупреждение несёт живые числа и слово «останется в буфере»', async () => {
    await reachPlan(stubPort());
    const warning = screen.getByTestId('move-all-warning').textContent ?? '';
    expect(warning).toContain('740 из 1057');
    expect(warning).toContain('останется в буфере');
    expect(warning).toContain('317 проб');
    expect(warning).toContain('ёмкости у набора нет');
    // ПОРЧА: доля вернулась в окно — владелец 27.09 назвал 70% выдуманной пропорцией.
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

  it('отказ порта доезжает до человека словами', async () => {
    open(
      stubPort({
        enumerate: vi.fn(async () => {
          throw new Error('Media-server недоступен — перечислить пробы набора нечем.');
        }),
      }),
    );
    fireEvent.change(screen.getByTestId('move-all-target'), { target: { value: 'night' } });
    fireEvent.click(screen.getByTestId('move-all-plan-request'));
    await waitFor(() =>
      expect(screen.getByTestId('move-all-failed').textContent).toContain('Media-server недоступен'),
    );
  });
});

describe('перенос и его итог', () => {
  it('подтверждение двигает РОВНО показанный список, без dryRun', async () => {
    const port = stubPort();
    await reachPlan(port);
    fireEvent.click(screen.getByTestId('move-all-confirm'));
    await waitFor(() => expect(screen.getByTestId('move-all-result')).toBeTruthy());
    expect(port.run).toHaveBeenLastCalledWith({
      sampleIds: ids(1057),
      toCollectionId: 'night',
      dryRun: false,
    });
    expect(screen.getByTestId('move-all-result').textContent).toBe('Перенесено 740 из 1057');
  });

  it('ФАКТ РАСХОДИТСЯ С ПЛАНОМ — окно говорит это, а не показывает план как итог', async () => {
    const port = stubPort({
      run: vi.fn(async (request) =>
        request.dryRun === true
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

  it('дом узнаёт о переносе — страницу проб пора перечитать', async () => {
    const onMoved = vi.fn();
    const port = stubPort();
    render(
      <MoveAllToCollectionDialog
        open
        source={{ name: 'Буфер', isBuffer: true }}
        sourceTotal={1057}
        collections={COLLECTIONS}
        sourceCollectionId="buffer"
        port={port}
        onClose={() => undefined}
        onMoved={onMoved}
      />,
    );
    fireEvent.change(screen.getByTestId('move-all-target'), { target: { value: 'night' } });
    fireEvent.click(screen.getByTestId('move-all-plan-request'));
    await waitFor(() => expect(screen.getByTestId('move-all-plan')).toBeTruthy());
    fireEvent.click(screen.getByTestId('move-all-confirm'));
    await waitFor(() => expect(onMoved).toHaveBeenCalledTimes(1));
  });
});
