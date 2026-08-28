import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import type { BlobStorageService } from '../../blob/blob-storage.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { FirstWavePluginsRegistrar, prismaSampleReader } from './first-wave.registrar';
import { CollectionsPluginHostService } from './plugin-host.service';
import { PluginResultsBridgeService, type BridgeOutcome } from '../plugin-results-bridge/plugin-results-bridge.service';
import type { PluginId, RunRecord } from './plugin-host.types';

const CATALOG_ROOT = join(__dirname, '../../../../../data/detectors-benchmark/v0.2');
const config = { MEDIA_CATALOG_ROOT: CATALOG_ROOT } as unknown as AppConfig;

const rows = [
  // createdAt несёт модель Sample (@default(now())): порт отдаёт его наружу с 21.08 — им
  // адресуется окно сеанса у рода report. Фикстура обязана отражать модель, иначе зуб
  // проверяет не ту строку, что приходит из Prisma.
  { id: 'b', deviceId: 'dev-1', collectionId: 'c1', sampleRate: 48000, channels: 1, audioFormat: 'wav', sizeBytes: 3, title: 'B', storageRef: 'd1/b.wav', createdAt: new Date('2026-08-21T10:00:01.000Z') },
  { id: 'a', deviceId: 'dev-1', collectionId: 'c1', sampleRate: 44100, channels: 1, audioFormat: 'wav', sizeBytes: 3, title: 'A', storageRef: 'd1/a.wav', createdAt: new Date('2026-08-21T10:00:00.000Z') },
  { id: 'foreign', deviceId: 'dev-2', collectionId: 'c1', sampleRate: 48000, channels: 1, audioFormat: 'wav', sizeBytes: 3, title: 'Foreign', storageRef: 'd2/foreign.wav', createdAt: new Date('2026-08-21T10:00:02.000Z') },
];
const prisma = {
  sample: {
    findMany: async ({ where }: { where: { deviceId: string; collectionId: string } }) =>
      rows.filter((r) => r.deviceId === where.deviceId && r.collectionId === where.collectionId).sort((x, y) => (x.id < y.id ? -1 : 1)),
    findFirstOrThrow: async ({ where }: { where: { id: string; deviceId: string; collectionId: string } }) => {
      const row = rows.find((r) => r.id === where.id && r.deviceId === where.deviceId && r.collectionId === where.collectionId);
      if (!row) throw new Error('not found');
      return row;
    },
  },
} as unknown as PrismaService;
const blobs = { readBuffer: async (ref: string) => Buffer.from(ref) } as unknown as BlobStorageService;

/** Мост-шпион: ни сети, ни офиса — запоминает RunRecord и отдаёт заданный исход. */
function spyBridge(outcome: BridgeOutcome['outcome'] = 'sent') {
  const sent: RunRecord[] = [];
  const bridge = { configured: outcome !== 'office-not-configured', send: async (run: RunRecord) => { sent.push(run); return { outcome, runId: run.address.runId, attempts: outcome === 'sent' ? 1 : 0 } as BridgeOutcome; } } as unknown as PluginResultsBridgeService;
  return { bridge, sent };
}

async function registrar(cfg = config, bridge = spyBridge().bridge) {
  const host = new CollectionsPluginHostService();
  await host.onModuleInit();
  const reg = new FirstWavePluginsRegistrar(host, prisma, blobs, cfg, bridge);
  await reg.onModuleInit();
  return { host, reg };
}

/**
 * Таймаут поднят до 20 с осознанно, а не ради зелёного: каждый прогон регистратора грузит meyda
 * и читает пресет ворот из каталога, а таких прогонов в файле десять. По отдельности файл
 * укладывается в умолчание, при параллельном прогоне пакета первые два теста упирались в 5 с —
 * это цена загрузки библиотеки, а не медленный код.
 */
/**
 * ЗАГРУЗКА ОБРАБОТЧИКОВ — ВНЕ ИЗМЕРЯЕМОГО ВРЕМЕНИ ТЕСТА.
 *
 * `onModuleInit` регистратора тянет `@membrana/plugin-handlers` динамическим импортом, и это
 * дорого: замер 28.08 — 2966 мс даже из собранного dist (meyda, декодер wav), а через
 * трансформацию исходников в vitest время скачет от нагрузки машины. Цену платил ПЕРВЫЙ тест
 * файла и краснел таймаутом — то есть зуб сообщал «долго» вместо «предмет сломан», и от
 * снятия самого предмета покраснел бы ровно так же.
 *
 * Прогрев переносит цену в подготовку. Медленная загрузка при этом остаётся фактом и видна
 * на старте сервиса — здесь лишь сказано, что она не предмет ЭТИХ зубов.
 */
