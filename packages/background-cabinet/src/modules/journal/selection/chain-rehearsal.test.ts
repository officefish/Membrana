/**
 * СКВОЗНОЙ ПРОГОН ЦЕПОЧКИ — репетиция, а НЕ приёмка. Блок c7 спринта `chart-list-plugin`.
 *
 * ЧТО ЭТО ДОКАЗЫВАЕТ: что звенья соединены и данные проходят весь путь —
 *   дом судит задание → плагин зовёт порт → отбор режет по объёму и критерию → выборка ложится
 *   в базу и получает адрес → по адресу открывается тем же составом.
 *
 * ЧЕГО ЭТО НЕ ДОКАЗЫВАЕТ: что отбор находит правильные звуки. Материал здесь придуманный, и
 * выдавать зелёный прогон на придуманных числах за приёмку значило бы ровно ту подмену
 * измеренного объявленным, которую запрещает норма #1950. Приёмка идёт на часовом сеансе 21.08
 * боевым входом — протокол в `docs/field/chart-list-acceptance-2026-08-22.md`.
 *
 * Сети нет: порт media подменён. Базы нет: хранилище подменено. Подменено ровно то, что лежит
 * ЗА границами кабинета, — всё, что внутри, работает настоящее.
 */
import { describe, expect, it } from 'vitest';

import { ChartListOrchestrator } from './chart-list.orchestrator';
import { ChartListSelectionService, type SaveSelectionInput, type StoredSelection } from './selection.service';
import { JournalPluginHostService, type JournalEntriesReader } from '../plugin-host/journal-plugin-host.service';
import type { LiveJournalItemRow } from '../live-journal-items.mapper';

const entry = (id: string): LiveJournalItemRow => ({
  id,
  kind: 'track',
  timestamp: Date.parse('2026-08-21T10:00:00Z'),
  clientEntryId: `client-${id}`,
  moduleId: 'microphone',
  moduleName: 'microphone',
  tags: ['track'],
  track: { sampleId: `s-${id}`, title: `Запись ${id}` },
});

const reader = (rows: readonly LiveJournalItemRow[]): JournalEntriesReader => ({
  listEntries: async () => rows,
});

/** Хранилище в памяти: под проверкой связь звеньев, а не драйвер Postgres. */
function fakeStore() {
  const saved: StoredSelection[] = [];
  let n = 0;
  const svc = {
    async save(input: SaveSelectionInput): Promise<StoredSelection> {
      n += 1;
      const row: StoredSelection = {
        id: `sel-${n}`,
        criterion: input.criterion,
        volume: input.volume,
        runId: input.runId,
        inputHash: input.inputHash,
        asked: input.asked,
        measured: input.measured,
        shortfall: input.shortfall,
        createdAt: new Date('2026-08-22T11:00:00Z'),
        picks: [...input.picks],
      };
      saved.push(row);
      return row;
    },
    async openById(_m: string, id: string): Promise<StoredSelection> {
      const found = saved.find((s) => s.id === id);
      if (!found) throw new Error('not found');
      return found;
    },
    async listRecent(): Promise<readonly StoredSelection[]> {
      return saved;
    },
  };
  return { saved, svc: svc as unknown as ChartListSelectionService };
}

/** Измеренные кандидаты, как их вернул бы media: тональные громче широкополосных. */
const measured = (entryIds: readonly string[]) =>
  entryIds.map((id, i) => ({
    entryId: id,
    sampleId: `s-${id}`,
    at: 0,
    deltaDb: 30 - i,
    peakDb: -10 - i,
    flatness: i < 2 ? 0.03 : 0.4,
    structure: (i < 2 ? 'tonal' : 'broadband') as 'tonal' | 'broadband',
    durationSec: 1 + i,
    features: { centroidHz: 800 + i * 700, rolloffHz: 3000 + i * 900, flatness: i < 2 ? 0.03 : 0.4, zeroCrossingRate: 0.1, flux: i * 0.2 },
  }));

async function chain(entryIds: readonly string[], criterion: string, volume: number) {
  const rows = entryIds.map(entry);
  const host = new JournalPluginHostService(reader(rows));
  await host.onModuleInit();

  const handlers = await import('@membrana/plugin-handlers');
  const executor = handlers.createChartListExecutor({
    port: { measure: async (task) => measured(task.entryIds) as never },
  });
  host.registerPlugin(handlers.CHART_LIST_MANIFEST as never, executor);

  const store = fakeStore();
  const orchestrator = new ChartListOrchestrator(host, store.svc, () => 'run-репетиция');
  const outcome = await orchestrator.generate({
    userId: 'u1',
    membraneId: 'm1',
    entryIds,
    volume,
    criterion,
  });
  return { outcome, store, host };
}

