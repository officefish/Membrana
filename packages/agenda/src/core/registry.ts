/**
 * MembranaRegistry — КАНОНИЧЕСКИЙ фасад регистрации модулей и плагинов.
 *
 * ОБЯЗАТЕЛЬНЫЙ путь для клиента: НЕ обращаться к `useMembranaStore.getState()`
 * напрямую для регистрации. Только через этот фасад.
 *
 * Преимущества:
 *  - один шаг для lazy-загрузки (`registerLazyModule` сам обернёт в React.lazy);
 *  - явное место, где Teamlead и инструменты CI могут проверить процесс;
 *  - изоляция от внутренней структуры store (можно менять реализацию, не ломая клиента).
 *
 * См. `docs/MODULE_AND_PLUGIN_UI.md` (раздел «Регистрация модулей и lazy-loading»).
 */

import { lazy, type ComponentType } from 'react';

import { useMembranaStore } from './store';
import type { Module, ModuleProps, Plugin } from './types';

/**
 * Метаданные нового модуля без поля `Component`.
 * Используется в `registerLazyModule` (компонент приходит через `loader`)
 * и при базовой регистрации в `registerModule`, где `Component` обязателен.
 */
export type ModuleMetadata<TConfig> = Omit<
  Module<TConfig>,
  'Component' | 'enabled' | 'config' | 'activePlugins'
> & {
  enabled?: boolean;
  config?: TConfig;
  activePlugins?: string[];
};

/**
 * Параметры lazy-регистрации модуля. Loader должен возвращать default-export
 * с компонентом — это совместимо с сигнатурой React.lazy().
 */
export interface LazyModuleParams<TConfig> extends ModuleMetadata<TConfig> {
  loader: () => Promise<{ default: ComponentType<ModuleProps<TConfig>> }>;
}

export const MembranaRegistry = {
  /**
   * Регистрация модуля с уже готовым компонентом.
   * Для тяжёлых компонентов предпочитайте `registerLazyModule`.
   */
  registerModule<TConfig>(
    module: ModuleMetadata<TConfig> & {
      Component: Module<TConfig>['Component'];
    },
  ): void {
    useMembranaStore.getState().registerModule(module);
  },

  /**
   * Регистрация модуля с ленивой загрузкой компонента.
   * Чанк Vite/webpack приходит только когда `ModuleRenderer` монтирует
   * выбранный модуль (через React.Suspense).
   *
   * Пример:
   *   MembranaRegistry.registerLazyModule({
   *     id: 'microphone',
   *     name: 'Микрофон',
   *     ...,
   *     loader: () => import('./MicrophoneModule')
   *       .then((m) => ({ default: m.MicrophoneModule })),
   *   });
   */
  registerLazyModule<TConfig>({
    loader,
    ...metadata
  }: LazyModuleParams<TConfig>): void {
    const Component = lazy(loader);
    useMembranaStore.getState().registerModule({ ...metadata, Component });
  },

  /** Батч-регистрация уже готовых модулей. */
  registerModules<TConfig>(
    modules: Array<
      ModuleMetadata<TConfig> & { Component: Module<TConfig>['Component'] }
    >,
  ): void {
    const store = useMembranaStore.getState();
    modules.forEach((m) => store.registerModule(m));
  },

  /** Батч-регистрация lazy-модулей. */
  registerLazyModules<TConfig>(modules: Array<LazyModuleParams<TConfig>>): void {
    modules.forEach((m) => this.registerLazyModule(m));
  },

  /** Регистрация плагина в указанный модуль. */
  registerPlugin<TConfig>(moduleId: string, plugin: Plugin<TConfig>): void {
    useMembranaStore.getState().registerPlugin(moduleId, plugin);
  },

  /**
   * Завершает фазу регистрации.
   * Сбрасывает `pendingModulePrefs` после того, как все модули зарегистрированы:
   * persisted-настройки уже применены при `registerModule`, дальше держать их
   * в state нет смысла.
   *
   * Вызывайте ОДИН раз в конце `registerClientModules()`.
   */
  finalizeRegistration(): void {
    useMembranaStore.getState().clearPendingPrefs();
  },

  // -------- Read-only селекторы (удобные обёртки) --------

  getModule(moduleId: string): Module | undefined {
    return useMembranaStore.getState().getModule(moduleId);
  },

  getPlugin(moduleId: string, pluginId: string): Plugin | undefined {
    return useMembranaStore.getState().getPlugin(moduleId, pluginId);
  },

  getSnapshot() {
    const state = useMembranaStore.getState();
    return {
      modules: Array.from(state.modules.values()),
      categories: state.getAllCategories(),
      enabledModules: state.getEnabledModules(),
    };
  },

  // -------- Императивное управление (используется из UI / админских команд) --------

  enableModule(moduleId: string): void {
    useMembranaStore.getState().enableModule(moduleId);
  },

  disableModule(moduleId: string): void {
    useMembranaStore.getState().disableModule(moduleId);
  },

  activatePlugin(moduleId: string, pluginId: string): void {
    useMembranaStore.getState().activatePlugin(moduleId, pluginId);
  },

  deactivatePlugin(moduleId: string, pluginId: string): void {
    useMembranaStore.getState().deactivatePlugin(moduleId, pluginId);
  },

  updatePluginConfig<TConfig>(
    moduleId: string,
    pluginId: string,
    updates: Partial<TConfig>,
  ): void {
    useMembranaStore.getState().updatePluginConfig(moduleId, pluginId, updates);
  },
};

/** @deprecated Использовать MembranaRegistry с lower-case `m` нельзя — алиас оставлен на короткий период. */
export const membranaRegistry = MembranaRegistry;
