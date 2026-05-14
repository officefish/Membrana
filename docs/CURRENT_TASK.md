<<<<<<< HEAD
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TelemetryEntry {
id: string;
timestamp: number;
type: 'analysis' | 'event' | 'module_start' | 'module_stop';
moduleId: string;
moduleName: string;
data: any;
tags: string[];
}

interface TelemetryState {
modules: Record<string, any>;
entries: TelemetryEntry[];
registerModule: (name: string, data?: any) => string;
unregisterModule: (moduleId: string) => void;
addEntry: (entry: Omit<TelemetryEntry, 'id' | 'timestamp'>) => string;
addReportEntry: (entry: Omit<TelemetryEntry, 'id' | 'timestamp'>) => string | null;
getEntries: () => TelemetryEntry[];
getEntriesByModule: (moduleId: string) => TelemetryEntry[];
getEntriesByType: (type: TelemetryEntry['type']) => TelemetryEntry[];
clearEntries: () => void;
clearOldEntries: (maxAgeMs: number) => void;
// Статистика
getStats: () => {
total: number;
analysis: number;
drone: number;
calm: number;
events: number;
system: number;
};
}

// Хранилище ID уже добавленных отчётов
const addedReportIds = new Set<string>();
=======
[Teamlead]: Ветка `vesnin`. Канонизация процесса регистрации модулей + реализация lifecycle `plugin.install()` / teardown в store. Прямые вызовы `useMembranaStore.getState().registerModule(...)` запрещены — только через `MembranaRegistry`. Документы `ARCHITECTURE.md §1c`, `MODULE_AND_PLUGIN_UI.md §0`, `CONTRIBUTING.md` (раздел `vesnin` + добавление модуля), `.cursorrules` обновлены.

**Изменения:**

1. `packages/agenda/src/core/registry.ts` — `MembranaRegistry` снят статус «опциональный», добавлены `registerLazyModule`, `registerLazyModules`, `finalizeRegistration`. Сигнатуры типизированы (TConfig).
2. `packages/agenda/src/core/store.ts`:
   - Добавлен публичный action `clearPendingPrefs()`.
   - В `activatePlugin` после `set` вызывается `invokePluginInstall(...)`.
   - В `deactivatePlugin` до `set` вызывается `invokePluginTeardown(...)`.
   - В `registerPlugin` если `merged.active === true` — тоже `invokePluginInstall`.
3. `packages/agenda/src/core/plugin-lifecycle.ts` — НОВЫЙ. Хранит teardown'ы вне Zustand state (Map в module-scope), реализует `invokePluginInstall` и `invokePluginTeardown` с понятным API и логированием ошибок.
4. `packages/agenda/src/core/types.ts`:
   - `Plugin.install` теперь возвращает `PluginInstallResult` (`void | PluginTeardown | Promise<...>`).
   - Добавлен `PluginTeardown` тип.
   - В `MembranaState` объявлен action `clearPendingPrefs`.
5. `apps/client/src/modules/registerClientModules.ts` — переписан полностью на `MembranaRegistry.registerLazyModule({...})` + `finalizeRegistration()`. Прямых вызовов store нет.
6. `apps/client/src/plugins/microphone-stream-viz/micStreamVizPlugin.ts` — обновлён под новый `install` / teardown контракт. Реальная подписка на `microphoneStreamHub` пока остаётся в UI-хуке (transitional кейс для виджетов с `analyserRef`).

[Структурщик]: Граф зависимостей сохранён. Lifecycle teardown'ов — вне state, не попадает в persist.
>>>>>>> c8eeaa4 (feat(agenda): registry, plugin lifecycle, client registration)

