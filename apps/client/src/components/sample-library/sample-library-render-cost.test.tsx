// @vitest-environment jsdom
/**
 * ЗАМЕР ЦЕНЫ ОТРИСОВКИ библиотеки — и зуб на то, что страница действительно режет работу (#2501).
 *
 * Зачем замер в зубах. Библиотека Studio рисовала весь набор: на живом приборе это 1057 строк, у
 * каждой шесть ячеек, четыре органа и `<select>` переноса со списком наборов. Renderer-разборка
 * трейса 27.09 дала 2–3.6 мс на потолке буфера — фризом это быть не может, а вот отрисовку тысячи
 * строк НЕ МЕРИЛИ ни разу (#2476). Число должно жить в зубе, а не в чьей-то памяти: иначе первая
 * же правка вернёт полный список молча.
 *
 * Что здесь считается вещдоком, а что — справкой:
 *  • ВЕЩДОК — число узлов DOM. Оно детерминированно и не зависит от загрузки машины: страница
 *    обязана резать разметку больше чем на порядок, иначе листание куплено зря.
 *  • СПРАВКА — миллисекунды: jsdom не считает раскладку и отрисовку пикселей, поэтому его число —
 *    ПОЛ реальной цены в браузере, а не она сама. Печатаем его в вывод прогона и НЕ делаем из него
 *    порога: порог по времени краснел бы от чужой сборки на той же машине, а не от дефекта.
 *
 * Порчи → красный (проверены руками):
 *  • отдать таблице весь список вместо окна страницы — красный на «страница режет DOM больше чем
 *    на порядок»;
 *  • вернуть размер страницы к «всё сразу» (pageSize = total) — красный там же;
 *  • отрисовать страницу, но оставить 1057 `<option>` переноса на строку — красный по числу узлов.
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_SAMPLES_PAGE_SIZE,
  resolveSamplesPageWindow,
  type Collection,
  type MediaSample,
} from '@membrana/media-library-service';
import type { SamplePlaybackSnapshot } from '@membrana/sample-playback-service';

import { SampleLibraryTable } from './SampleLibraryTable';

afterEach(cleanup);

/** Живой объём буфера прибора на 28.09 — ровно тот, на котором библиотека подвисала. */
const LIVE_BUFFER = 1057;

const PLAYBACK: SamplePlaybackSnapshot = {
  selectedSampleId: null,
  selectedTitle: null,
  selectedCollectionId: null,
  status: 'idle',
  currentTimeSec: 0,
  durationSec: 0,
  waveform: [],
  errorMessage: null,
};

const MOVE_TARGETS: Collection[] = [
  { id: 'c-1', name: 'Ночь 27.09', kind: 'user', createdAt: '', updatedAt: '' },
  { id: 'c-2', name: 'Дроны', kind: 'user', createdAt: '', updatedAt: '' },
  { id: 'c-3', name: 'Фон', kind: 'user', createdAt: '', updatedAt: '' },
];

function sample(i: number): MediaSample {
  return {
    id: `s-${i}`,
    collectionId: '__buffer__',
    title: `rec-2026-09-27T02-${String(i).padStart(4, '0')}.wav`,
    class: 'unlabeled',
    label: 'unlabeled',
    source: 'mic-recording',
    durationSec: 5,
    sampleRate: 48000,
    channels: 1,
    createdAt: new Date(1_759_000_000_000 + i * 5000).toISOString(),
    storageRef: `buffer/s-${i}.wav`,
    sizeBytes: 480_000,
  };
}

const BUFFER = Array.from({ length: LIVE_BUFFER }, (_, i) => sample(i + 1));

function renderRows(rows: readonly MediaSample[]) {
  const startedAt = performance.now();
  const view = render(
    <SampleLibraryTable
      rows={rows}
      emptyText="Нет сэмплов."
      playback={PLAYBACK}
      labelStates={{}}
      canLabelAnnotate
      canMoveFrom
      moveTargets={MOVE_TARGETS}
      isTariffDataset={false}
      onSelectSample={() => {}}
      onTogglePlay={() => {}}
      onExportSample={() => {}}
      onMove={() => {}}
      onRemove={() => {}}
      onSaveLabelNotes={() => {}}
    />,
  );
  const elapsedMs = performance.now() - startedAt;
  const nodes = view.container.querySelectorAll('*').length;
  const bodyRows = view.container.querySelectorAll('tbody tr').length;
  return { elapsedMs, nodes, bodyRows, unmount: view.unmount };
}

describe('цена отрисовки библиотеки: весь буфер против одной страницы', () => {
  it(
    'страница режет разметку больше чем на порядок на 1057 пробах',
    () => {
      const all = renderRows(BUFFER);
      all.unmount();

      const window = resolveSamplesPageWindow(BUFFER, 1, DEFAULT_SAMPLES_PAGE_SIZE);
      const paged = renderRows(window.items);
      paged.unmount();

      // Числа — в вывод прогона: замер обязан быть читаемым, а не выводимым из зелёного.
      // eslint-disable-next-line no-console
      console.log(
        `[#2501 замер отрисовки] весь буфер: ${all.bodyRows} строк, ${all.nodes} узлов, ` +
          `${all.elapsedMs.toFixed(1)} мс (jsdom, без раскладки) · ` +
          `одна страница: ${paged.bodyRows} строк, ${paged.nodes} узлов, ` +
          `${paged.elapsedMs.toFixed(1)} мс · ` +
          `узлов меньше в ${(all.nodes / paged.nodes).toFixed(1)} раза`,
      );

      expect(all.bodyRows).toBe(LIVE_BUFFER);
      expect(paged.bodyRows).toBe(DEFAULT_SAMPLES_PAGE_SIZE);
      // Вещдок: узлов на странице меньше больше чем на порядок. Держится на арифметике
      // (1057/40 ≈ 26), а не на скорости машины.
      expect(paged.nodes * 20).toBeLessThan(all.nodes);
    },
    // Порог — аварийный ограничитель, не мерило скорости (как в media-library, #2266): полный
    // буфер в jsdom рисуется секундами, и умолчание 5 с краснело бы от соседней сборки.
    30_000,
  );

  it('последняя страница показывает остаток, а не пустоту', () => {
    const window = resolveSamplesPageWindow(BUFFER, 27, DEFAULT_SAMPLES_PAGE_SIZE);
    const paged = renderRows(window.items);
    expect(paged.bodyRows).toBe(17);
    paged.unmount();
  });
});
