# @membrana/device-board

Визуальный граф обработки сигнала для клиента прибора: ноды — плагины из
`MembranaRegistry`, рёбра — подписки на shared-хабы. Альтернативное
представление того же конвейера, что сейчас настраивается через сайдбар
плагинов.

**Канонический концепт:** [`DEVICE_BOARD_CONCEPT.md`](./DEVICE_BOARD_CONCEPT.md) (v0.10 — §22 user workspace, §21 edit model).  
**Scenario runtime (onTick, лупы, host):** [`docs/SCENARIO_RUNTIME.md`](../../docs/SCENARIO_RUNTIME.md).  
**Операторская документация (Mintlify):** [`apps/docs`](../../apps/docs/README.md) — `yarn docs:dev` · [User Workspace](../../apps/docs/device-board/user-workspace.mdx) · [UserCases](../../apps/docs/device-board/usercases.mdx).

См. также: [`ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) §1f,
[`MODULE_AND_PLUGIN_UI.md`](../../docs/MODULE_AND_PLUGIN_UI.md) §3.1.

## Что делает пакет (целевое назначение)

- **Нод-доска** — React-модуль на `@xyflow/react`: топология захват → аналайзеры →
  `ObservationEmitter` видна оператору.
- **View-only** — библиотека **не** исполняет граф; данные текут через
  `audio-engine-service`, shared-хабы и `plugin.install` / teardown (как сейчас).
- **Сериализация** — JSON графа (позиции нод, `pluginId`, handles рёбер);
  конфиг плагинов в графе не дублируется.
- **Пресеты** — `*.graph.json` по `DeviceKind` (например `Mic → FFT → Detector → Emitter`).
- **Валидация** — типы сокетов из `@membrana/core` (`SocketType`), проверка
  соединений через `isValidConnection`.
- **UserCases (U9)** — bundled каталог готовых сценариев: preview RO + клон в user workspace (U10).
- **User workspace (U10)** — до N редактируемых слотов per `deviceId`; IndexedDB + module launcher.

## User workspace (U10)

| Компонент | Путь |
| --------- | ---- |
| Launcher UI | `apps/client/.../DeviceBoardLauncher.tsx` |
| IndexedDB store | `apps/client/.../device-board-workspace-store.ts` |
| Persist active slot | `apps/client/.../device-board-workspace-persist.ts` |
| Session types | `src/types/device-board-session.ts` |
| Clone catalog → slot | `src/graph/clone-user-case-to-workspace.ts` |
| Migrate guard | `src/graph/device-scenario-workspace.ts` |

Оператор: [`user-workspace.mdx`](../../apps/docs/device-board/user-workspace.mdx). Квота: [`TARIFF_MATRIX.md`](../../docs/TARIFF_MATRIX.md).

## UserCases catalog (U9)

| Компонент | Путь |
| --------- | ---- |
| Bundled index | `src/catalog/user-case-catalog.ts` |
| Apply-all | `src/graph/apply-user-case.ts` |
| Layout canon | `src/graph/usercase-layout-canon.ts` |
| Board picker (legacy) | `src/components/board-usercase-picker-modal.tsx` |
| Client entitlement | `@membrana/usercase-catalog-service` |

```bash
yarn usercase:build usercase-mvp-microphone
yarn usercase:verify-kinds usercase-mvp-microphone
yarn usercase:verify-layout usercase-mvp-microphone
```

Подробно: `DEVICE_BOARD_CONCEPT.md` §20 · оператор — `apps/docs/device-board/usercases.mdx`.

## Edit & navigation (v0.9, PR #139/#140)

Кратко; канон — `DEVICE_BOARD_CONCEPT.md` **§21**.

| Возможность | Поведение |
| ----------- | --------- |
| **Save / dirty** | Сценарий сохраняется вручную; `isDirty` до Save |
| **F7 branch snapshot** | Dirty handler → switch tab → откат к последнему сохранённому document |
| **Undo depth-1** | Ctrl+Z / кнопка ↶; delete, pins, collapse, align, clear branch — **не** drag |
| **Function UX** | Inline editor на `function` branch; breadcrumbs; pin meter `n/9` |
| **Navigation** | `navigateScenarioBranch` + `revert-if-dirty` vs `keep-dirty` (fn switch) |
| **Runtime** | Exec-chain highlight при Run |

| Модуль | Путь |
| ------ | ---- |
| Navigation policy | `src/graph/branch-navigation.ts` |
| Undo controller | `src/graph/edit-undo-controller.ts` |
| Integration tests | `src/context/device-board-nav.integration.test.tsx` |

## Чего пакет не делает

- Не заменяет сайдбар настроек плагинов — полные параметры остаются там
  (`renderPluginSidebarDetails`).
- Не вводит второй dataflow-движок (Rete `DataflowEngine` и аналоги).
- Не дублирует `MembranaRegistry` — только читает регистрации и `nodeKind`.

## Статус реализации

| Слой | Статус |
| ---- | ------ |
| Signal + scenario graph, runtime, persist | **реализовано** (хакатон H0–H4, v0.4–v0.8) |
| User functions, groups, align, UserCases (U8–U9), User workspace (U10) | **реализовано** — CONCEPT §18–§22 |
| Function editor, undo, branch navigation (post-#140) | **реализовано** — CONCEPT §21 |
| XYFlow shell, validation, export/import | **реализовано** — `device-board-shell`, `graph/*` |

Публичный API: `DeviceBoardGraphProvider`, `useDeviceBoardGraph`, scenario runtime — `src/index.ts`.
Legacy `DeviceBoardService` / `Device` — ранняя заглушка; не использовать для новых интеграций.

## Архитектурное место

- **Зависимости:** только `@membrana/core` (план: `@xyflow/react` при D0).
- **Не зависит от:** `@membrana/agenda`, `packages/services/*`, `apps/client`.
- **Потребители:** `apps/client` (lazy-модуль через `MembranaRegistry`).

Границы пакетов — [`ARCHITECTURE.md`](../../docs/ARCHITECTURE.md).

## UI-стек (зафиксировано)

**`@xyflow/react`** (React Flow / XYFlow). Отклонены для этого пакета: Rete.js
(второй runtime), Node-RED editor, Blockly, GoJS/JointJS, LiteGraph.
Обоснование — [`DEVICE_BOARD_CONCEPT.md`](./DEVICE_BOARD_CONCEPT.md) §4.

## Дорожная карта (кратко)

Исторические этапы D0–D4 — `DEVICE_BOARD_CONCEPT.md` §10. Актуальные эпики — `docs/prompts/` и `docs/tasks/README.md`.

| Направление | Статус |
| ----------- | ------ |
| Mintlify operator docs | эпик `db-doc-v04-mvp` + sprint `device-board-docs-post-140-sprint` (D2) |
| Scoped undo / drag undo | backlog (§21.6) |

## Установка (внутри монорепо)

```json
{
  "dependencies": {
    "@membrana/device-board": "*"
  }
}
```

В dev клиент подключает alias на `src/index.ts` (как другие пакеты монорепо).

## Использование

```tsx
import { DeviceBoardShell, DeviceBoardGraphProvider } from '@membrana/device-board';

// Полный shell (client / cabinet board mode):
// <DeviceBoardShell runtimeHost={host} persistAdapter={adapter} />

// Или только graph context для встраивания:
// <DeviceBoardGraphProvider><YourCanvas /></DeviceBoardGraphProvider>
```

Регистрация модуля client: `MembranaRegistry.registerLazyModule({ id: 'device-board', ... })`.

## Публичное API

Экспортируется из `src/index.ts`: graph provider, shell, scenario runtime types, catalog helpers.
Актуальные сигнатуры — JSDoc в исходниках, этот README и `DEVICE_BOARD_CONCEPT.md`.

## Tailwind Integration

Пакет экспортирует React-компоненты с Tailwind/daisyUI-классами, но **не поставляет
собственный CSS-дистрибутив** (headless). Хост-приложение обязано сканировать `src/`
этого пакета в своём `tailwind.config` `content`, иначе утилиты не попадут в CSS и
вёрстка узлов/канваса разъедется (см. `docs/prompts/TAILWIND_COVERAGE_HARDENING_PROMPT.md`).

<!-- tailwind-content: ["./src/**/*.{ts,tsx}"] -->