export const useTelemetryStore = create<TelemetryState>()(
persist(
(set, get) => ({
modules: {},
entries: [],

<<<<<<< HEAD
      registerModule: (name, data = {}) => {
        const moduleId = `mod_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const moduleData = {
          name,
          registeredAt: Date.now(),
          ...data,
        };

        set((state) => ({
          modules: { ...state.modules, [moduleId]: moduleData }
        }));

        // Добавляем событие запуска модуля
        get().addEntry({
          type: 'module_start',
          moduleId,
          moduleName: name,
          data: moduleData,
          tags: ['module', 'start', name.toLowerCase()],
        });

        return moduleId;
      },

      unregisterModule: (moduleId) => {
        const module = get().modules[moduleId];
        if (module) {
          get().addEntry({
            type: 'module_stop',
            moduleId,
            moduleName: module.name,
            data: { stoppedAt: Date.now() },
            tags: ['module', 'stop', module.name.toLowerCase()],
          });
        }

        set((state) => {
          const { [moduleId]: _, ...rest } = state.modules;
          return { modules: rest };
        });
      },

      addEntry: (entry) => {
        const newEntry: TelemetryEntry = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          timestamp: Date.now(),
          ...entry,
        };

        set((state) => {
          const newEntries = [newEntry, ...state.entries];
          if (newEntries.length > 1000) {
            newEntries.pop();
          }
          return { entries: newEntries };
        });

        console.log(`[TelemetryStore] ✅ Entry added: ${newEntry.id} (${entry.moduleName} - ${entry.type})`);
        return newEntry.id;
      },

      // Специализированный метод для добавления отчётов с защитой от дублирования
      addReportEntry: (entry) => {
        // Извлекаем уникальный ID отчёта из данных
        const reportUniqueId = entry.data?.reportUniqueId || entry.data?.id;

        if (!reportUniqueId) {
          console.error('[TelemetryStore] ❌ Report entry missing reportUniqueId!');
          return null;
        }

        // Проверяем, не было ли уже такого отчёта
        if (addedReportIds.has(reportUniqueId)) {
          console.warn(`[TelemetryStore] ⚠️ Duplicate report detected! Report with ID ${reportUniqueId} already exists. Skipping...`);
          console.warn(`[TelemetryStore] Duplicate details:`, {
            moduleId: entry.moduleId,
            moduleName: entry.moduleName,
            type: entry.type,
            reportUniqueId,
          });
          return null;
        }

        // Добавляем ID в Set
        addedReportIds.add(reportUniqueId);

        // Очищаем старые ID (оставляем последние 1000)
        if (addedReportIds.size > 1000) {
          const toDelete = Array.from(addedReportIds).slice(0, addedReportIds.size - 1000);
          toDelete.forEach(id => addedReportIds.delete(id));
        }

        // Создаём запись
        const newEntry: TelemetryEntry = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          timestamp: Date.now(),
          ...entry,
        };

        set((state) => {
          const newEntries = [newEntry, ...state.entries];
          if (newEntries.length > 1000) {
            newEntries.pop();
          }
          return { entries: newEntries };
        });

        console.log(`[TelemetryStore] ✅ Report entry added: ${newEntry.id} (${entry.moduleName} - report: ${reportUniqueId})`);
        return newEntry.id;
      },

      getEntries: () => {
        const entries = get().entries;
        return [...entries].sort((a, b) => b.timestamp - a.timestamp);
      },

      getEntriesByModule: (moduleId) => {
        const entries = get().entries;
        return entries
          .filter(entry => entry.moduleId === moduleId)
          .sort((a, b) => b.timestamp - a.timestamp);
      },

      getEntriesByType: (type) => {
        const entries = get().entries;
        return entries
          .filter(entry => entry.type === type)
          .sort((a, b) => b.timestamp - a.timestamp);
      },

      clearEntries: () => {
        set({ entries: [] });
        addedReportIds.clear();
        console.log('[TelemetryStore] All entries cleared');
      },

      clearOldEntries: (maxAgeMs) => {
        const cutoffTime = Date.now() - maxAgeMs;
        set((state) => {
          const newEntries = state.entries.filter(entry => entry.timestamp > cutoffTime);
          console.log(`[TelemetryStore] Cleared ${state.entries.length - newEntries.length} old entries`);
          return { entries: newEntries };
        });
      },

      getStats: () => {
        const entries = get().entries;
        const analysisEntries = entries.filter(e => e.type === 'analysis');

        return {
          total: entries.length,
          analysis: analysisEntries.length,
          drone: analysisEntries.filter(e => e.data?.tags?.includes('drone')).length,
          calm: analysisEntries.filter(e => e.data?.tags?.includes('calm')).length,
          events: entries.filter(e => e.type === 'event').length,
          system: entries.filter(e => e.type === 'module_start' || e.type === 'module_stop').length,
        };
      },




    }),
    {
      name: 'telemetry-storage',
      partialize: (state) => ({
        modules: state.modules,
        entries: state.entries,
      }),
    }

)
);
=======
[Музыкант]: Эталон `apps/client/src/modules/microphone/` остаётся каноническим: модуль через engine добывает MediaStream → hub → плагин подписывается. Перевод подписок из UI-хука в `plugin.install()` для микрофонного плагина — отдельная задача (нужен механизм expose `AnalyserNode` плагина наружу для виджетов audio-data-viz без `MutableRefObject`).

[Верстальщик]: UI не изменён. `MicStreamVizPluginPanel` и `useMicStreamAnalysis` сохраняют контракт.

**Definition of Done:**

- [x] `MembranaRegistry` — единственный путь регистрации.
- [x] Lazy-load на уровне фасада (`registerLazyModule`).
- [x] `clearPendingPrefs` action — клиент не дёргает `setState` напрямую.
- [x] Lifecycle install/teardown реализован.
- [x] Документация снята с «Открытого вопроса».
- [ ] Прогон `yarn typecheck && yarn lint && yarn build` локально (sandbox-агент сделать не может).
- [ ] Commit + push ветки `vesnin` руками: `git add -A && git commit -m "[vesnin] ..." && git push -u origin vesnin`.

**Что осталось как отдельная задача (через `vesnin`):**

1. Перевод `useMicStreamAnalysis` подписки в `plugin.install()`. Нужен механизм expose `AnalyserNode` engine'а виджетам `audio-data-viz` без `MutableRefObject` (например, через event-emitter в плагине или прямой проп `analyserNode: AnalyserNode | null` в виджеты).
2. Unit-тесты на lifecycle: install вызывается один раз, teardown вызывается при deactivate, повторная активация снова зовёт install.
>>>>>>> c8eeaa4 (feat(agenda): registry, plugin lifecycle, client registration)
