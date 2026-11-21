/**
 * Зубы признака «возобновлять сценарий при старте Студии» в кабинете (ADR-0033 Р1, PR-1).
 * Красные на стволе 041d423a: сервиса, двери и поля в контексте разноски нет.
 * Порчи: принять "true"/1 как включение → красный; записать, но не разнести на прибор → красный;
 * чужой узел → не 403 → красный; новый прибор (device=null) получает не ВЫКЛ → красный.
 */
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { membraneContextForDevice } from '../pair/membrane-context-fanout.service';
import { NodeScenarioAutoResumeService } from './node-scenario-auto-resume.service';

const NODE = { id: 'n-1', membrane: { id: 'm-1', userId: 'u-1' }, device: { nodeId: 'n-1' } };

function make(node: unknown = NODE) {
  const prisma = {
    node: { findUnique: vi.fn(async () => node) },
    device: { update: vi.fn(async () => ({ id: 'd-1' })) },
  };
  const fanout = { syncNode: vi.fn(async () => ({ updated: 1, failed: 0 })) };
  return { service: new NodeScenarioAutoResumeService(prisma as never, fanout as never), prisma, fanout };
}

describe('дверь признака возобновления', () => {
  it('true → запись в прибор и разноска на ЭТОТ прибор; ответ несёт счёт разноски', async () => {
    const { service, prisma, fanout } = make();
    expect(await service.setNodeAutoResume('u-1', 'n-1', { enabled: true })).toEqual({
      ok: true,
      nodeId: 'n-1',
      scenarioAutoResume: true,
      contextSync: { updated: 1, failed: 0 },
    });
    expect(prisma.device.update).toHaveBeenCalledWith(expect.objectContaining({ where: { nodeId: 'n-1' }, data: { scenarioAutoResume: true } }));
    expect(fanout.syncNode).toHaveBeenCalledWith('m-1', 'n-1');
  });

  it('не булево — отказ invalid_value, ничего не пишется и не разносится', async () => {
    for (const body of [{ enabled: 'true' }, { enabled: 1 }, {}, null]) {
      const { service, prisma, fanout } = make();
      expect(await service.setNodeAutoResume('u-1', 'n-1', body)).toEqual({ ok: false, reason: 'invalid_value' });
      expect(prisma.device.update).not.toHaveBeenCalled();
      expect(fanout.syncNode).not.toHaveBeenCalled();
    }
  });

  it('несопряжённый узел — node_not_paired; чужой — 403; нет узла — 404', async () => {
    expect(await make({ ...NODE, device: null }).service.setNodeAutoResume('u-1', 'n-1', { enabled: true })).toEqual({
      ok: false,
      reason: 'node_not_paired',
    });
    await expect(make().service.setNodeAutoResume('u-2', 'n-1', { enabled: true })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(make(null).service.setNodeAutoResume('u-1', 'n-1', { enabled: true })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('контекст разноски несёт признак прибора', () => {
  const MEMBRANE = {
    id: 'm-1',
    tariff: { tariffContractVersion: 1, userStorageQuotaBytes: 1n, bufferQuotaBytes: 2n, datasetCatalogId: 'c', maxUserWorkspaces: 3 },
  };
  it('true только у прибора с явным true; новый прибор и порча — ВЫКЛ', () => {
    expect(membraneContextForDevice(MEMBRANE, { bufferPolicy: 'stop', scenarioAutoResume: true }).scenarioAutoResume).toBe(true);
    expect(membraneContextForDevice(MEMBRANE, { bufferPolicy: 'stop', scenarioAutoResume: false }).scenarioAutoResume).toBe(false);
    expect(membraneContextForDevice(MEMBRANE, { bufferPolicy: 'stop', scenarioAutoResume: 'true' }).scenarioAutoResume).toBe(false);
    expect(membraneContextForDevice(MEMBRANE, null).scenarioAutoResume).toBe(false);
  });
});
