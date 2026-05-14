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

[Математик]: —

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
