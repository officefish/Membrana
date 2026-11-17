/**
 * Зубы словаря парринга (b3 studio-firebat-user-pairing, предикаты — Дынин):
 * полнота отображения · whitelist ключей · identity через Object.is (не deep-equal) ·
 * отсутствие мутации входа · границы квоты. Поведение фиксируется как есть — контракт
 * PairResponse в этом спринте не меняется.
 */
import { describe, expect, it } from 'vitest';

import type { PairResponse, PairStatusLinked } from './pairing';
import { mergePairStatusTariff, pairResponseToCredentials } from './pairingCredentials';

const response = (over: Partial<PairResponse> = {}): PairResponse => ({
  token: 'tok', expiresAt: '2026-08-21T00:00:00Z', deviceId: 'd1', mediaToken: 'mt',
  mediaApiUrl: 'https://media.example', membrane: { id: 'mem1' },
  node: { id: 'n1', label: 'Firebat' }, pairedKeyId: 'pk1',
  tariff: { id: 't1', maxUserWorkspaces: 3 }, ...over,
});

const linked = (quota?: number): PairStatusLinked => ({
  linked: true, keyActive: true, inactiveReason: null, membrane: { id: 'mem1' },
  node: { id: 'n1', label: 'Firebat' }, deviceId: 'd1', pairedKeyId: 'pk1',
  sessionExpiresAt: null, ...(quota === undefined ? {} : { tariff: { id: 't1', maxUserWorkspaces: quota } }),
});

describe('pairResponseToCredentials', () => {
  it('полнота: все поля ответа отображены, включая опциональные', () => {
    const c = pairResponseToCredentials(response());
    expect(c).toEqual({
      token: 'tok', expiresAt: '2026-08-21T00:00:00Z', deviceId: 'd1', mediaToken: 'mt',
      mediaApiUrl: 'https://media.example', membraneId: 'mem1', nodeId: 'n1',
      nodeLabel: 'Firebat', pairedKeyId: 'pk1', maxUserWorkspaces: 3, tariffId: 't1',
    });
  });

  it('whitelist: ключей сверх словаря кредов нет (мусор из ответа не тащится)', () => {
    const keys = Object.keys(pairResponseToCredentials(response())).sort();
    expect(keys).toEqual([
      'deviceId', 'expiresAt', 'maxUserWorkspaces', 'mediaApiUrl', 'mediaToken',
      'membraneId', 'nodeId', 'nodeLabel', 'pairedKeyId', 'tariffId', 'token',
    ]);
  });

  it('опциональные отсутствуют в ответе → ключи присутствуют со значением undefined (текущий словарь, зафиксировано)', () => {
    const c = pairResponseToCredentials(response({ pairedKeyId: undefined, tariff: undefined }));
    expect('pairedKeyId' in c).toBe(true);
    expect(c.pairedKeyId).toBeUndefined();
    expect(c.maxUserWorkspaces).toBeUndefined();
    expect(c.tariffId).toBeUndefined();
  });

  it('вход не мутируется', () => {
    const r = response();
    const snapshot = structuredClone(r);
    pairResponseToCredentials(r);
    expect(r).toEqual(snapshot);
  });
});

describe('mergePairStatusTariff', () => {
  const creds = () => pairResponseToCredentials(response());

  it('identity по Object.is: квота не пришла ИЛИ равна текущей → тот же объект, не копия', () => {
    const c = creds();
    expect(Object.is(mergePairStatusTariff(c, linked()), c)).toBe(true);
    expect(Object.is(mergePairStatusTariff(c, linked(3)), c)).toBe(true);
  });

  it('изменение квоты → новая ссылка; остальные поля — те же значения по каждому ключу', () => {
    const c = creds();
    const next = mergePairStatusTariff(c, linked(5));
    expect(next).not.toBe(c);
    expect(next.maxUserWorkspaces).toBe(5);
    for (const k of Object.keys(c) as (keyof typeof c)[]) {
      if (k !== 'maxUserWorkspaces') expect(Object.is(next[k], c[k])).toBe(true);
    }
  });

  it('граница: квота 0 — законное значение, доезжает (0 ≠ undefined)', () => {
    const next = mergePairStatusTariff(creds(), linked(0));
    expect(next.maxUserWorkspaces).toBe(0);
  });

  it('вход не мутируется при изменении', () => {
    const c = creds();
    const snapshot = structuredClone(c);
    mergePairStatusTariff(c, linked(7));
    expect(c).toEqual(snapshot);
  });
});

/**
 * #2538 — id тарифа едет в учётные данные и сливается опросом наравне с квотой.
 * Порчи → красный: смена id без новой ссылки — красный; id из ответа потерян при маппинге — красный.
 */
describe('mergePairStatusTariff — tariffId (#2538)', () => {
  const creds = () => pairResponseToCredentials(response());
  const linkedTariff = (id: string, quota = 3): PairStatusLinked => ({
    ...linked(), tariff: { id, maxUserWorkspaces: quota },
  });

  it('pairResponseToCredentials несёт tariffId из ответа привязки', () => {
    expect(creds().tariffId).toBe('t1');
  });

  it('тот же id и та же квота → тот же объект', () => {
    const c = creds();
    expect(Object.is(mergePairStatusTariff(c, linkedTariff('t1')), c)).toBe(true);
  });

  it('смена id при той же квоте → новая ссылка с новым tariffId; квота не тронута', () => {
    const c = creds();
    const next = mergePairStatusTariff(c, linkedTariff('checkpoint-v1'));
    expect(next).not.toBe(c);
    expect(next.tariffId).toBe('checkpoint-v1');
    expect(next.maxUserWorkspaces).toBe(3);
  });

  it('учётные данные без tariffId (старая привязка) получают id первым же опросом', () => {
    const c = { ...creds(), tariffId: undefined };
    const next = mergePairStatusTariff(c, linkedTariff('t1'));
    expect(next).not.toBe(c);
    expect(next.tariffId).toBe('t1');
  });

  it('ответ без тарифа сохранённый id не стирает', () => {
    const c = creds();
    expect(Object.is(mergePairStatusTariff(c, linked()), c)).toBe(true);
    expect(c.tariffId).toBe('t1');
  });
});
