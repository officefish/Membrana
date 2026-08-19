/**
 * Зубы отправителя (b3, #1961): закрытый словарь исходов, одна+одна попытка, отказ офиса без
 * повтора, не-настроенный мост — именованный исход без сети, форма запроса (путь, ключ, тело).
 * fetch подменяется параметром — сети в зубах нет.
 */
import type { PluginId, RunRecord } from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };
import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import { BRIDGE_OUTCOMES, PLUGIN_RESULTS_RUNS_PATH, PluginResultsBridgeService, type BridgeFetch } from './plugin-results-bridge.service';

const run = (): RunRecord => ({
  address: { pluginId: 'membrana.handler.mfcc' as PluginId, version: '0.1.0', collectionId: 'c1', runId: 'run-1', mountTarget: 'background-media/collections' },
  fingerprints: { inputHash: 'in', configHash: 'cfg' },
  resumeMode: 'fresh',
  completedAt: new Date('2026-08-19T09:00:00.000Z'),
  kind: 'handler',
});

const config = (over: Partial<AppConfig> = {}) => ({ OFFICE_API_URL: 'https://office.example/', OFFICE_API_TOKEN: 'tok', ...over }) as AppConfig;

const service = (fetchImpl: BridgeFetch, cfg = config()) => new PluginResultsBridgeService(cfg, fetchImpl);

describe('PluginResultsBridgeService', () => {
  it('словарь исходов закрыт — четыре имени', () => {
    expect([...BRIDGE_OUTCOMES]).toEqual(['sent', 'office-not-configured', 'office-unreachable', 'office-rejected']);
  });

  it('sent: POST на <OFFICE_API_URL>/plugin-results/runs с ключом и телом { run }', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const s = service(async (url, init) => { calls.push({ url, init }); return new Response('{"ok":true}', { status: 200 }); });
    const out = await s.send(run());
    expect(out).toEqual({ outcome: 'sent', runId: 'run-1', attempts: 1, status: 200 });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(`https://office.example${PLUGIN_RESULTS_RUNS_PATH}`);
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers['x-membrana-token']).toBe('tok');
    expect(headers['content-type']).toBe('application/json');
    const body = JSON.parse(String(calls[0]!.init.body)) as { run: { address: { runId: string } }; state?: unknown };
    expect(body.run.address.runId).toBe('run-1');
    expect(body.state).toBeUndefined();
  });

  it('office-not-configured: без URL/ключа — ни одной попытки, сервис не бросает', async () => {
    let called = 0;
    const s = service(async () => { called += 1; return new Response(null, { status: 200 }); }, config({ OFFICE_API_URL: undefined }));
    expect(s.configured).toBe(false);
    const out = await s.send(run());
    expect(out.outcome).toBe('office-not-configured');
    expect(out.attempts).toBe(0);
    expect(called).toBe(0);
  });

  it('office-unreachable: одна повторная попытка, третьей нет; причина — текст ошибки', async () => {
    let called = 0;
    const s = service(async () => { called += 1; throw new Error('ECONNREFUSED'); });
    const out = await s.send(run());
    expect(out).toMatchObject({ outcome: 'office-unreachable', attempts: 2, reason: 'ECONNREFUSED' });
    expect(called).toBe(2);
  });

  it('unreachable → sent: вторая попытка спасает, исход sent с attempts 2', async () => {
    let called = 0;
    const s = service(async () => { called += 1; if (called === 1) throw new Error('timeout'); return new Response('', { status: 200 }); });
    expect(await s.send(run())).toMatchObject({ outcome: 'sent', attempts: 2 });
  });

  it('office-rejected: 4xx/5xx не повторяется, статус и тело едут в исход', async () => {
    let called = 0;
    const s = service(async () => { called += 1; return new Response('{"message":"Invalid token"}', { status: 401 }); });
    const out = await s.send(run());
    expect(out).toMatchObject({ outcome: 'office-rejected', attempts: 1, status: 401 });
    expect(out.reason).toContain('Invalid token');
    expect(called).toBe(1);
  });

  it('StateRecord уезжает рядом с прогоном, когда есть', async () => {
    let sent = '';
    const s = service(async (_u, init) => { sent = String(init.body); return new Response('', { status: 200 }); });
    await s.send(run(), { pluginId: 'membrana.handler.mfcc' as PluginId, version: '0.1.0', collectionId: 'c1', kind: 'state', frozenAt: new Date(), windowStart: 0, windowEnd: 1, payload: { n: 1 } });
    expect(JSON.parse(sent).state.kind).toBe('state');
  });
});
