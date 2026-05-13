[Teamlead]: После падения CI из‑за `@typescript-eslint/no-explicit-any` в `@membrana/agenda` типы приведены в порядок без ослабления ESLint.

Сделано в коде:

- **`packages/agenda/src/core/types.ts`**: дефолтный дженерик `Record<string, unknown>` для `ModuleContext`, `Plugin`, `Module`, `ModuleProps`; `getPlugin` возвращает `Plugin | undefined`.
- **`hooks.ts`**: `useModuleProps<TConfig = Record<string, unknown>>`.
- **`store.ts`**: интерфейс `PersistedRehydratePayload` вместо `as any` в `persist.merge`; явные циклы при разборе `plugins` из storage; типизированный `registerModule<TConfig>`; безопасные spread для `config`; `newModules.set(..., module as Module)` для гетерогенной `Map<string, Module>`.
- **`registry.ts`**: `registerPlugin` передаёт в store `plugin as Plugin` (узкий дженерик плагина → общий тип store).
- **`ModulePanel.tsx`**: условие показа конфига через `typeof state.config === 'object'`, без рендера `unknown` как `ReactNode`.

Локально: `yarn workspace @membrana/agenda run lint` и `typecheck`, а также `yarn turbo run lint typecheck --continue` — успешно.

[Структурщик]: Остаточный техдолг — выровнять lifecycle `install()` в store с `MODULE_AND_PLUGIN_UI.md` (отдельная задача), не связанный с `any`.

[Математик]: —

[Музыкант]: —

[Верстальщик]: —

Приоритет: дождаться зелёного прогона обязательного CI на GitHub после push.

Definition of Done: обязательный CI зелёный; `no-explicit-any` остаётся `error`.