beforeAll(async () => {
  await import('@membrana/plugin-handlers');
});

describe('FirstWavePluginsRegistrar', { timeout: 20_000 }, () => {
  it('на старте модуля хост collections держит шесть детекторов, свод сеанса, измеритель и витрину отбора', async () => {
    const host = new CollectionsPluginHostService();
    await host.onModuleInit();
    await new FirstWavePluginsRegistrar(host, prisma, blobs, config, spyBridge().bridge).onModuleInit();
    const registered = host.getRegisteredPlugins();
    expect(registered.map((m) => m.id)).toEqual([
      'membrana.handler.mfcc', 'membrana.handler.harmonic', 'membrana.handler.cepstral',
      'membrana.handler.spectral-flux', 'membrana.handler.template-match', 'membrana.handler.yamnet',
      // Свод сеанса смонтирован в том же доме отдельной волной — род report, не детектор (j2, #1961).
      'membrana.report.session-digest',
      // Измеритель чарт-листа — ВТОРОЕ внедрение одного функционала (Т6, c5b): показывает
      // человеку чарт-лист в доме журнала, а меряет здесь, где звук лежит локально.
      'membrana.report.chart-list-measure',
      // Витрина отбора библиотеки (#2110) — второй ПОКАЗ семейства чарт-листа: отбирает по
      // текущему набору там же, где звук лежит. Журнальная витрина живёт в кабинете и не тронута.
      'membrana.showcase.library-chart-list',
      // Витрина дублей набора (#2109) — третий показ семейства: пары похожих во всём наборе,
      // ничего не удаляет; результат вызывающему по runId, как у соседей.
      'membrana.showcase.library-duplicates',
    ]);
    expect(registered.filter((m) => m.kind === 'handler')).toHaveLength(6);
    expect(registered.filter((m) => m.kind === 'report')).toHaveLength(2);
    expect(registered.filter((m) => m.kind === 'showcase')).toHaveLength(2);
  });

  it('читатель проб — только чтение в устройстве: одноимённая коллекция другого узла не видна', async () => {
    const { sha256Hex } = await import('@membrana/plugin-handlers');
    const reader = prismaSampleReader(prisma, blobs, sha256Hex);
    expect(Object.keys(reader).sort()).toEqual(['listSamples', 'readAudio']);
    const list = await reader.listSamples('dev-1', 'c1');
    expect(list.map((s) => s.id)).toEqual(['a', 'b']);
    const audio = await reader.readAudio(list[0]!);
    expect(Buffer.from(audio.bytes).toString()).toBe('d1/a.wav');
    expect(audio.contentHash).toMatch(/^[0-9a-f]{64}$/);
    await expect(reader.readAudio({ ...list[0]!, deviceId: 'dev-2' })).rejects.toThrow(/not found/);
  });

  it('без пресета mfcc не регистрируется, пять заглушек — регистрируются (не тихо)', async () => {
    const host = new CollectionsPluginHostService();
    await host.onModuleInit();
    await new FirstWavePluginsRegistrar(host, prisma, blobs, { MEDIA_CATALOG_ROOT: join(CATALOG_ROOT, 'nope') } as unknown as AppConfig, spyBridge().bridge).onModuleInit();
    expect(host.getRegisteredPlugins().map((m) => m.id)).toHaveLength(5);
    expect(host.getRegisteredPlugins().some((m) => m.id === 'membrana.handler.mfcc')).toBe(false);
  });

  describe('requestRun — вход без скрипта (b4, #1961)', () => {
    it('mfcc: контекст из deps исполнителя → хост → сид → мост; RunRecord несёт адрес, отпечатки, resumeMode fresh; исход моста в ответе', async () => {
      const { bridge, sent } = spyBridge('sent');
      const { reg } = await registrar(config, bridge);
      const out = await reg.requestRun({ pluginId: 'membrana.handler.mfcc' as PluginId, deviceId: 'dev-1', collectionId: 'c1', sampleId: 'a' });
      expect(out.runId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(out.address).toEqual({ pluginId: 'membrana.handler.mfcc', version: expect.any(String), collectionId: 'c1', runId: out.runId, mountTarget: 'background-media/collections' });
      expect(out.fingerprints.inputHash).toMatch(/^[0-9a-f]{64}$/);
      expect(out.bridge).toMatchObject({ outcome: 'sent', runId: out.runId });
      expect(sent).toHaveLength(1);
      const record = sent[0]!;
      expect(record.address).toEqual(out.address);
      expect(record.fingerprints).toEqual(out.fingerprints);
      expect(record.resumeMode).toBe('fresh');
      expect(record.kind).toBe('handler');
      expect(sent[0]!.address.runId).toBe(out.runId);
      expect(record.completedAt).toBeInstanceOf(Date);
    });

    it('отпечатки детерминированы: два запроса на одном входе — равные inputHash/configHash, разные runId', async () => {
      const { reg } = await registrar();
      const a = await reg.requestRun({ pluginId: 'membrana.handler.mfcc' as PluginId, deviceId: 'dev-1', collectionId: 'c1', sampleId: 'a' });
      const b = await reg.requestRun({ pluginId: 'membrana.handler.mfcc' as PluginId, deviceId: 'dev-1', collectionId: 'c1', sampleId: 'a' });
      expect(a.fingerprints).toEqual(b.fingerprints);
      expect(a.runId).not.toBe(b.runId);
    });

    it('исход моста именем, не исключением: office-not-configured не роняет прогон', async () => {
      const { bridge } = spyBridge('office-not-configured');
      const { reg } = await registrar(config, bridge);
      const out = await reg.requestRun({ pluginId: 'membrana.handler.mfcc' as PluginId, deviceId: 'dev-1', collectionId: 'c1', sampleId: 'a' });
      expect(out.bridge?.outcome).toBe('office-not-configured');
    });

    it('повод сверяется с манифестом; sample_added требует sampleId; заглушка — 501; незарегистрированный — 400', async () => {
      const { reg } = await registrar();
      // повод вне подписки манифеста (mfcc подписан только на sample_added)
      await expect(reg.requestRun({ pluginId: 'membrana.handler.mfcc' as PluginId, deviceId: 'dev-1', collectionId: 'c1', sampleId: 'a', trigger: 'collections.collection_created' })).rejects.toMatchObject({ status: 400 });
      // умолчание — sample_added, а он без sampleId не payload M4
      await expect(reg.requestRun({ pluginId: 'membrana.handler.mfcc' as PluginId, deviceId: 'dev-1', collectionId: 'c1' })).rejects.toMatchObject({ status: 400 });
      await expect(reg.requestRun({ pluginId: 'membrana.handler.harmonic' as PluginId, deviceId: 'dev-1', collectionId: 'c1', sampleId: 'a' })).rejects.toMatchObject({ status: 501 });
      await expect(reg.requestRun({ pluginId: 'membrana.report.nope' as PluginId, deviceId: 'dev-1', collectionId: 'c1' })).rejects.toMatchObject({ status: 400 });
    });

    describe('набор проб как форма задания (c5a спринта chart-list-plugin)', () => {
      it('формы задания не смешиваются: набор вместе с окном отвергается', async () => {
        const { reg } = await registrar(config, spyBridge().bridge);
        await expect(
          reg.requestRun({
            pluginId: 'membrana.handler.mfcc' as PluginId,
            deviceId: 'dev-1',
            collectionId: 'c1',
            sampleIds: ['a', 'b'],
            from: '2026-08-21T09:45:00Z',
          }),
        ).rejects.toMatchObject({ status: 400 });
      });

      it('набор вместе с одной пробой отвергается — иначе неясно, что измерено', async () => {
        const { reg } = await registrar(config, spyBridge().bridge);
        await expect(
          reg.requestRun({
            pluginId: 'membrana.handler.mfcc' as PluginId,
            deviceId: 'dev-1',
            collectionId: 'c1',
            sampleIds: ['a', 'b'],
            sampleId: 'a',
          }),
        ).rejects.toMatchObject({ status: 400 });
      });

      it('пустой набор — отказ ДО прогона, а не пустой результат', async () => {
        const { reg } = await registrar(config, spyBridge().bridge);
        await expect(
          reg.requestRun({
            pluginId: 'membrana.handler.mfcc' as PluginId,
            deviceId: 'dev-1',
            collectionId: 'c1',
            sampleIds: [],
          }),
        ).rejects.toMatchObject({ status: 400 });
      });
    });

  });
});

describe('вход ведёт и к своду сеанса (r1, пробел вскрыт боевым путём 21.08)', () => {
  it('свод запускается БЕЗ sampleId — он идёт по окну, а не по пробе', async () => {
    const { bridge, sent } = spyBridge();
    const { reg } = await registrar(config, bridge);
    const out = await reg.requestRun({ pluginId: 'membrana.report.session-digest' as PluginId, deviceId: 'dev-1', collectionId: 'c1', from: '2026-08-21T09:45:18.000Z', to: '2026-08-21T10:46:00.000Z' });
    // До правки здесь было 501 «прогон не определён»: вход умел только mfcc.
    expect(out.address.pluginId).toBe('membrana.report.session-digest');
    // #2039: свод доезжает до вызывающего, а не только мостом в office — витрине в библиотеке
    // нужны опорные, а не адрес прогона.
    const digest = out.result as { kind: string; references: unknown[]; negatives: unknown[]; passport: { provisional: string[] } } | undefined;
    expect(digest?.kind).toBe('report');
    expect(Array.isArray(digest?.references)).toBe(true);
    expect(Array.isArray(digest?.negatives)).toBe(true);
    expect(Array.isArray(digest?.passport.provisional)).toBe(true);
    expect(out.address.mountTarget).toBe('background-media/collections');
    expect(out.fingerprints.inputHash).toMatch(/^[0-9a-f]{64}$/);
    expect(out.fingerprints.configHash).toMatch(/^[0-9a-f]{64}$/);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.kind).toBe('report');
  });

  it('отпечатки свода — СВОИ: другой пресет даёт другой configHash, тот же вход — тот же inputHash', async () => {
    const { reg } = await registrar();
    const a = await reg.requestRun({ pluginId: 'membrana.report.session-digest' as PluginId, deviceId: 'dev-1', collectionId: 'c1' });
    const b = await reg.requestRun({ pluginId: 'membrana.report.session-digest' as PluginId, deviceId: 'dev-1', collectionId: 'c1' });
    expect(a.fingerprints).toEqual(b.fingerprints);
    const mfcc = await reg.requestRun({ pluginId: 'membrana.handler.mfcc' as PluginId, deviceId: 'dev-1', collectionId: 'c1', sampleId: 'a' });
    // Свод и mfcc читают те же пробы, но пресеты разные — отпечатки конфигурации не совпадают.
    expect(a.fingerprints.configHash).not.toBe(mfcc.fingerprints.configHash);
  });

  it('незаведённый сборщик — 501, а не выдуманный контекст', async () => {
    const { reg } = await registrar();
    await expect(reg.requestRun({ pluginId: 'membrana.handler.yamnet' as PluginId, deviceId: 'dev-1', collectionId: 'c1', sampleId: 'a' }))
      .rejects.toMatchObject({ status: 501 });
  });
});

