/**
 * Зубы сервиса уборки (#2588 b5 → #2632 g3b). С g3b сервис — тонкая обёртка двери над
 * `PurgeGcRunner`: свойства уборки b5 (P21–P24: dryRun без markPurged и rm, порядок «снимок → строки
 * → файлы», идемпотентность, сбой файла не откатывает партию, гонка с разморозкой) переехали в
 * `purge-gc.runner.test.ts` и проверяются там на журнале. Здесь — что дверь отдаёт ответ исполнителя
 * без переделки и что `frozenBytesOf` по-прежнему экспортируется отсюда.
 */
import { describe, expect, it, vi } from 'vitest';

import type { PurgeCandidate } from './downgrade-archive.store';
import { DowngradeArchivePurgeService, frozenBytesOf, type PurgeReport } from './downgrade-archive-purge.service';

const NOW = new Date('2026-10-06T12:00:00.000Z');
const CANDIDATES: PurgeCandidate[] = [
  { batchId: 'b-1', deviceId: 'd-1', expiresAt: new Date('2026-10-05T10:00:00.000Z'), sampleCount: 2, frozenBytes: 1000 },
  { batchId: 'b-2', deviceId: 'd-2', expiresAt: new Date('2026-10-06T11:00:00.000Z'), sampleCount: 1, frozenBytes: 24 },
];

describe('frozenBytesOf', () => {
  it('сумма байт кандидатов; NaN не ломает сумму', () => {
    expect(frozenBytesOf(CANDIDATES)).toBe(1024);
    expect(frozenBytesOf([{ ...CANDIDATES[0]!, frozenBytes: Number.NaN }])).toBe(0);
    expect(frozenBytesOf([])).toBe(0);
  });
});

describe('DowngradeArchivePurgeService — дверь над исполнителем', () => {
  it('режим и время передаются исполнителю как есть; ответ — его отчёт с runId и полями b6', async () => {
    const report: PurgeReport = {
      dryRun: false,
      now: NOW,
      runId: 'run-1',
      candidates: CANDIDATES,
      frozenBytes: 1024,
      purged: ['b-1'],
      purgedIds: ['b-1'],
      refused: [],
      blobs: { deleted: 2, failed: 0 },
      refusal: null,
    };
    const runner = { run: vi.fn(async () => report) };
    const service = new DowngradeArchivePurgeService(runner as never);
    for (const dryRun of [true, false]) {
      expect(await service.purgeExpired(NOW, { dryRun })).toBe(report);
      expect(runner.run).toHaveBeenLastCalledWith(NOW, { dryRun });
    }
    expect(runner.run).toHaveBeenCalledTimes(2);
  });
});
