import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { isRenderableComponentType } from './isRenderableComponentType';
import { MembranaState, Module, ModuleUserPrefsSnapshot, Plugin } from './types';

function prefsFromLegacyPersistedModules(
  modules: unknown,
): Record<string, ModuleUserPrefsSnapshot> {
  const out: Record<string, ModuleUserPrefsSnapshot> = {};
  if (!Array.isArray(modules)) return out;
  for (const entry of modules) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [id, value] = entry as [string, Partial<Module>];
    if (typeof id !== 'string' || !value || typeof value !== 'object') continue;
    out[id] = {
      enabled: !!value.enabled,
      config:
        value.config && typeof value.config === 'object'
          ? (value.config as Record<string, unknown>)
          : {},
      activePlugins: Array.isArray(value.activePlugins) ? value.activePlugins : [],
    };
  }
  return out;
}

export const useMembranaStore = create<MembranaState>()(
  devtools(
    persist(
      (set, get) => ({
        modules: new Map(),
        plugins: new Map(),
        categories: new Map(),
        activeFilters: {},
        selectedModuleId: null,
        pendingModulePrefs: null,

        registerModule: (moduleInput) => {
          set((state) => {
            const newModules = new Map(state.modules);
            const pendingSnap = state.pendingModulePrefs?.[moduleInput.id];
            const existing = newModules.get(moduleInput.id);
            const baseDefaults = { ...(moduleInput.defaultConfig || {}) };

            const enabled = pendingSnap
              ? pendingSnap.enabled
              : existing !== undefined
                ? existing.enabled
                : (moduleInput.enabled ?? true);
            const config = pendingSnap
              ? { ...baseDefaults, ...pendingSnap.config }
              : existing !== undefined
                ? { ...baseDefaults, ...existing.config }
                : (moduleInput.config ?? { ...baseDefaults });
            const activePlugins = pendingSnap
              ? pendingSnap.activePlugins
              : existing !== undefined
                ? existing.activePlugins
                : (moduleInput.activePlugins ?? []);

            const module: Module = {
              id: moduleInput.id,
              name: moduleInput.name,
              description: moduleInput.description,
              version: moduleInput.version,
              category: moduleInput.category,
              Component: moduleInput.Component,
              defaultConfig: moduleInput.defaultConfig,
              availablePlugins: moduleInput.availablePlugins,
              enabled,
              config,
              activePlugins,
            };
            newModules.set(module.id, module);
            
            const newCategories = new Map(state.categories);
            const categoryModules = newCategories.get(module.category) || new Set();
            categoryModules.add(module.id);
            newCategories.set(module.category, categoryModules);
            
            return {
              modules: newModules,
              categories: newCategories,
            };
          });
        },

        registerPlugin: (moduleId, plugin) => {
          set((state) => {
            // Убеждаемся, что plugins это Map
            let newPlugins = state.plugins;
            if (!(newPlugins instanceof Map)) {
              newPlugins = new Map();
              // Восстанавливаем данные если они есть
              if (state.plugins && typeof state.plugins === 'object') {
                Object.entries(state.plugins).forEach(([k, v]) => {
                  newPlugins.set(k, new Map(Object.entries(v as object)));
                });
              }
            }
            
            // Получаем или создаем Map для модуля
            let modulePlugins = newPlugins.get(moduleId);
            if (!(modulePlugins instanceof Map)) {
              modulePlugins = new Map();
            }
            
            const prev = modulePlugins.get(plugin.id);
            const merged: Plugin =
              prev !== undefined
                ? {
                    ...plugin,
                    active: prev.active,
                    config: { ...(plugin.config ?? {}), ...(prev.config ?? {}) },
                  }
                : plugin;

            modulePlugins.set(plugin.id, merged);
            newPlugins.set(moduleId, modulePlugins);

            return { plugins: newPlugins };
          });
        },

        updatePluginConfig: (moduleId, pluginId, updates) => {
          set((state) => {
            let newPlugins = state.plugins;
            if (!(newPlugins instanceof Map)) {
              newPlugins = new Map();
              if (state.plugins && typeof state.plugins === 'object') {
                Object.entries(state.plugins).forEach(([k, v]) => {
                  newPlugins.set(k, new Map(Object.entries(v as object)));
                });
              }
            }

            const modulePlugins = newPlugins.get(moduleId);
            if (!(modulePlugins instanceof Map)) {
              return {};
            }

            const plugin = modulePlugins.get(pluginId);
            if (!plugin) {
              return {};
            }

            const nextPlugins = new Map(newPlugins);
            const nextModulePlugins = new Map(modulePlugins);
            nextModulePlugins.set(pluginId, {
              ...plugin,
              config: { ...(plugin.config ?? {}), ...updates },
            });
            nextPlugins.set(moduleId, nextModulePlugins);

            return { plugins: nextPlugins };
          });
        },

        enableModule: (moduleId) => {
          set((state) => {
            const newModules = new Map(state.modules);
            const module = newModules.get(moduleId);
            if (module) {
              newModules.set(moduleId, { ...module, enabled: true });
            }
            return { modules: newModules };
          });
        },

        disableModule: (moduleId) => {
          set((state) => {
            const newModules = new Map(state.modules);
            const module = newModules.get(moduleId);
            if (module) {
              newModules.set(moduleId, { ...module, enabled: false });
            }
            return { modules: newModules };
          });
        },

        toggleModule: (moduleId) => {
          const module = get().getModule(moduleId);
          if (module?.enabled) {
            get().disableModule(moduleId);
          } else {
            get().enableModule(moduleId);
          }
        },

        updateModuleConfig: (moduleId, config) => {
          set((state) => {
            const newModules = new Map(state.modules);
            const module = newModules.get(moduleId);
            if (module) {
              newModules.set(moduleId, {
                ...module,
                config: { ...module.config, ...config }
              });
            }
            return { modules: newModules };
          });
        },

        enableCategory: (category) => {
          const modules = get().getModulesByCategory(category);
          modules.forEach(module => get().enableModule(module.id));
        },

        disableCategory: (category) => {
          const modules = get().getModulesByCategory(category);
          modules.forEach(module => get().disableModule(module.id));
        },

        activatePlugin: (moduleId, pluginId) => {
          set((state) => {
            // Убеждаемся, что plugins это Map
            let newPlugins = state.plugins;
            if (!(newPlugins instanceof Map)) {
              newPlugins = new Map();
            }
            
            let modulePlugins = newPlugins.get(moduleId);
            if (!(modulePlugins instanceof Map)) {
              modulePlugins = new Map();
            }
            
            const plugin = modulePlugins.get(pluginId);
            if (plugin) {
              modulePlugins.set(pluginId, { ...plugin, active: true });
              newPlugins.set(moduleId, modulePlugins);
            }
            
            const newModules = new Map(state.modules);
            const module = newModules.get(moduleId);
            if (module && !module.activePlugins.includes(pluginId)) {
              newModules.set(moduleId, {
                ...module,
                activePlugins: [...module.activePlugins, pluginId]
              });
            }
            
            return { plugins: newPlugins, modules: newModules };
          });
        },

        deactivatePlugin: (moduleId, pluginId) => {
          set((state) => {
            let newPlugins = state.plugins;
            if (!(newPlugins instanceof Map)) {
              newPlugins = new Map();
            }
            
            let modulePlugins = newPlugins.get(moduleId);
            if (!(modulePlugins instanceof Map)) {
              modulePlugins = new Map();
            }
            
            const plugin = modulePlugins.get(pluginId);
            if (plugin) {
              modulePlugins.set(pluginId, { ...plugin, active: false });
              newPlugins.set(moduleId, modulePlugins);
            }
            
            const newModules = new Map(state.modules);
            const module = newModules.get(moduleId);
            if (module) {
              newModules.set(moduleId, {
                ...module,
                activePlugins: module.activePlugins.filter(id => id !== pluginId)
              });
            }
            
            return { plugins: newPlugins, modules: newModules };
          });
        },

        togglePlugin: (moduleId, pluginId) => {
          const plugin = get().getPlugin(moduleId, pluginId);
          if (plugin?.active) {
            get().deactivatePlugin(moduleId, pluginId);
          } else {
            get().activatePlugin(moduleId, pluginId);
          }
        },

        setFilters: (filters) => {
          set((state) => ({
            activeFilters: { ...state.activeFilters, ...filters }
          }));
        },

        selectModule: (moduleId) => {
          set({ selectedModuleId: moduleId });
        },

        getModule: (moduleId) => {
          const modules = get().modules;
          return modules instanceof Map ? modules.get(moduleId) : undefined;
        },

        getPlugin: (moduleId, pluginId) => {
          const plugins = get().plugins;
          if (!(plugins instanceof Map)) return undefined;
          const modulePlugins = plugins.get(moduleId);
          if (!(modulePlugins instanceof Map)) return undefined;
          return modulePlugins.get(pluginId);
        },

        getEnabledModules: () => {
          const modules = get().modules;
          if (!(modules instanceof Map)) return [];
          return Array.from(modules.values()).filter(m => m.enabled);
        },

        getModulesByCategory: (category) => {
          const modules = get().modules;
          if (!(modules instanceof Map)) return [];
          return Array.from(modules.values()).filter(m => m.category === category);
        },

        getAllCategories: () => {
          const categories = get().categories;
          if (!(categories instanceof Map)) return [];
          return Array.from(categories.keys());
        },

        getFilteredModules: () => {
          let modules = get().getEnabledModules();
          const filters = get().activeFilters;
          
          if (filters.categories?.length) {
            modules = modules.filter(m => filters.categories?.includes(m.category));
          }
          
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            modules = modules.filter(m =>
              m.name.toLowerCase().includes(searchLower) ||
              m.description?.toLowerCase().includes(searchLower)
            );
          }
          
          return modules;
        },

        isModuleEnabled: (moduleId) => {
          const module = get().getModule(moduleId);
          return module?.enabled ?? false;
        }
      }),
      {
        name: 'membrana-storage',
        partialize: (state) => ({
          // Только сериализуемые prefs — не кладём React-компоненты и Map modules в JSON.
          modulePrefs:
            state.modules instanceof Map
              ? Object.fromEntries(
                  [...state.modules.entries()].map(([id, m]) => [
                    id,
                    {
                      enabled: m.enabled,
                      config: m.config as Record<string, unknown>,
                      activePlugins: m.activePlugins,
                    },
                  ]),
                )
              : {},
          plugins:
            state.plugins instanceof Map
              ? Array.from(state.plugins.entries()).map(([k, v]) => [
                  k,
                  v instanceof Map ? Array.from(v.entries()) : [],
                ])
              : [],
          activeFilters: state.activeFilters,
          selectedModuleId: state.selectedModuleId,
        }),
        merge: (persistedState, currentState) => {
          const state = persistedState as any;

          const fromLegacy = prefsFromLegacyPersistedModules(state?.modules);
          const fromNew =
            state?.modulePrefs && typeof state.modulePrefs === 'object'
              ? (state.modulePrefs as Record<string, ModuleUserPrefsSnapshot>)
              : {};
          const mergedPrefs: Record<string, ModuleUserPrefsSnapshot> = {
            ...fromLegacy,
            ...fromNew,
          };

          const hasRuntimeModules =
            currentState.modules instanceof Map && currentState.modules.size > 0;

          const modules = new Map(currentState.modules);
          let pendingModulePrefs: Record<string, ModuleUserPrefsSnapshot> | null =
            null;

          if (Object.keys(mergedPrefs).length > 0) {
            if (hasRuntimeModules) {
              for (const [id, snap] of Object.entries(mergedPrefs)) {
                const mod = modules.get(id);
                if (mod && isRenderableComponentType(mod.Component)) {
                  modules.set(id, {
                    ...mod,
                    enabled: snap.enabled,
                    config: {
                      ...(mod.defaultConfig || {}),
                      ...snap.config,
                    },
                    activePlugins: snap.activePlugins,
                  });
                }
              }
            } else {
              pendingModulePrefs = mergedPrefs;
            }
          }

          const plugins = new Map();
          if (state?.plugins && Array.isArray(state.plugins)) {
            state.plugins.forEach(([moduleId, pluginEntries]: [string, any]) => {
              const modulePlugins = new Map();
              if (Array.isArray(pluginEntries)) {
                pluginEntries.forEach(([pluginId, plugin]: [string, Plugin]) => {
                  modulePlugins.set(pluginId, plugin);
                });
              }
              plugins.set(moduleId, modulePlugins);
            });
          }

          const categories = new Map<string, Set<string>>();
          modules.forEach((mod) => {
            let set = categories.get(mod.category);
            if (!set) {
              set = new Set();
              categories.set(mod.category, set);
            }
            set.add(mod.id);
          });

          return {
            ...currentState,
            modules,
            categories,
            pendingModulePrefs,
            plugins,
            activeFilters: state?.activeFilters || {},
            selectedModuleId: state?.selectedModuleId ?? null,
          };
        },
      }
    ),
    { name: 'MembranaStore' }
  )
);