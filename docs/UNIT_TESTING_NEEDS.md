[Teamlead]: Сейчас в репозитории тестов почти нет: найден только scripts/context-collector-paths.test.mjs. При этом CI уже запускает yarn turbo run lint typecheck test build --continue, но пакеты используют vitest run --passWithNoTests, поэтому тестовый слой пока в основном пустой.

## 🔴 ВЫСОКИЙ ПРИОРИТЕТ — добавлено в ветке `vesnin`

### Тесты на жизненный цикл плагинов (`packages/agenda/src/core/plugin-lifecycle.ts`)

Контракт `Plugin.install()` / teardown теперь реализован в store. Без тестов любая регрессия здесь будет тихо ломать подписки плагинов на shared-хабы и engine-сервисы. Покрыть:

**`invokePluginInstall`:**
- Вызывается ровно один раз при `activatePlugin`. Повторный `activatePlugin` без deactivate — не зовёт install второй раз.
- Вызывается также при `registerPlugin`, если `merged.active === true` (rehydrate-сценарий).
- Корректно строит `ModuleContext`: `moduleId`, `config` (из плагина на момент install), `updateConfig` пробрасывает в `store.updatePluginConfig`, `getPlugin` через store.
- Поддерживает все три формы возврата: `void`, `() => void`, `Promise<void | () => void>`.
- Async install: store ждёт промис до сохранения teardown; если промис отклонён — ошибка логируется через `@membrana/core/logger`, store не падает.
- Если `install` бросил — состояние store не повреждено, плагин помечен active.

**`invokePluginTeardown`:**
- Вызывается при `deactivatePlugin` и при `togglePlugin` (плагин был active → off).
- Вызывается ДО `set` — плагин ещё видит активное состояние.
- Если плагин не был установлен (нет teardown) — no-op без ошибок.
- Async teardown ждётся, ошибки в нём логируются и НЕ пробрасываются.

**Полный сценарий activate → deactivate → activate:**
- Первый install получает teardown.
- deactivate вызывает teardown, удаляет запись.
- Второй activate снова зовёт install — teardown пересоздаётся.

**Persist + rehydrate:**
- После rehydrate с `active: true` плагином, `registerPlugin` зовёт install один раз.
- После rehydrate teardown'ы НЕ переносятся (они и не должны — функции не сериализуются).

### Тесты на `MembranaRegistry` (`packages/agenda/src/core/registry.ts`)

После канонизации фасада тесты обязательны:

- `registerLazyModule({...loader})` оборачивает loader в `React.lazy` и зовёт `store.registerModule` с компонентом-LazyExoticComponent.
- `registerLazyModules([...])` — батч.
- `registerModules([...])` — батч готовых модулей.
- `registerPlugin<TConfig>(moduleId, plugin)` — типобезопасный generic, `Plugin<MicStreamVizPluginConfig>` принимается без `as`.
- `finalizeRegistration()` зовёт `store.clearPendingPrefs()`, после которого `pendingModulePrefs === null`.
- `MembranaRegistry.enableModule` / `disableModule` / `activatePlugin` / `deactivatePlugin` — корректно делегируют в store (со срабатыванием lifecycle).

### Тесты на новый action `clearPendingPrefs`

- После вызова: `pendingModulePrefs === null`, остальные поля state не изменены.
- Идемпотентен: повторный вызов — no-op.

В ежедневный CI: **да, обязательно**. Это критическая инфраструктура регистрации.

---

## Что написать в первую очередь

1. packages/agenda — store/registry tests
   Самый важный пакет сейчас: @membrana/agenda.

Покрыть:

registerModule

сохраняет enabled, config, activePlugins;
накладывает defaultConfig;
корректно применяет pendingModulePrefs.
registerPlugin<TConfig>

принимает типизированный Plugin<MicStreamVizPluginConfig>;
сохраняет active;
при повторной регистрации мержит config;
не теряет предыдущее пользовательское состояние.
activatePlugin / deactivatePlugin / togglePlugin

меняют plugin.active;
синхронизируют module.activePlugins.
persist.merge

читает новый modulePrefs;
читает legacy modules;
не кладёт React-компоненты в persisted state.
В ежедневный CI: да, обязательно.

2. apps/client — регистрация модулей и плагинов
   Покрыть apps/client/src/modules/registerClientModules.ts.

Проверить:

регистрируются FFT, Spectrum, AudioFileUpload, Oscilloscope, Microphone;
microphone получает plugin microphone-stream-viz;
createMicStreamVizPlugin() проходит через прямой store.registerPlugin;
после регистрации pendingModulePrefs сбрасывается.
Это поймало бы свежую проблему с Plugin<MicStreamVizPluginConfig> раньше, если добавить type/build check уже есть, а runtime test подтвердит поведение store.

В ежедневный CI: да.

3. apps/client/src/modules/microphone/microphoneStreamHub.ts
   Очень маленький, но важный тест.

Покрыть:

late subscriber сразу получает последний MediaStream;
late subscriber получает null, если поток уже остановлен;
unsubscribe удаляет listener;
публикация в один moduleId не затрагивает другой.
В ежедневный CI: да.

4. packages/services/fft-analyzer — чистая математика
   Начать с src/math/\*:

fft.ts
metrics.ts
statistics.ts
Проверить на фиксированных входах:

zero signal;
constant signal;
simple sine-like buffer;
RMS;
spectral centroid;
threshold detection;
edge cases: пустой массив, маленький буфер, некорректный window size.
В ежедневный CI: да, это быстрые deterministic unit tests.

5. apps/client/src/plugins/microphone-stream-viz/types.ts
   Покрыть resolveMicStreamVizConfig.

Проверить:

undefined → default config;
частичный config → default + override;
неправильные типы игнорируются;
все boolean-флаги сохраняются.
В ежедневный CI: да.

Что добавить в CI прямо сейчас
Текущий CI уже делает:

yarn turbo run lint typecheck test build --continue
Я бы добавил отдельным шагом:

yarn test:scripts
Потому что scripts/context-collector-paths.test.mjs сейчас живёт на root-уровне и не входит в workspace turbo run test.

Итого daily CI:

yarn install --immutable
yarn test:scripts
yarn turbo run lint typecheck test build --continue
Что НЕ включать в ежедневный CI пока
реальные тесты микрофона через браузерные permissions;
реальные Web Audio integration tests;
Anthropic/API code-review;
E2E с настоящим устройством ввода.
Это лучше вынести в manual или scheduled workflow позже.

Мой рекомендуемый порядок
@membrana/agenda store tests.
apps/client registration smoke test.
microphoneStreamHub replay tests.
fft-analyzer math tests.
resolveMicStreamVizConfig tests.
Добавить yarn test:scripts в CI.
Итог: в ежедневный CI включать все быстрые unit/integration tests без браузерных permissions и внешних API.
