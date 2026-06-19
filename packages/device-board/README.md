# @membrana/device-board

Визуальный граф обработки сигнала для клиента прибора: ноды — плагины из
`MembranaRegistry`, рёбра — подписки на shared-хабы. Альтернативное
представление того же конвейера, что сейчас настраивается через сайдбар
плагинов.

**Канонический концепт:** [`DEVICE_BOARD_CONCEPT.md`](./DEVICE_BOARD_CONCEPT.md) (v0.4 — signal + scenario).  
**Scenario runtime (onTick, лупы, host):** [`docs/SCENARIO_RUNTIME.md`](../../docs/SCENARIO_RUNTIME.md).

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

## Чего пакет не делает

- Не заменяет сайдбар настроек плагинов — полные параметры остаются там
  (`renderPluginSidebarDetails`).
- Не вводит второй dataflow-движок (Rete `DataflowEngine` и аналоги).
- Не дублирует `MembranaRegistry` — только читает регистрации и `nodeKind`.

## Статус реализации

| Слой | Статус |
| ---- | ------ |
| Концепт, signal + scenario, `@xyflow/react`, хакатон H0–H4 | v0.3 в `DEVICE_BOARD_CONCEPT.md` |
| UI доски, XYFlow, `applyGraph` | **не реализовано** (этап D0) |
| Публичный API в `src/` | **временный каркас** — `DeviceBoardService` / `Device` из раннего скелета; будет заменён или вынесен при D0 |

До этапа D0 не используйте `DeviceBoardService` как модель домена Membrana;
ориентируйтесь на концепт-документ.

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

| Этап | Содержание |
| ---- | ---------- |
| **D0** | Каркас XYFlow, `SocketType` в core, `isValidConnection` |
| **D1** | Микрофонный пресет, клик по ноде → сайдбар |
| **D2** | Решётка 2 mic, `array-2mic.graph.json` |
| **D3** | Локализация, третий источник |
| **D4** | RF, thermal и др. `DeviceKind` |

Подробно — `DEVICE_BOARD_CONCEPT.md` §10.

## Установка (внутри монорепо)

```json
{
  "dependencies": {
    "@membrana/device-board": "*"
  }
}
```

В dev клиент подключает alias на `src/index.ts` (как другие пакеты монорепо).

## Использование (планируемое, D0+)

```ts
// Иллюстрация целевого API — имена и экспорты могут измениться в D0
import { DeviceBoardModule } from '@membrana/device-board';

// Регистрация в apps/client/src/modules/registerClientModules.ts:
// MembranaRegistry.registerLazyModule({
//   id: 'device-board',
//   loader: () => import('@membrana/device-board').then((m) => ({ default: m.DeviceBoardModule })),
// });
```

Пример сериализованного графа — `DEVICE_BOARD_CONCEPT.md` §9.

## Временный API (каркас, до D0)

```ts
import { DeviceBoardService, type Device } from '@membrana/device-board';

const board = new DeviceBoardService();
const result = board.register({ name: 'Probe-01', kind: 'sensor' });
```

> Legacy-заглушка in-memory. Не отражает целевую модель нод-доски.

## Публичное API

Экспортируется из `src/index.ts`. После D0 список экспортов обновится;
актуальные сигнатуры — JSDoc в исходниках и этот README.
