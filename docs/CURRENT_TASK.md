[Teamlead]: После 692980a CI падал на **`@membrana/client#build`**: `Plugin<MicStreamVizPluginConfig>` не укладывался в `registerPlugin(..., plugin: Plugin)` (= `Plugin<Record<string, unknown>>`), т.к. клиент вызывает `useMembranaStore.getState().registerPlugin` напрямую.

**Исправление:** в `MembranaState` и реализации store объявлено  
`registerPlugin: <TConfig>(moduleId: string, plugin: Plugin<TConfig>) => void`  
Внутри store при записи в `Map<string, Plugin>` по-прежнему выполняется приведение к общему `Plugin` (эрasure в рантайме тот же). `MembranaRegistry.registerPlugin` вызывает store без лишнего `as Plugin`.

Проверка: `yarn workspace @membrana/client run build` — успешно; для полного CI имеет смысл прогнать `yarn turbo run lint typecheck test build --continue`.

[Структурщик]: Публичный API store теперь согласован с вызовом из `registerClientModules.ts`.

[Математик]: —

[Музыкант]: —

[Верстальщик]: —

Отложено (отдельная задача): вызов `plugin.install()` из store при toggle/activate.

Definition of Done: обязательный CI зелёный после merge.
