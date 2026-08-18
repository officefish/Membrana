/**
 * Дом крепления — `IPluginHost` (M2 + M4 + M5′, #1961). Домом делает реализация этого
 * интерфейса; сегодня ни journal, ни collections его не несут — это PR-2.
 *
 * Framework-нейтрально по замечанию аудита A2-3: второй параметр `registerPlugin` —
 * исполнитель, а не Nest-тип `Type`. Nest в этом пакете нет и не будет.
 */
import type { PluginContext, PluginExecutor } from './executor.js';
import type { HomeName } from './homes.js';
import type { PluginManifest } from './manifest.js';
import type { IPluginEvent } from './plugin-event.js';
import type { PluginId } from './plugin-id.js';
import type { PluginTrigger } from './triggers.js';

export interface IPluginHost {
  /** Адрес этого дома в `HOME_REGISTRY` (M2; тип уточнён A2-1). */
  readonly mountTargetId: HomeName;

  /** M2. Регистрация — операция реестра; манифест с чужим `mountTarget` отвергается. */
  registerPlugin(manifest: PluginManifest, executor: PluginExecutor): void;

  /** M2 · M5′: единственный канал чтения самоописаний; narrowing по `kind` — на стороне читателя. */
  getRegisteredPlugins(): ReadonlyArray<PluginManifest>;

  /** M4: живой канал, fire-and-forget; выключенный плагин живой сигнал теряет, буфера нет. */
  notify(event: IPluginEvent): void;

  /** M4: постфактум-канал; тот же словарь поводов, `pluginId` — branded (эрратум A4-2). */
  request(pluginId: PluginId, trigger: PluginTrigger, ctx: PluginContext): Promise<void>;

  /** M5′: включённость — операция реестра, не поле манифеста. Границы авторизации — вне контракта. */
  setPluginEnabled(id: PluginId, enabled: boolean): void;
}
