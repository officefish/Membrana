import type { PluginId, RunRecord } from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };
import { describe, expect, it } from 'vitest';

import type { CabinetConfigWithOffice } from '../../../config/office-env.schema';
import {
  JOURNAL_RESULTS_OUTCOMES,
  JournalResultsBridgeService,
  PLUGIN_RESULTS_RUNS_PATH,
  type JournalResultsFetch,
} from './journal-results-bridge.service';

const run = (): RunRecord => ({
  address: {
    pluginId: 'membrana.showcase.chart-list' as PluginId,
    version: '0.1.0',
    collectionId: 'journal',
    runId: 'run-1',
    mountTarget: 'background-cabinet/journal',
  },
  fingerprints: { inputHash: 'in', configHash: 'cfg' },
  resumeMode: 'fresh',
  completedAt: new Date('2026-10-03T10:00:00Z'),
  kind: 'showcase',
});

const config = (office: CabinetConfigWithOffice['office'] = { url: 'https://office.example/', token: 'tok' }) =>
  ({ office }) as CabinetConfigWithOffice;

const bridge = (fetchImpl: JournalResultsFetch, cfg = config()) =>
  new JournalResultsBridgeService(cfg, fetchImpl);

describe('JournalResultsBridgeService', () => {
  it('держит закрытый словарь исходов', () => {
    expect([...JOURNAL_RESULTS_OUTCOMES]).toEqual([
      'sent',
      'office-not-configured',
      'office-unreachable',
      'office-rejected',
    ]);
  });

  it('отправляет RunRecord showcase в существующий endpoint office', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const subject = bridge(async (url, init) => {
      calls.push({ url, init });
      return new Response('', { status: 200 });
    });

    await expect(subject.send(run())).resolves.toEqual({
      outcome: 'sent',
      runId: 'run-1',
      attempts: 1,
      status: 200,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(`https://office.example${PLUGIN_RESULTS_RUNS_PATH}`);
    expect(calls[0]!.init.headers).toMatchObject({
      'content-type': 'application/json',
      'x-membrana-token': 'tok',
    });
    const body = JSON.parse(String(calls[0]!.init.body)) as { run: RunRecord };
    expect(body.run.address.pluginId).toBe('membrana.showcase.chart-list');
    expect(body.run.address.runId).toBe('run-1');
  });

  it('без пары office называет отсутствие провода и не делает запрос', async () => {
    let calls = 0;
    const subject = bridge(async () => {
      calls += 1;
      return new Response('', { status: 200 });
    }, config(null));
    await expect(subject.send(run())).resolves.toMatchObject({
      outcome: 'office-not-configured',
      attempts: 0,
    });
    expect(calls).toBe(0);
  });

  it('повторяет сетевой отказ один раз, но не повторяет ответ office с ошибкой', async () => {
    let networkCalls = 0;
    const unavailable = bridge(async () => {
      networkCalls += 1;
      throw new Error('ECONNREFUSED');
    });
    await expect(unavailable.send(run())).resolves.toMatchObject({
      outcome: 'office-unreachable',
      attempts: 2,
      reason: 'ECONNREFUSED',
    });
    expect(networkCalls).toBe(2);

    let rejectedCalls = 0;
    const rejected = bridge(async () => {
      rejectedCalls += 1;
      return new Response('denied', { status: 403 });
    });
    await expect(rejected.send(run())).resolves.toMatchObject({
      outcome: 'office-rejected',
      attempts: 1,
      status: 403,
      reason: 'denied',
    });
    expect(rejectedCalls).toBe(1);
  });
});