describe('витрина отбора библиотеки (#2110)', () => {
  it('прогон по окну: отбор идёт по текущему набору, результат приходит вызывающему', async () => {
    const host = new CollectionsPluginHostService();
    await host.onModuleInit();
    const reg = new FirstWavePluginsRegistrar(host, prisma, blobs, config, spyBridge().bridge);
    await reg.onModuleInit();
    const out = await reg.requestRun({
      pluginId: 'membrana.showcase.library-chart-list' as PluginId,
      deviceId: 'dev-1',
      collectionId: 'c1',
      volume: 20,
      criterion: 'loudness-over-floor',
    });
    expect(out.address.collectionId).toBe('c1');
    const result = out.result as { selection: { refusal: unknown; picks: unknown[] }; inSet: number };
    // Фикстурные пробы — не настоящие wav, измеритель честно откажет ЛИБО отберёт: предмет зуба —
    // что результат ДОЕХАЛ до вызывающего и счётчики названы, а не что звук раскодировался.
    expect(result).toBeTruthy();
    expect(result.inSet).toBeGreaterThan(0);
  });

  it('негодные настройки — отказ отбора словом, прогон не падает', async () => {
    const host = new CollectionsPluginHostService();
    await host.onModuleInit();
    const reg = new FirstWavePluginsRegistrar(host, prisma, blobs, config, spyBridge().bridge);
    await reg.onModuleInit();
    const out = await reg.requestRun({
      pluginId: 'membrana.showcase.library-chart-list' as PluginId,
      deviceId: 'dev-1',
      collectionId: 'c1',
      volume: 7,
      criterion: 'loudness-over-floor',
    });
    const result = out.result as { selection: { refusal: { reason: string } | null } };
    expect(result.selection.refusal?.reason).toBe('unknown-volume');
  });

  it('витрина дублей (#2109): прогон по набору возвращает отчёт о парах вызывающему и не знает «удалить»', async () => {
    const host = new CollectionsPluginHostService();
    await host.onModuleInit();
    const reg = new FirstWavePluginsRegistrar(host, prisma, blobs, config, spyBridge().bridge);
    await reg.onModuleInit();
    const out = await reg.requestRun({ pluginId: 'membrana.showcase.library-duplicates' as PluginId, deviceId: 'dev-1', collectionId: 'c1' });
    const result = out.result as { report: { groups: unknown[]; passport: { inherited: boolean } } } | undefined;
    expect(result?.report).toBeDefined();
    expect(result?.report.passport.inherited).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/delete|remove|удал/iu);
  });

  it('отпечаток входа считается от состава проб В ОКНЕ: другое окно — другой inputHash', async () => {
    const host = new CollectionsPluginHostService();
    await host.onModuleInit();
    const reg = new FirstWavePluginsRegistrar(host, prisma, blobs, config, spyBridge().bridge);
    await reg.onModuleInit();
    const base = { pluginId: 'membrana.showcase.library-chart-list' as PluginId, deviceId: 'dev-1', collectionId: 'c1', volume: 20, criterion: 'loudness-over-floor' };
    const all = await reg.requestRun(base);
    const windowed = await reg.requestRun({ ...base, from: '2026-08-21T10:00:00.500Z' });
    expect(all.fingerprints.inputHash).not.toBe(windowed.fingerprints.inputHash);
  });
});