describe('цепочка проходит целиком (репетиция, не приёмка)', () => {
  it('шаги 1–5: задание → измерение → отбор → хранение → адрес', async () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const { outcome, store } = await chain(ids, 'loudness-over-floor', 20);

    expect(outcome.refusal).toBeNull();
    expect(outcome.selection).not.toBeNull();
    expect(outcome.selection!.picks).toHaveLength(5);
    // Выборка ЛЕЖИТ и открывается по адресу — то, ради чего она заведена (Т3).
    const opened = await store.svc.openById('m1', outcome.selection!.id);
    expect(opened.picks.map((p) => p.entryId)).toEqual(outcome.selection!.picks.map((p) => p.entryId));
  });

  it('порядок отбора приходит от КРИТЕРИЯ, а не от порядка задания', async () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const byLoud = await chain(ids, 'loudness-over-floor', 20);
    const byDrone = await chain(ids, 'drone-likeness', 20);
    expect(byLoud.outcome.selection!.picks[0]!.entryId).toBe('a');
    // Тональные впереди — критерий меняет результат, а не только подпись.
    expect(byDrone.outcome.selection!.picks[0]!.structure).toBe('tonal');
  });

  it('объём режет список: заказано 20 из 5 — пришло 5, недобор назван числом', async () => {
    const { outcome } = await chain(['a', 'b', 'c', 'd', 'e'], 'loudness-over-floor', 20);
    expect(outcome.selection!.picks).toHaveLength(5);
    expect(outcome.selection!.shortfall).toBe(15);
  });

  it('пустое задание отвергается ДО дома — за круг ради известного ответа не платим', async () => {
    const { outcome } = await chain([], 'loudness-over-floor', 20);
    expect(outcome.refusal?.reason).toBe('empty-task');
    expect(outcome.selection).toBeNull();
  });

  it('чужая запись отвергается ДОМОМ, а не отбором — суд задания идёт первым', async () => {
    const rows = [entry('своя')];
    const host = new JournalPluginHostService(reader(rows));
    await host.onModuleInit();
    const handlers = await import('@membrana/plugin-handlers');
    let portCalls = 0;
    host.registerPlugin(
      handlers.CHART_LIST_MANIFEST as never,
      handlers.createChartListExecutor({
        port: {
          measure: async (task) => {
            portCalls += 1;
            return measured(task.entryIds) as never;
          },
        },
      }),
    );
    const store = fakeStore();
    const outcome = await new ChartListOrchestrator(host, store.svc, () => 'r').generate({
      userId: 'u1',
      membraneId: 'm1',
      entryIds: ['чужая'],
      volume: 20,
      criterion: 'loudness-over-floor',
    });
    expect(outcome.refusal?.reason).toBe('entry-not-found');
    // Измерение не звали: чужое отвергнуто прежде, чем за него заплатили.
    expect(portCalls).toBe(0);
  });

  it('негодный критерий доходит до отбора и отвергается ИМ — с названной причиной', async () => {
    const { outcome } = await chain(['a', 'b'], 'rare', 20);
    expect(outcome.refusal?.reason).toBe('unknown-criterion');
  });

  it('прогон адресован журналом, отпечаток — от состава задания', async () => {
    const { store } = await chain(['a', 'b', 'c'], 'loudness-over-floor', 20);
    const s = store.saved[0]!;
    expect(s.runId).toBe('run-репетиция');
    expect(s.inputHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('разный состав задания — разный отпечаток; тот же состав — тот же', async () => {
    const one = await chain(['a', 'b'], 'loudness-over-floor', 20);
    const two = await chain(['a', 'c'], 'loudness-over-floor', 20);
    const again = await chain(['b', 'a'], 'loudness-over-floor', 20);
    expect(one.store.saved[0]!.inputHash).not.toBe(two.store.saved[0]!.inputHash);
    // Порядок подачи задания на отпечаток не влияет: задание есть НАБОР.
    expect(one.store.saved[0]!.inputHash).toBe(again.store.saved[0]!.inputHash);
  });
});

describe('задание ДЛИННЕЕ страницы ленты проходит (вещдок 22.08)', () => {
  /**
   * Здесь стоит НАСТОЯЩИЙ читатель ленты, а не стаб.
   *
   * Прочие зубы этого файла подают ленту стабом — и потому 22.08 были зелёными, пока прод отказывал.
   * Дефект жил ровно между домом и службой: читатель просил страницу, служба молча резала до 50.
   * Стаб этот участок закрывал собой, и цепочка «проходила» на трёх записях.
   */
  it('300 записей не отвергаются entry-not-found — читатель видит ленту целиком', async () => {
    const { JournalServiceEntriesReader } = await import('../plugin-host/journal-entries.reader');
    const ids = Array.from({ length: 300 }, (_, i) => `e${i}`);
    const rows = ids.map(entry);

    const fakeService = {
      async listJournalItems(_u: string, limitRaw?: string) {
        const asked = limitRaw ? Number.parseInt(limitRaw, 10) : 50;
        return { items: rows.slice(0, Math.min(asked, 50)), nextCursor: null, counts: {} };
      },
      async listAllJournalItems() {
        return { items: rows, counts: {} };
      },
    };

    const host = new JournalPluginHostService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new JournalServiceEntriesReader(fakeService as any),
    );
    await host.onModuleInit();

    const handlers = await import('@membrana/plugin-handlers');
    host.registerPlugin(
      handlers.CHART_LIST_MANIFEST as never,
      handlers.createChartListExecutor({ port: { measure: async (t) => measured(t.entryIds) as never } }),
    );

    const store = fakeStore();
    const outcome = await new ChartListOrchestrator(host, store.svc, () => 'run-300').generate({
      userId: 'u1',
      membraneId: 'm1',
      entryIds: ids,
      volume: 200,
      criterion: 'loudness-over-floor',
    });

    expect(outcome.refusal).toBeNull();
    expect(outcome.selection).not.toBeNull();
    expect(outcome.selection!.asked).toBe(300);
  });
});
