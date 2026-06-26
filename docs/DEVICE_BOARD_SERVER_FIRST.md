# Device-board server-first — канон

| Поле | Значение |
|------|----------|
| **Версия** | 1.0 (консилиум 2026-06-26) |
| **Консилиум** | [`seanses/device-board-server-first-2026-06-26.md`](./seanses/device-board-server-first-2026-06-26.md) |
| **Спринт** | `device-board-server-first` |
| **Связано** | [`SCENARIO_RUNTIME.md`](./SCENARIO_RUNTIME.md) · [`MEMBRANE_PLATFORM.md`](./MEMBRANE_PLATFORM.md) · MP7b [`DEVICE_BOARD_REALTIME_RUNTIME_EPIC_PROMPT.md`](./prompts/DEVICE_BOARD_REALTIME_RUNTIME_EPIC_PROMPT.md) |

## 1. Принцип server-first

1. **Редактирование сценария** — приоритет у **кабинета** (сервер), когда активен **edit lease**.
2. **Исполнение runtime** — при **capture authority = cabinet** команды инициирует кабинет; полевой клиент — **follower**.
3. **Поле (Studio / client)** — может работать автономно (`authority = field`) без lease кабинета.

Поле **не** отменяет server-first: при активном lease/capture оно подчиняется состоянию с сервера.

---

## 2. Три оси состояния

| Ось | Назначение | Значения |
|-----|------------|----------|
| **Edit lease** | Кто может менять граф сценария | `holder: cabinet \| field \| none` |
| **Runtime authority** | Кто инициировал run | `cabinet \| field` |
| **Follower mode** | Что разрешено полю при `authority=cabinet` | `soft \| strict \| null` |

`followerMode` имеет смысл только при `authority=cabinet`.

---

## 3. Edit lease

- **Один** lease на пару `(membraneId, deviceId)`.
- Кабинет: `acquire` при входе в редактор доски, `release` при выходе.
- Поле при `holder=cabinet`: **view-only** структуры (palette/CRUD off, pan/zoom on) — см. DB-VO.
- TTL v1: 15 мин, renew heartbeat из кабинета (backlog деталей в SF3).
- Сохранение с поля при чужом lease: **отклоняется** (409 + WS notify).

**Канал:** `board` · события `board.edit-lease`, `board.capture-state` (`NODE_REALTIME_EVENT_TYPES.board`).

---

## 4. Capture (runtime authority)

**Захват** — операционный захват **runtime**, не формат mic capture.

### 4.1 Инициация

| Источник | authority | followerMode |
|----------|-----------|--------------|
| `NodesPage` / cabinet Run | `cabinet` | `soft` (default) или `strict` |
| Поле autonomous Run | `field` | `null` |

### 4.2 Follower soft

Поле **не** может: Run, edit graph (если + lease), менять сценарий.

Поле **может**: **Pause**, **Stop**, **setMode** (normal/alarm).

### 4.3 Follower strict

Поле **только** просмотр графа (viewport). Runtime controls **скрыты**. Окно мониторинга — backlog.

### 4.4 Команды runtime (cabinet → node)

Wire-контракт: `@membrana/core` SF1 — `RuntimeCommandPayload`, `parseRuntimeCommandPayload`.

| action | Описание |
|--------|----------|
| `run` | Старт (+ `authority`, `followerMode` в payload) |
| `stop` | Стоп |
| `pause` | Пауза exec |
| `resume` | Продолжение (v1: или повторный run после pause) |
| `setMode` | normal / alarm override |

**Канал:** `runtime` (расширение MP7b).

---

## 5. Узлы (cabinet `NodesPage`)

На карточке узла:

- **Пуск** / **Пауза** / **Стоп**
- Переключатель **Обычный** / **Тревога** (когда running)
- **Прослушать последний трек** — если сценарий пишет в journal, из live journal cache (без autoplay)
- Ссылки: Журнал, Доска, Ключи

Визуал: running-normal — info pulse; alarm — warning border (MP7b RT5).

---

## 6. Пакеты

| Слой | Путь |
|------|------|
| Контракты | `packages/core` — `board.*`, расширенный `runtime.*` |
| Gateway | `packages/background-cabinet` — lease store, fan-out |
| UI graph | `packages/device-board` — `resolveServerFirstFlags()` |
| Поле | `apps/client` — follower enforcement |
| Кабинет | `apps/cabinet` — lease API, NodesPage |

**Запрещено:** lease в media; Web Audio вне `audio-engine`; бизнес-logic runtime в gateway.

---

## 7. Out of scope (v1)

- DB3H-S4 детекторы
- Strict monitoring window (отдельный UI)
- Field-acquire edit lease
- OT/CRDT co-editing
- Сырой audio stream в кабинет

---

## 8. Smoke checklist

**Локально:** unit + gateway mock + green CI. **E2E — только на проде** после деплоя cabinet (см. [`DEVICE_BOARD_SERVER_FIRST_SMOKE.md`](./device-board-scripts/DEVICE_BOARD_SERVER_FIRST_SMOKE.md), [`day-sprint/db-server-first-2026-06-26/DEPLOY.md`](./day-sprint/db-server-first-2026-06-26/DEPLOY.md)).

```text
[ ] Cabinet acquire lease → field board view-only
[ ] Cabinet release → field can edit (if not strict capture)
[ ] Cabinet Run soft → field pause/stop/mode OK; local run blocked
[ ] Cabinet Run strict → field no runtime buttons
[ ] Nodes pause ↔ field ScenarioRuntime paused
[ ] Last track play on node card when journal has track
[ ] yarn turbo lint typecheck test build
```

---

## 9. Ссылки

| Документ | Зачем |
|----------|--------|
| [`DEVICE_BOARD_SERVER_FIRST_SPRINT_PROMPT.md`](./prompts/DEVICE_BOARD_SERVER_FIRST_SPRINT_PROMPT.md) | Фазы SF0–SF9 |
| [`DEVICE_BOARD_VIEW_ONLY_UX_EPIC_PROMPT.md`](./prompts/DEVICE_BOARD_VIEW_ONLY_UX_EPIC_PROMPT.md) | View-only UX reuse |
| [`STUDIO_HOST_BRIDGE_CONTRACT.md`](./STUDIO_HOST_BRIDGE_CONTRACT.md) | Studio host (не в v1 scope) |
