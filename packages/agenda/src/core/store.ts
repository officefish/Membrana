import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { MembranaState, Module, Plugin } from './types';

export const useMembranaStore = create<MembranaState>()(
  devtools(
    persist(
      (set, get) => ({
        modules: new Map(),
        plugins: new Map(),
        categories: new Map(),
        activeFilters: {},
        selectedModuleId: null,

        registerModule: (moduleInput) => {
          set((state) => {
            const newModules = new Map(state.modules);
            const module: Module = {
              ...moduleInput,
              enabled: moduleInput.enabled ?? true,
              config: moduleInput.config ?? (moduleInput.defaultConfig || {}),
              activePlugins: moduleInput.activePlugins ?? [],
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
            
            // Устанавливаем плагин
            modulePlugins.set(plugin.id, plugin);
            newPlugins.set(moduleId, modulePlugins);
            
            return { plugins: newPlugins };
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
          // Преобразуем Map в объекты для сохранения
          modules: state.modules instanceof Map ? Array.from(state.modules.entries()) : [],
          plugins: state.plugins instanceof Map 
            ? Array.from(state.plugins.entries()).map(([k, v]) => [
                k, 
                v instanceof Map ? Array.from(v.entries()) : []
              ])
            : [],
          categories: state.categories instanceof Map ? Array.from(state.categories.entries()) : [],
          activeFilters: state.activeFilters,
          selectedModuleId: state.selectedModuleId
        }),
        // Восстанавливаем Map из сохраненных данных
        merge: (persistedState, currentState) => {
          const state = persistedState as any;
          
          // Восстанавливаем modules как Map
          const modules = new Map();
          if (state?.modules && Array.isArray(state.modules)) {
            state.modules.forEach(([key, value]: [string, Module]) => {
              modules.set(key, value);
            });
          }
          
          // Восстанавливаем plugins как Map of Maps
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
          
          // Восстанавливаем categories как Map
          const categories = new Map();
          if (state?.categories && Array.isArray(state.categories)) {
            state.categories.forEach(([key, value]: [string, string[]]) => {
              categories.set(key, new Set(value));
            });
          }
          
          return {
            ...currentState,
            modules,
            plugins,
            categories,
            activeFilters: state?.activeFilters || {},
            selectedModuleId: state?.selectedModuleId || null
          };
        }
      }
    ),
    { name: 'MembranaStore' }
  )
);