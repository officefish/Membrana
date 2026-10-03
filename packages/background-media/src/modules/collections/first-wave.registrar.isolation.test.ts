import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import type { BlobStorageService } from '../../blob/blob-storage.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { PluginResultsBridgeService } from '../plugin-results-bridge/plugin-results-bridge.service';
import { FirstWavePluginsRegistrar } from './first-wave.registrar';
import { CollectionsPluginHostService } from './plugin-host.service';

/**
 * ПРОД MEDIA 03.10 — ИЗОЛЯЦИЯ БЛОКОВ РЕГИСТРАЦИИ.
 *
 * В образе не было шаблонов trends-detector, импорт оркестратора детекции бросал
 * ERR_MODULE_NOT_FOUND — и единый try регистратора гасил вместе с detector-batch измеритель
 * чарт-листа и обе витрины библиотеки: кабинет получал 503 «Plugin … is not registered».
 *
 * Здесь импорт оркестратора бросает ТЕМ ЖЕ классом сбоя. Отдельный файл — потому что `vi.mock`
 * действует на весь модуль теста, а соседний файл проверяет живой оркестратор.
 */
vi.mock('@membrana/drone-detection-orchestrator-service', () => {
  throw new Error("Cannot find module '/app/packages/services/trends-detector/templates/BIRDS.json'");
});

const CATALOG_ROOT = join(__dirname, '../../../../../data/detectors-benchmark/v0.2');
const bridge = { configured: false, send: async () => ({ outcome: 'office-not-configured' }) } as unknown as PluginResultsBridgeService;

beforeAll(async () => {
  await import('@membrana/plugin-handlers');
});

describe('сбой импорта оркестратора гасит только detector-batch', { timeout: 30_000 }, () => {
  it('измеритель, витрины, свод и mfcc регистрируются; batch — нет, и это сказано в логе', async () => {
    const errors = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const host = new CollectionsPluginHostService();
    await host.onModuleInit();
    const config = { MEDIA_CATALOG_ROOT: CATALOG_ROOT } as unknown as AppConfig;
    await new FirstWavePluginsRegistrar(host, {} as PrismaService, {} as BlobStorageService, config, bridge).onModuleInit();

    const ids = host.getRegisteredPlugins().map((m) => m.id);
    expect(ids).toEqual([
      'membrana.handler.mfcc', 'membrana.handler.harmonic', 'membrana.handler.cepstral',
      'membrana.handler.spectral-flux', 'membrana.handler.template-match', 'membrana.handler.yamnet',
      'membrana.report.session-digest',
      'membrana.report.chart-list-measure',
      'membrana.showcase.library-chart-list',
      'membrana.showcase.library-duplicates',
    ]);
    expect(ids).not.toContain('membrana.report.detector-batch');

    // Сбой не тихий: ровно одна строка ошибки, и она называет погашенный плагин.
    const messages = errors.mock.calls.map((call) => String(call[1] ?? call[0]));
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('membrana.report.detector-batch');
    errors.mockRestore();
  });
});
