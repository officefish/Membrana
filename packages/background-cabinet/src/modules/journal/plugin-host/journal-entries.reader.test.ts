/**
 * Зубы читателя ленты. Блок s2 шлифовки `chart-list-polish`.
 *
 * ПОЧЕМУ ЭТОТ ФАЙЛ ПОЯВИЛСЯ ПОСЛЕ ПРОДА, А НЕ ДО. Читателя проверяли только косвенно — через
 * зубы дома, где лента подавалась стабом из трёх записей. На трёх записях предел в пятьдесят
 * невидим: всё зелено и сегодня. Боевой прогон 22.08 прислал 1301 адрес, дом увидел 50 и трижды
 * отказал `entry-not-found`.
 *
 * Отсюда правило этого файла: проверять на числах БОЛЬШЕ страницы. Зуб, который не может отличить
 * «видит ленту» от «видит первую страницу», не удостоверяет ничего.
 */
import { describe, expect, it } from 'vitest';

import { JournalServiceEntriesReader } from './journal-entries.reader';
import type { LiveJournalItemRow } from '../live-journal-items.mapper';
import type { JournalService } from '../journal.service';

const entry = (i: number): LiveJournalItemRow => ({
  id: `e${i}`,
  kind: i % 2 === 0 ? 'track' : 'report',
  timestamp: 1_755_000_000_000 - i,
  clientEntryId: `c${i}`,
  moduleId: 'microphone',
  moduleName: 'microphone',
  tags: [],
  ...(i % 2 === 0 ? { track: { sampleId: `s${i}` } } : { report: {} }),
});

/**
 * Поддельная служба. Держит ленту целиком и умеет ОБА входа — страничный и полный, — чтобы зуб
 * мог поймать читателя, который пошёл не в тот.
 */
function fakeJournal(total: number) {
  const all = Array.from({ length: total }, (_, i) => entry(i));
  const calls = { paged: 0, whole: 0 };
  const svc = {
    calls,
    async listJournalItems(_userId: string, limitRaw?: string) {
      calls.paged += 1;
      // Та же арифметика, что у настоящей службы: предел режется сверху страницей в 50.
      const asked = limitRaw ? Number.parseInt(limitRaw, 10) : 50;
      const limit = Math.min(Number.isFinite(asked) && asked > 0 ? asked : 50, 50);
      return { items: all.slice(0, limit), nextCursor: null, counts: {} };
    },
    async listAllJournalItems() {
      calls.whole += 1;
      return { items: all, counts: {} };
    },
  };
  return { all, calls, service: svc as unknown as JournalService };
}

describe('читатель видит ленту целиком, а не первую страницу', () => {
  it('лента в 300 записей приходит целиком — вещдок 22.08 был про 1301 из 50', async () => {
    const { service } = fakeJournal(300);
    const rows = await new JournalServiceEntriesReader(service).listEntries('u1');
    expect(rows).toHaveLength(300);
  });

  it('лента длиннее страницы НЕ обрезается по 50 — это и был дефект', async () => {
    const { service } = fakeJournal(1301);
    const rows = await new JournalServiceEntriesReader(service).listEntries('u1');
    expect(rows.length).toBe(1301);
    expect(rows.length).toBeGreaterThan(50);
  });

  it('читатель ходит ПОЛНЫМ входом и ни разу — страничным', async () => {
    const { calls, service } = fakeJournal(300);
    await new JournalServiceEntriesReader(service).listEntries('u1');
    expect(calls.whole).toBe(1);
    // Страничный вход режет предел молча; уход в него — возврат к дефекту.
    expect(calls.paged).toBe(0);
  });

  it('лента забирается ОДНИМ вызовом, а не обходом по страницам', async () => {
    const { calls, service } = fakeJournal(1301);
    await new JournalServiceEntriesReader(service).listEntries('u1');
    // Обход курсором дал бы 27 перечитываний ленты, которую служба и так держит в памяти.
    expect(calls.whole).toBe(1);
  });

  it('порядок и состав ленты не меняются — читатель не фильтрует и не сортирует', async () => {
    const { all, service } = fakeJournal(120);
    const rows = await new JournalServiceEntriesReader(service).listEntries('u1');
    expect(rows.map((r) => r.id)).toEqual(all.map((r) => r.id));
  });

  it('оба рода записей доходят до проверки — отсев рода не дело читателя', async () => {
    const { service } = fakeJournal(100);
    const rows = await new JournalServiceEntriesReader(service).listEntries('u1');
    expect(rows.some((r) => r.kind === 'track')).toBe(true);
    expect(rows.some((r) => r.kind === 'report')).toBe(true);
  });

  it('пустая лента — пустой список, а не отказ: отбирать не из чего решает дом', async () => {
    const { service } = fakeJournal(0);
    expect(await new JournalServiceEntriesReader(service).listEntries('u1')).toEqual([]);
  });
});
