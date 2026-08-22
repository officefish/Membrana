/**
 * Журнал кабинета как ДОМ КРЕПЛЕНИЯ — блок C коворка `cowork-server-plugin-pages`.
 *
 * Домом модуль делает не запись в реестре, а реализация `IPluginHost` (M2). Реестр объявляет
 * имя `background-cabinet/journal` — это блок A; здесь имя обретает поведение.
 *
 * ЧТО ЭТОТ ХОСТ ДЕЛАЕТ ИНАЧЕ, ЧЕМ ХОСТ КОЛЛЕКЦИЙ. Он проверяет ЗАДАНИЕ до вызова плагина
 * (`verifyJournalTask`): у коллекций входом был сам звук, и проверять было нечего кроме частоты,
 * а у журнала вход — адреса записей ленты, и «такой записи нет» модуль знает лучше плагина.
 * Без этой проверки оператор крутит ручку мёртвого регулятора — плагин отвечает, а за ответом
 * ничего нет (К8 шторма 22.08).
 *
 * ЧЕГО ХОСТ НЕ ДЕЛАЕТ. Не собирает `PluginContext` и не адресует прогон: `RunAddress` требует
 * пятью полями `collectionId`, а журнал коллекцией не является, и чем адресуется прогон
 * плагина журнала — контракт НЕ ГОВОРИТ. Вопрос вынесен в `EXPECTATIONS.md`; здесь `request`
 * принимает готовый контекст от вызывающего, как и предписано контрактом хоста, и своего
 * адреса не изобретает.
 */
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { LiveJournalItemRow } from '../live-journal-items.mapper';
import type {
  HomeName,
  IPluginEvent,
  IPluginHost,
  PluginContext,
  PluginExecutor,
  PluginId,
  PluginManifest,
  PluginTrigger,
} from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };
import { JOURNAL_HOME } from './home';
import { taskKinds, verifyJournalTask, type JournalTask, type JournalTaskVerdict } from './journal-task';

interface Registration {
  readonly manifest: PluginManifest;
  readonly executor: PluginExecutor;
  enabled: boolean;
}

/** Чем модуль отдаёт плагину ленту. Порт, а не служба: хосту не нужен весь `JournalService`. */
export interface JournalEntriesReader {
  listEntries(userId: string): Promise<readonly LiveJournalItemRow[]>;
}

@Injectable()
export class JournalPluginHostService implements IPluginHost, OnModuleInit {
  readonly mountTargetId: HomeName = JOURNAL_HOME;

  private readonly logger = new Logger(JournalPluginHostService.name);
  private readonly plugins = new Map<PluginId, Registration>();

  /**
   * Значения контрактов приходят ДИНАМИЧЕСКИМ импортом, а типы — обычным.
   *
   * Причина не в стиле: `@membrana/plugin-contracts` — ESM-пакет, а этот пакет собирается в
   * CommonJS, и `require` до него не дотянется. Типы такой границы не знают (их нет в рантайме) и
   * берутся напрямую с `resolution-mode` — как в `background-office`; значения берутся импортом
   * с ожиданием — как в `background-media`. Обе половины повторяют уже решённое в доме, а не
   * заводят третий способ.
   *
   * Границу вскрыла ИНТЕГРАЦИЯ коворка: в изоляции модуль стоял на стабе контрактов в своей зоне,
   * и стаб был CommonJS — то есть прятал ровно тот шов, ради которого зона и была нарезана.
   */
  protected loadContracts(): Promise<{ isPluginId(value: unknown): boolean }> {
    return import('@membrana/plugin-contracts');
  }

  private contractsPromise: Promise<{ isPluginId(value: unknown): boolean }> | null = null;
  private contracts: { isPluginId(value: unknown): boolean } | null = null;

  async onModuleInit(): Promise<void> {
    this.contractsPromise ??= this.loadContracts().catch((error: unknown) => {
      this.contractsPromise = null;
      throw error;
    });
    this.contracts = await this.contractsPromise;
  }

  constructor(private readonly entries: JournalEntriesReader) {}

