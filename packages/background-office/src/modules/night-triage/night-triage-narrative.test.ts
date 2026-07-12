import { describe, expect, it } from 'vitest';

import type { TriageSnapshot } from './night-triage-core';
import { buildNarrativePrompt, insertNarrative } from './night-triage-narrative';
import { renderTriageReport } from './night-triage-report';

const snap: TriageSnapshot = {
  generatedAt: '2026-07-12T00:00:00.000Z',
  staleThresholdDays: 14,
  ghosts: [
    { id: 'vdr-hard-gate', category: 'ghost', issue: 47, action: 're-scope', confidence: 'high', detail: '' },
    { id: 'vdr-hg3', category: 'ghost', issue: 47, action: 're-scope', confidence: 'high', detail: '' },
  ],
  orphans: [
    { id: 'agent-tooling', category: 'orphan', issue: null, action: 'relink', confidence: 'high', detail: '' },
  ],
  stale: [
    { id: 's-old', category: 'stale', issue: null, action: 're-scope', confidence: 'low', detail: '', dwellDays: 40 },
  ],
  counts: { ghost: 2, orphan: 1, stale: 1 },
};

describe('buildNarrativePrompt', () => {
  const p = buildNarrativePrompt(snap);

  it('включает счётчики и кластеры без выдумок', () => {
    expect(p).toContain('ghost 2, orphan 1, stale 1');
    expect(p).toContain('#47: 2 задач');
    expect(p).toContain('agent-tooling');
    expect(p).toContain('s-old (40д)');
  });

  it('содержит жёсткие правила (не выдумывать, не менять рекомендации)', () => {
    expect(p).toContain('НЕ выдумывай');
    expect(p).toContain('НЕ меняй рекомендации');
  });

  it('без иероглифов/мусора', () => {
    expect(p).not.toMatch(/[一-鿿]/);
  });
});

describe('insertNarrative', () => {
  const report = renderTriageReport(snap, { date: '2026-07-12' });

  it('вставляет раздел перед первой таблицей', () => {
    const withN = insertNarrative(report, 'Основной долг — orphan; ghost вокруг #47 держится сознательно.');
    expect(withN).toContain('## Обзор (LLM-нарратив)');
    expect(withN.indexOf('## Обзор')).toBeLessThan(withN.indexOf('## Ghost'));
    expect(withN).toContain('таблицы ниже — источник истины');
    expect(withN).toContain('Основной долг — orphan');
    // сводка остаётся выше нарратива
    expect(withN.indexOf('**Сводка:**')).toBeLessThan(withN.indexOf('## Обзор'));
  });

  it('пустой/undefined нарратив → отчёт без изменений (graceful)', () => {
    expect(insertNarrative(report, null)).toEqual(report);
    expect(insertNarrative(report, '   ')).toEqual(report);
  });

  it('детерминированные таблицы не тронуты', () => {
    const withN = insertNarrative(report, 'X');
    expect(withN).toContain('| `vdr-hard-gate` | [#47](https://github.com/officefish/Membrana/issues/47) | re-scope |');
  });
});
