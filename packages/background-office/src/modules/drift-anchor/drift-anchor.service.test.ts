import { describe, expect, it } from 'vitest';

import { DriftAnchorService } from './drift-anchor.service';
import type { DriftAnchorRecordDto } from './drift-anchor-record.dto';

function record(over: Partial<DriftAnchorRecordDto> = {}): DriftAnchorRecordDto {
  return {
    anchorKind: 'code',
    anchorSource: 'ci',
    detectorVersion: 'abc1234',
    imageFrozenAt: null,
    delta: 0,
    verdict: 'ok',
    takenAt: '2026-07-13T04:00:00.000Z',
    metrics: { yamnet: 0.8029 },
    ...over,
  };
}

describe('DriftAnchorService', () => {
  it('пустой store → пустой список', () => {
    expect(new DriftAnchorService().list()).toEqual([]);
  });

  it('ingest сохраняет запись, list её возвращает', () => {
    const svc = new DriftAnchorService();
    svc.ingest(record());
    expect(svc.list()).toHaveLength(1);
    expect(svc.list()[0].verdict).toBe('ok');
  });

  it('три разных ключа (anchorKind/anchorSource) хранятся параллельно', () => {
    const svc = new DriftAnchorService();
    svc.ingest(record({ anchorKind: 'code', anchorSource: 'ci' }));
    svc.ingest(record({ anchorKind: 'code', anchorSource: 'schedule' }));
    svc.ingest(record({ anchorKind: 'data', anchorSource: 'schedule' }));
    expect(svc.list()).toHaveLength(3);
  });

  it('повторный ingest того же ключа перезаписывает (не дублирует)', () => {
    const svc = new DriftAnchorService();
    svc.ingest(record({ takenAt: '2026-07-13T00:00:00.000Z', delta: 0.1 }));
    svc.ingest(record({ takenAt: '2026-07-13T04:00:00.000Z', delta: 0 }));
    expect(svc.list()).toHaveLength(1);
    expect(svc.list()[0].takenAt).toBe('2026-07-13T04:00:00.000Z');
    expect(svc.list()[0].delta).toBe(0);
  });
});