/**
 * Один источник числа для витрины и таблицы (#2177).
 *
 * СВОЯ фикстура базы, а не общая: общая описывает одно устройство, и на ней чтение по паре
 * неотличимо от чтения по одному `collectionId` — зуб зеленел бы при обоих. Здесь два
 * устройства с ОДНИМ именем набора, как на проде: `Collection @@id([deviceId, id])`.
 */
describe('один источник числа для витрины и таблицы (#2177)', () => {
  const twoDevices = [
    { id: 'a', collectionId: 'c1', deviceId: 'dev-1', sampleRate: 48000, channels: 1, audioFormat: 'wav', sizeBytes: 3, title: 'A', storageRef: 'd/a.wav', createdAt: new Date('2026-08-21T10:00:00.000Z') },
    { id: 'b', collectionId: 'c1', deviceId: 'dev-1', sampleRate: 48000, channels: 1, audioFormat: 'wav', sizeBytes: 3, title: 'B', storageRef: 'd/b.wav', createdAt: new Date('2026-08-21T10:00:01.000Z') },
    { id: 'z', collectionId: 'c1', deviceId: 'dev-2', sampleRate: 48000, channels: 1, audioFormat: 'wav', sizeBytes: 3, title: 'Z', storageRef: 'd/z.wav', createdAt: new Date('2026-08-21T10:00:02.000Z') },
  ];
  const prismaPair = {
    sample: {
      findMany: async ({ where }: { where: { collectionId: string; deviceId?: string } }) =>
        twoDevices
          .filter((r) => r.collectionId === where.collectionId && (where.deviceId === undefined || r.deviceId === where.deviceId))
          .sort((x, y) => (x.id < y.id ? -1 : 1)),
      findFirstOrThrow: async ({ where }: { where: { id: string; deviceId: string; collectionId: string } }) => {
        const row = twoDevices.find((r) => r.id === where.id && r.deviceId === where.deviceId && r.collectionId === where.collectionId);
        if (!row) throw new Error('not found');
        return row;
      },
    },
  } as unknown as PrismaService;

  it('витрина считает набор СВОЕГО устройства, а не всех с тем же именем набора', async () => {
    // Дефект 26.08 числами владельца: витрина «в наборе 1980», таблица той же коллекции
    // «1–40 из 1727», сумма ВСЕХ коллекций устройства — 1947. Первое больше суммы своих —
    // значит считались чужие устройства. Здесь у dev-1 две пробы, у dev-2 одна с тем же
    // именем набора: витрина обязана увидеть две.
    const host = new CollectionsPluginHostService();
    await host.onModuleInit();
    const reg = new FirstWavePluginsRegistrar(host, prismaPair, blobs, config, spyBridge().bridge);
    await reg.onModuleInit();

    const out = await reg.requestRun({
      pluginId: 'membrana.showcase.library-chart-list' as PluginId,
      deviceId: 'dev-1',
      collectionId: 'c1',
      volume: 20,
      criterion: 'loudness-over-floor',
    });
    expect((out.result as { inSet: number }).inSet).toBe(2);
  }, 20_000);

  it('устройство в адресе прогона ОБЯЗАТЕЛЬНО — необязательное было бы fail-open', () => {
    const src = readFileSync(join(__dirname, 'first-wave.registrar.ts'), 'utf8');
    expect(src).toContain('readonly deviceId: string;');
    expect(src).not.toMatch(/readonly deviceId\?:/u);
    expect(src).toContain('where: { deviceId, collectionId }');
  });
});
