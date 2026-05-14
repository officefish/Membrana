import React from 'react';

// Контекст модуля для плагинов
export interface ModuleContext<TConfig = Record<string, unknown>> {
  moduleId: string;
  config: TConfig;
  updateConfig: (updates: Partial<TConfig>) => void;
  getPlugin: (pluginId: string) => Plugin | undefined;
}

/**
 * Колбэк очистки, который плагин может вернуть из `install`.
 * Вызывается store при деактивации плагина / разрегистрации модуля /
 * unmount приложения.
 */
export type PluginTeardown = () => void | Promise<void>;

/** Что может вернуть `install`: ничего, sync teardown, async с/без teardown. */
export type PluginInstallResult =
  | void
  | PluginTeardown
  | Promise<void | PluginTeardown>;

// Плагин с состоянием
export interface Plugin<TConfig = Record<string, unknown>> {
  id: string;
  name: string;
  description?: string;
  version: string;
  active: boolean;
  config?: TConfig;
  /**
   * Вызывается store ОДИН раз при первой активации плагина (`activatePlugin` /
   * `togglePlugin` → on, либо при `registerPlugin` если `active: true`).
   * Может вернуть teardown — store сохранит его и вызовет при деактивации.
   *
   * Используйте install/teardown для подписок на shared-хабы и для регистрации
   * слушателей в engine-сервисах — это устраняет необходимость дублировать
   * подписки в UI-компонентах.
   */
  install: (context: ModuleContext<TConfig>) => PluginInstallResult;
}

// Модуль с состоянием
export interface Module<TConfig = Record<string, unknown>> {
  id: string;
  name: string;
  description?: string;
  version: string;
  category: string;
  enabled: boolean;
  config: TConfig;
  activePlugins: string[];
  /** Синхронный компонент или React.lazy — чанк подгружается при первом монтировании. */
  Component:
    | React.ComponentType<ModuleProps<TConfig>>
    | React.LazyExoticComponent<React.ComponentType<ModuleProps<TConfig>>>;
  defaultConfig?: Partial<TConfig>;
  availablePlugins?: Plugin[];
}

// Пропсы для компонента модуля
export interface ModuleProps<TConfig = Record<string, unknown>> {
  module: Module<TConfig>;
  onUpdateConfig: (updates: Partial<TConfig>) => void;
  onTogglePlugin?: (pluginId: string) => void;
}

/** Аргументы кастомного рендера настроек плагина в сайдбаре (вкладка «Плагины»). */
export interface PluginSidebarDetailsArgs {
  moduleId: string;
  pluginId: string;
  pluginName: string;
  config: unknown;
}

// Фильтры
export interface MembranaFilters {
  categories?: string[];
  search?: string;
  tags?: string[];
}

/** Сериализуемые настройки модуля (без React-компонента). */
export interface ModuleUserPrefsSnapshot {
  enabled: boolean;
  config: Record<string, unknown>;
  activePlugins: string[];
}

// Состояние store
export interface MembranaState {
  modules: Map<string, Module>;
  plugins: Map<string, Map<string, Plugin>>;
  categories: Map<string, Set<string>>;
  activeFilters: MembranaFilters;
  selectedModuleId: string | null;
  /**
   * После rehydrate: если карта модулей ещё пуста, накладывается в registerModule.
   * Если модули уже есть — merge сразу применяет prefs и сбрасывает в null.
   */
  pendingModulePrefs: Record<string, ModuleUserPrefsSnapshot> | null;
  
  // Actions
  registerModule: <TConfig>(module: Omit<Module<TConfig>, 'enabled' | 'config' | 'activePlugins'> & { 
    enabled?: boolean; 
    config?: TConfig;
    activePlugins?: string[];
  }) => void;
  registerPlugin: <TConfig>(moduleId: string, plugin: Plugin<TConfig>) => void;
  updatePluginConfig: <TConfig>(
    moduleId: string,
    pluginId: string,
    updates: Partial<TConfig>,
  ) => void;

  enableModule: (moduleId: string) => void;
  disableModule: (moduleId: string) => void;
  toggleModule: (moduleId: string) => void;
  updateModuleConfig: <TConfig>(moduleId: string, config: Partial<TConfig>) => void;
  
  enableCategory: (category: string) => void;
  disableCategory: (category: string) => void;
  
  activatePlugin: (moduleId: string, pluginId: string) => void;
  deactivatePlugin: (moduleId: string, pluginId: string) => void;
  togglePlugin: (moduleId: string, pluginId: string) => void;
  
  setFilters: (filters: Partial<MembranaFilters>) => void;

  /** Завершение фазы регистрации: сбрасывает pendingModulePrefs. */
  clearPendingPrefs: () => void;
  
  // Selectors
  getModule: (moduleId: string) => Module | undefined;
  getPlugin: (moduleId: string, pluginId: string) => Plugin | undefined;
  getEnabledModules: () => Module[];
  getModulesByCategory: (category: string) => Module[];
  getAllCategories: () => string[];
  getFilteredModules: () => Module[];
  isModuleEnabled: (moduleId: string) => boolean;  

  selectModule: (moduleId: string | null) => void;
}