import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useMembranaStore } from './store';
import { Module, ModuleProps } from './types';

export { useMembranaStore };

/**
 * ВАЖНО про селекторы Zustand:
 * Селектор должен возвращать СТАБИЛЬНУЮ ссылку, иначе Zustand считает,
 * что состояние изменилось, и форсит ре-рендер — на следующем рендере
 * селектор снова возвращает новый массив, и так бесконечно.
 *
 * Для селекторов, которые возвращают массив/объект, используем useShallow:
 * он сравнивает результат поверхностно и переиспользует ссылку, если содержимое
 * не изменилось.
 *
 * Для функций — извлекаем их по одной (функции в store создаются один раз
 * и стабильны), а замыкания над аргументами оборачиваем в useCallback.
 */

// Получение всех модулей
export const useAllModules = (): Module[] => {
  return useMembranaStore(
    useShallow((state) => Array.from(state.modules.values())),
  );
};

// Получение модулей по категории
export const useModulesByCategory = (category: string): Module[] => {
  return useMembranaStore(
    useShallow((state) => state.getModulesByCategory(category)),
  );
};

// Получение списка модулей (без состояния)
export const useModulesList = (category?: string): Module[] => {
  const all = useAllModules();
  const byCategory = useModulesByCategory(category ?? '');
  return category ? byCategory : all;
};

// Получение только включенных модулей
export const useEnabledModules = (): Module[] => {
  return useMembranaStore(
    useShallow((state) => state.getEnabledModules()),
  );
};

// Получение включенных модулей как список
export const useEnabledModulesList = (category?: string): Module[] => {
  const modules = useModulesList(category);
  return useMemo(() => modules.filter((m) => m.enabled), [modules]);
};

// Получение включенных модулей по категории
export const useEnabledModulesByCategory = (category: string): Module[] => {
  return useMembranaStore(
    useShallow((state) =>
      state.getModulesByCategory(category).filter((m) => m.enabled),
    ),
  );
};

// Toggle модуля
export const useModuleToggle = (moduleId: string) => {
  const isEnabled = useMembranaStore((state) => state.isModuleEnabled(moduleId));
  const toggleModule = useMembranaStore((state) => state.toggleModule);

  const toggle = useCallback(() => {
    toggleModule(moduleId);
  }, [toggleModule, moduleId]);

  return { isEnabled, toggle };
};

/** Панель модуля: сущность, флаг enabled и toggle без лишних селекторов. */
export const useModule = (moduleId: string) => {
  const module = useMembranaStore((state) => state.getModule(moduleId));
  const toggleModule = useMembranaStore((state) => state.toggleModule);
  const enabled = module?.enabled ?? false;
  const toggle = useCallback(() => {
    toggleModule(moduleId);
  }, [toggleModule, moduleId]);

  return { module, enabled, toggle, state: module };
};

// Получение пропсов для модуля
export const useModuleProps = <TConfig = Record<string, unknown>>(
  moduleId: string,
): ModuleProps<TConfig> | null => {
  const module = useMembranaStore((state) => state.getModule(moduleId)) as
    | Module<TConfig>
    | undefined;
  const updateModuleConfig = useMembranaStore((state) => state.updateModuleConfig);
  const togglePlugin = useMembranaStore((state) => state.togglePlugin);

  const onUpdateConfig = useCallback(
    (updates: Partial<TConfig>) => updateModuleConfig(moduleId, updates),
    [updateModuleConfig, moduleId],
  );

  const onTogglePlugin = useCallback(
    (pluginId: string) => togglePlugin(moduleId, pluginId),
    [togglePlugin, moduleId],
  );

  if (!module) return null;

  return {
    module,
    onUpdateConfig,
    onTogglePlugin,
  };
};

// Получение плагинов модуля
export const useModulePlugins = (moduleId: string) => {
  const plugins = useMembranaStore(
    useShallow((state) => {
      const modulePlugins = state.plugins.get(moduleId);
      return modulePlugins ? Array.from(modulePlugins.values()) : [];
    }),
  );

  const activeIds = useMembranaStore(
    useShallow((state) => state.getModule(moduleId)?.activePlugins ?? []),
  );

  const togglePluginFn = useMembranaStore((state) => state.togglePlugin);

  const toggle = useCallback(
    (pluginId: string) => togglePluginFn(moduleId, pluginId),
    [togglePluginFn, moduleId],
  );

  return { plugins, activeIds, toggle };
};

// Категории
export const useCategories = (): string[] => {
  return useMembranaStore(
    useShallow((state) => state.getAllCategories()),
  );
};

export const useCategory = (category: string) => {
  const modules = useModulesByCategory(category);
  const disableCategory = useMembranaStore((state) => state.disableCategory);
  const enableCategory = useMembranaStore((state) => state.enableCategory);

  const anyEnabled = modules.some((m) => m.enabled);
  const allEnabled = modules.length > 0 && modules.every((m) => m.enabled);

  const toggleAll = useCallback(() => {
    if (anyEnabled) {
      disableCategory(category);
    } else {
      enableCategory(category);
    }
  }, [anyEnabled, disableCategory, enableCategory, category]);

  return { modules, anyEnabled, allEnabled, toggleAll };
};

// Фильтры
export const useFilters = () => {
  const filters = useMembranaStore((state) => state.activeFilters);
  const setFilters = useMembranaStore((state) => state.setFilters);
  return { filters, setFilters };
};

export const useFilteredModules = (): Module[] => {
  return useMembranaStore(
    useShallow((state) => state.getFilteredModules()),
  );
};

export const useSelectedModule = () => {
  const selectedModuleId = useMembranaStore((state) => state.selectedModuleId);
  const module = useMembranaStore((state) =>
    selectedModuleId ? state.getModule(selectedModuleId) : undefined,
  );
  const selectModule = useMembranaStore((state) => state.selectModule);

  return {
    selectedModuleId,
    module,
    selectModule,
  };
};

export const useModulePluginsForCurrentModule = () => {
  const { selectedModuleId } = useSelectedModule();
  return useModulePlugins(selectedModuleId || '');
};