  registerPlugin(manifest: PluginManifest, executor: PluginExecutor): void {
    if (!this.contracts) throw new ServiceUnavailableException('Plugin host is not initialized');
    if (!this.contracts.isPluginId(manifest.id)) throw new BadRequestException('Invalid plugin id');
    if (manifest.mountTarget !== this.mountTargetId) {
      // Чужой дом — отказ до рантайма плагина, а не после. Дом, принимающий чужие манифесты,
      // перестаёт быть домом: `mountTarget` тогда ничего не значит.
      throw new BadRequestException(
        `Plugin ${manifest.id} cannot mount on ${this.mountTargetId}: manifest declares ${manifest.mountTarget}`,
      );
    }
    this.plugins.set(manifest.id, { manifest, executor, enabled: true });
  }

  getRegisteredPlugins(): ReadonlyArray<PluginManifest> {
    return [...this.plugins.values()].map(({ manifest }) => manifest);
  }

  /**
   * Жильцы вместе с их включённостью.
   *
   * ЗАЧЕМ ОТДЕЛЬНЫЙ ЧИТАТЕЛЬ. `enabled` не входит и не войдёт в манифест: манифест — ровно пять
   * полей, а включённость есть операция реестра (M5′). Но без читателя `setPluginEnabled` писал
   * бы в состояние, которое снаружи не прочесть, — и галочке в сайдбаре страницы неоткуда было
   * бы взять своё положение. Находка Interface Consilium коворка `cowork-server-plugin-pages`
   * (адаптер И-4): вопрос «спрашивается отдельно» не имел метода спроса.
   *
   * Дом — ЕДИНСТВЕННЫЙ владелец включённости. Страница её отражает и просит переключить, своего
   * состояния не заводит: две включённости означали бы «выключил в сайдбаре, а дом всё ещё зовёт».
   */
  getPluginStates(): ReadonlyArray<{ manifest: PluginManifest; enabled: boolean }> {
    return [...this.plugins.values()].map(({ manifest, enabled }) => ({ manifest, enabled }));
  }

  /** Включённость — операция реестра, не поле описания (M5′). */
  setPluginEnabled(id: PluginId, enabled: boolean): void {
    const entry = this.plugins.get(id);
    if (!entry) throw new NotFoundException(`Plugin ${id} is not registered`);
    entry.enabled = enabled;
  }

  /** Живой канал: fire-and-forget, выключенный плагин сигнал теряет — буфера нет (M4). */
  notify(event: IPluginEvent): void {
    for (const entry of this.plugins.values()) {
      if (!entry.enabled || !entry.manifest.triggers.includes(event.trigger)) continue;
      void entry.executor
        .execute(event.payload as PluginContext)
        .catch((error: unknown) => this.logger.error({ error, pluginId: entry.manifest.id }, 'Plugin notify failed'));
    }
  }

  /** Постфактум-канал. Контекст приходит от вызывающего — хост его не изобретает (см. шапку). */
  async request(pluginId: PluginId, trigger: PluginTrigger, ctx: PluginContext): Promise<void> {
    const entry = this.requireEnabled(pluginId);
    await entry.executor.execute({ ...ctx, trigger });
  }

  /**
   * Прогон по ЗАДАНИЮ — то, ради чего журнал отличается от коллекций.
   *
   * Порядок несущий: сперва проверка задания, потом вызов. Обратный порядок означал бы, что
   * плагин уже начал работу над тем, чего нет.
   */
  async requestWithTask(
    pluginId: PluginId,
    trigger: PluginTrigger,
    ctx: PluginContext,
    userId: string,
    task: JournalTask,
  ): Promise<{ verdict: JournalTaskVerdict; kinds: ReturnType<typeof taskKinds> | null }> {
    const entry = this.requireEnabled(pluginId);
    const verdict = verifyJournalTask(task, await this.entries.listEntries(userId));
    if (!verdict.ok) {
      this.logger.warn({ pluginId, reason: verdict.reason }, 'Journal task refused before plugin run');
      return { verdict, kinds: null };
    }
    const kinds = taskKinds(verdict.entries);
    await entry.executor.execute({ ...ctx, trigger, payload: { ...(ctx.payload as object), entries: verdict.entries, kinds } });
    return { verdict, kinds };
  }

  private requireEnabled(pluginId: PluginId): Registration {
    const entry = this.plugins.get(pluginId);
    if (!entry) throw new NotFoundException(`Plugin ${pluginId} is not registered`);
    if (!entry.enabled) throw new BadRequestException(`Plugin ${pluginId} is disabled`);
    return entry;
  }
}
