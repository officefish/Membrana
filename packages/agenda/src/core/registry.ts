// src/core/registry.ts (опционально, как фасад над store)
import { useMembranaStore } from './store';
import type { Module, Plugin } from './types';

// Простая обертка над store для удобства
export const MembranaRegistry = {
  registerModule: <TConfig>(module: Module<TConfig>) => {
    useMembranaStore.getState().registerModule(module);
  },
  
  registerPlugin: <TConfig,>(moduleId: string, plugin: Plugin<TConfig>) => {
    useMembranaStore.getState().registerPlugin(moduleId, plugin as Plugin);
  },

  updatePluginConfig: <TConfig>(
    moduleId: string,
    pluginId: string,
    updates: Partial<TConfig>,
  ) => {
    useMembranaStore.getState().updatePluginConfig(moduleId, pluginId, updates);
  },
  
  getModule: (moduleId: string) => {
    return useMembranaStore.getState().getModule(moduleId);
  },
  
  getPlugin: (moduleId: string, pluginId: string) => {
    return useMembranaStore.getState().getPlugin(moduleId, pluginId);
  },
  
  enableModule: (moduleId: string) => {
    useMembranaStore.getState().enableModule(moduleId);
  },
  
  disableModule: (moduleId: string) => {
    useMembranaStore.getState().disableModule(moduleId);
  },
  
  activatePlugin: (moduleId: string, pluginId: string) => {
    useMembranaStore.getState().activatePlugin(moduleId, pluginId);
  },
  
  deactivatePlugin: (moduleId: string, pluginId: string) => {
    useMembranaStore.getState().deactivatePlugin(moduleId, pluginId);
  },
  
  // Метод для批量ной регистрации
  registerModules: (modules: Module[]) => {
    modules.forEach(module => {
      useMembranaStore.getState().registerModule(module);
    });
  },
  
  // Получить состояние всего реестра
  getSnapshot: () => {
    const state = useMembranaStore.getState();
    return {
      modules: Array.from(state.modules.values()),
      categories: state.getAllCategories(),
      enabledModules: state.getEnabledModules()
    };
  }
};