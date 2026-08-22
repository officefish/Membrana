/**
 * СТАБ СОСЕДА — замещает `@membrana/plugin-contracts` и реестр домов блока A.
 *
 * Регламент коворка, hard rule 3: думать об интерфейсах можно, договариваться — нет; вместо
 * договорённости команда строит ИСПОЛНЯЕМЫЙ стаб соседа строго в своей зоне. Здесь ровно это.
 *
 * ПОЧЕМУ СТАБ, А НЕ ИМПОРТ. Две причины, обе проверены в дереве, а не предположены:
 *  1. `packages/background-cabinet/package.json` не несёт зависимости на `@membrana/plugin-contracts`,
 *     а сам package.json — ВНЕ зоны блока C (зона: `src/modules/journal/**`). Добавить зависимость
 *     блок не вправе;
 *  2. имени `background-cabinet/journal` в реестре домов на этой ветке ещё нет — его вносит блок A,
 *     и до Interface Consilium ветки блоков не сливаются.
 *
 * ЧТО С НИМ БУДЕТ. Стаб — вспомогательный; доживший до прода стаб есть дефект интеграции
 * (регламент). На интеграции координатор добавляет зависимость пакета и заменяет эти импорты
 * на настоящие из `@membrana/plugin-contracts`; формы ниже списаны с контракта дословно, чтобы
 * замена была механической.
 *
 * СПИСАНО С: `packages/plugin-contracts/src/{homes,manifest,executor,host,plugin-event}.ts`
 * по состоянию BASE_SHA `82a93a6e`, плюс ОДНО имя дома, которого там ещё нет и которое вносит
 * блок A. Расхождение стаба с контрактом — предмет Interface Consilium, а не тихой правки.
 */

/** Дом крепления. `background-cabinet/journal` — ожидание от блока A, см. EXPECTATIONS. */
export type HomeName = 'background-cabinet/journal' | 'background-media/collections';

export const JOURNAL_HOME: HomeName = 'background-cabinet/journal';

declare const pluginIdBrand: unique symbol;
export type PluginId = string & { readonly [pluginIdBrand]: 'PluginId' };

export const PLUGIN_ID_PATTERN = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2}$/u;

export function isPluginId(value: unknown): value is PluginId {
  return typeof value === 'string' && PLUGIN_ID_PATTERN.test(value);
}

export type PluginKind = 'handler' | 'report' | 'showcase';

export type PluginTrigger =
  | 'journal.entry_created'
  | 'collections.collection_created'
  | 'collections.sample_added';

export type DisplayForm =
  | 'row'
  | 'table'
  | 'zone-map'
  | 'histogram'
  | 'time-series'
  | `x-${string}`;

interface PluginManifestBase {
  readonly id: PluginId;
  readonly version: string;
  readonly kind: PluginKind;
  readonly mountTarget: HomeName;
  readonly triggers: readonly PluginTrigger[];
}

export interface HandlerManifest extends PluginManifestBase {
  readonly kind: 'handler';
  readonly windowSize: number;
}

export interface ReportManifest extends PluginManifestBase {
  readonly kind: 'report';
}

export interface ShowcaseManifest extends PluginManifestBase {
  readonly kind: 'showcase';
  readonly displayForm: DisplayForm;
  readonly description?: string;
}

export type PluginManifest = HandlerManifest | ReportManifest | ShowcaseManifest;

export interface RunAddress {
  readonly pluginId: PluginId;
  readonly version: string;
  readonly collectionId: string;
  readonly runId: string;
  readonly mountTarget: HomeName;
}

export interface RunFingerprints {
  readonly inputHash: string;
  readonly configHash: string;
}

export type ResumeMode = 'from-freeze' | 'fresh';

export interface RunResult {
  readonly completedAt: Date;
  readonly kind: PluginKind;
}

export interface PluginContext<TPayload = unknown> {
  readonly address: RunAddress;
  readonly fingerprints: RunFingerprints;
  readonly resumeMode: ResumeMode;
  readonly trigger: PluginTrigger;
  readonly payload: TPayload;
}

export interface PluginExecutor {
  execute(ctx: PluginContext): Promise<RunResult>;
}

export interface IPluginEvent<T = unknown> {
  readonly trigger: PluginTrigger;
  readonly occurredAt: Date;
  readonly payload: T;
}

export interface IPluginHost {
  readonly mountTargetId: HomeName;
  registerPlugin(manifest: PluginManifest, executor: PluginExecutor): void;
  getRegisteredPlugins(): ReadonlyArray<PluginManifest>;
  notify(event: IPluginEvent): void;
  request(pluginId: PluginId, trigger: PluginTrigger, ctx: PluginContext): Promise<void>;
  setPluginEnabled(id: PluginId, enabled: boolean): void;
}
