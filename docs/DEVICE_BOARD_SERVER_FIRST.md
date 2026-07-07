# Device-board server-first — канон

| Поле | Значение |
|------|----------|
| **Версия** | 2.0 (консилиум 2026-07-02) — **явный захват устройства (тариф v2)** |
| **Консилиум v2** | [`seanses/device-board-capture-tariff-v2-2026-07-02.md`](./seanses/device-board-capture-tariff-v2-2026-07-02.md) · бриф: [`DEVICE_BOARD_CAPTURE_TARIFF_BRIEF.md`](./DEVICE_BOARD_CAPTURE_TARIFF_BRIEF.md) |
| **Консилиум v1** | [`seanses/device-board-server-first-2026-06-26.md`](./seanses/device-board-server-first-2026-06-26.md) (архив модели: неявный run=capture, edit-lease, pause) |
| **Спринт** | `db-capture-tariff-v2-2026-07-02` (registry epic `device-board-capture-tariff-v2`) |
| **Скоуп v2** | **cabinet ↔ `apps/client`**. Настольная Studio — отдельный спринт |
| **Связано** | [`SCENARIO_RUNTIME.md`](./SCENARIO_RUNTIME.md) · [`MEMBRANE_PLATFORM.md`](./MEMBRANE_PLATFORM.md) · MP7b [`DEVICE_BOARD_REALTIME_RUNTIME_EPIC_PROMPT.md`](./prompts/DEVICE_BOARD_REALTIME_RUNTIME_EPIC_PROMPT.md) |

## 1. Принцип v2: явный захват

1. **Пока устройство не захвачено — у сервера нет никакого контроля** над устройством и его сценариями. Захват — **явный двухшаговый процесс**: (1) захватить устройство → (2) выбрать и запустить сценарий. Захват НЕ является побочным эффектом `run` (ревизия v1).
2. **После захвата** кабинет может **выбрать существующий пользовательский сценарий, запустить и остановить** его — из списка устройств (Узлы) и из борда. Ничего больше в этом тарифе.
3. **Редактирование, пауза/отладка, setMode с сервера — тариф v3.** Создание сценария с сервера невозможно ни в каком тарифе v2.
4. **Клиент без захвата полностью автономен** — редактирует и запускает свои сценарии локально.

---

## 2. Оси состояния v2

| Ось | Назначение | Значения |
|-----|------------|----------|
| **`capture`** | Захват устройства сервером | `{ holder: 'cabinet' \| null, mode: 'soft' \| 'hard' \| null, sessionId, acquiredAt, expiresAt }` |
| **`authority`** | Чья команда `run` выполнялась последней | `cabinet \| field` |
| ~~`editLease`~~ | **Удалено из v2** (тариф v3) | — |

Состояния:

| Состояние | capture | Клиент может |
|-----------|---------|--------------|
| **Отпущено** | `holder=null` | всё локально (edit, run, stop) |
| **Захват мягкий** | `holder='cabinet'`, `mode='soft'` | **start/stop** сценариев; edit и пауза заблокированы |
| **Захват жёсткий** | `holder='cabinet'`, `mode='hard'` | **только просмотр** + локальный **emergency stop** |

---

## 3. Жизненный цикл захвата

- **Acquire:** кабинет → `board.capture { mode, sessionId, expiresAt }`; клиент обновляет store, UI показывает захват.
- **Heartbeat:** сервер шлёт каждые **2 мин**, продлевая `expiresAt` (**TTL 5 мин**).
- **Auto-release:** клиент не слышит heartbeat 5 мин (разрыв WS, рестарт сервера) → `capture.holder=null`, автономия восстанавливается. Восстановление WS до TTL сбрасывает таймер. На время ожидания — badge «Соединение потеряно» (без countdown).
- **Release:** `board.release` = **отпущение управления, не стоп**: играющий сценарий продолжает играть до локального stop. Клиенту — toast info «Управление устройством отпущено».

### 3.1 Вытеснение (pre-emption)

Клиент запустил сценарий без захвата → сервер захватывает:

1. Сервер шлёт `stop { fadeOutMs: 200 }` — **graceful fade-out**, не hard-cut.
2. Клиенту — **активный alert** (toast `alert-warning`, закрывается вручную): «Сервер захватил управление, сценарий остановлен».
3. Устройство становится ведомым согласно `capture.mode`.

### 3.2 Конкуренция run при мягком захвате

**Last-write-win:** последний `run` (с любой стороны) побеждает, проигравший сценарий останавливается (`stop` перед `run`). При жёстком захвате `run` доступен только серверу.

### 3.3 Emergency stop (инвариант)

**`stop()` на клиенте доступен всегда**, даже при `mode='hard'`. На уровне `audio-engine` нет проверок permissions/захвата — флаги захвата существуют только в UI (блокировка кнопок) и в gateway (whitelist команд). Emergency stop клиента = `stop { fadeOutMs: 0 }` (hard-cut). Обоснование: SCADA-практика — локальный аварийный останов не отключается никогда.

### 3.4 Единый runtime клиента (CSR, спринт `capture-shared-runtime`)

**Инвариант:** под связью борд и realtime-мост делят **один** `ScenarioRuntime`.

Ранее на клиенте жили **два независимых** инстанса — runtime доски
(`DeviceBoardGraphProvider`) и singleton `DeviceBoardRuntimeController`
(realtime-мост, эмитит `runtime.state` + журнал на сервер). Кнопки борда правили
не тот инстанс: сервер их не видел, а команда кабинета крутила инстанс, которого
борд не показывал → «кнопки не влияют / не синхронизированы» (прод-находка
владельца 2026-07-07).

**Фикс (CSR1):** App под pairing передаёт борду runtime контроллера
(`externalRuntime`, общий host). Борд использует его и **не уничтожает** при
размонтировании (сценарий может идти headless — устройство пишет журнал на сервер).

**Две независимые оси:**
- **Сопряжение** решает синк с сервером (журнал + `runtime.state`) — идёт **всегда**,
  захвачено устройство или нет. Сопряжён-но-не-захвачен = полный локальный контроль
  + кабинет наблюдает.
- **Захват** решает только матрицу управления (кнопки), синк не трогает.

**Матрица кнопок под захватом (CSR2)** — чистая функция
`resolveCapturePlaybackMatrix(captured, captureMode, isRunning)`:

| Состояние | Клиент |
|-----------|--------|
| Сопряжён, не захвачен | play/stop/pause (полный) |
| Захват, работает | только **Stop** (пауза заблокирована) |
| Захват soft, остановлен | **Start** |
| Захват hard, остановлен | ничего (ведомый; emergency stop при работе) |

Пауза под захватом заблокирована **всегда** (тариф v3) — кнопка `disabled` с
подсказкой; §3.3 (emergency stop) неприкосновенен.

---

## 4. Enforcement тарифа — server-side

Тарифные ограничения проверяются **в gateway (`background-cabinet`) по whitelist команд**; скрытие кнопок в UI — вторичная косметика, не защита. Команда вне whitelist → reject 403.

### 4.1 Команды кабинета (оба режима захвата одинаковы)

| Команда | v2 | v3 (будущий) |
|---------|----|--------------|
| `capture` / `release` / `heartbeat` | ✅ | ✅ |
| `selectScenario` | ✅ | ✅ |
| `run` | ✅ | ✅ |
| `stop { fadeOutMs }` | ✅ | ✅ |
| `pause` / `resume` | ❌ | ✅ |
| `setMode` (normal/alarm) | ❌ | ✅ |
| edit-lease / мутации графа | ❌ | ✅ |

### 4.2 Действия поля (клиента) по режиму

| Действие клиента | Отпущено | Мягкий | Жёсткий |
|------------------|----------|--------|---------|
| Run локального сценария | ✅ | ✅ (last-write-win) | ❌ |
| Stop | ✅ | ✅ | ✅ **(только emergency)** |
| Edit графа | ✅ | ❌ | ❌ |
| Пауза | ✅ | ❌ | ❌ |

Двойная защита: UI блокирует кнопки по store (`capture.mode`), gateway отклоняет обходные вызовы (race WS-latency покрыт reject'ом).

---

## 5. Выбор сценария с сервера

- Read-only path: `getScenarios()` — сервер читает **список существующих** сценариев устройства (id, имя, метка).
- Кабинет показывает dropdown → `selectScenario(id)` → `run(id)`.
- **Никаких** write-методов сценария из кабинета в этом тарифе.

---

## 6. Wire

**Канал `board`** (переиспользуем, event type дифференцирует):

```ts
board.event:
  | { type: 'capture', holder: 'cabinet', mode: 'soft'|'hard', sessionId, acquiredAt, expiresAt }
  | { type: 'heartbeat', sessionId, expiresAt }
  | { type: 'release', reason?: 'operator'|'ttl-expired'|'server-restart' }
```

**Канал `runtime`** (сокращение v1): `selectScenario`, `run`, `stop { fadeOutMs?: number }`. События `pause`, `resume`, `setMode` — **удалены из wire** (v3). `followerMode` удалён — заменён на `capture.mode`, без переименований в оставшемся коде.

---

## 7. UI / индикация (DESIGN.md)

| Состояние | Badge | Стиль |
|-----------|-------|-------|
| Отпущено | «Отпущено» | серый |
| Мягкий захват | «Захват: мягкий» | `badge-info` |
| Жёсткий захват | «Захват: жёсткий» | `badge-warning` |
| WS потеряна, TTL идёт | «Соединение потеряно» | `badge-warning`, временный |

- Badge на **NodesPage** и на **борде**; `aria-live="polite"` на смену состояния.
- Вытеснение: toast `alert-warning` с иконкой ⚠ и ручным закрытием (не modal).
- Кнопки play/stop на поле: `disabled` при `mode='hard'`.

---

## 8. Пакеты

| Слой | Путь |
|------|------|
| Контракты | `packages/core` — `board.capture/release/heartbeat`, `stop { fadeOutMs }` |
| Gateway + capture store | `packages/background-cabinet` — lifecycle, heartbeat loop, whitelist |
| UI graph | `packages/device-board` — флаги захвата (ревизия `resolveServerFirstFlags()`) |
| Поле | `apps/client` — store `capture`, enforcement, TTL-таймер, alert |
| Кабинет | `apps/cabinet` — capture/release UI, scenario selector, NodesPage |

**Запрещено:** permissions-проверки в `audio-engine`; capture-состояние в media; бизнес-логика runtime в gateway.

---

## 9. Cleanup v1 → v2

Код v1 (edit-lease, pause/resume, setMode) — **удалить из wire и gateway**, в остальном коде закомментировать с пометкой `// Tariff v3: edit-lease, pause/resume, setMode`. Тесты pause → skip с пометкой `tariff=v3`. Git-история сохраняет реализацию. Задача: фаза CT7 спринта.

---

## 10. Out of scope (v2)

- **Настольная Studio** — подгонка отдельным спринтом (v2 добивается корректной работы cabinet ↔ `apps/client`)
- Редактирование/пауза/отладка/setMode с сервера (тариф v3)
- Создание сценария с сервера
- Field-acquire edit lease, OT/CRDT
- Strict monitoring window
- DB3H-S4 детекторы

---

## 11. Smoke checklist

Runbook (prod E2E, CT8): [`actions/device-board/smoke/DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md`](./actions/device-board/smoke/DEVICE_BOARD_CAPTURE_TARIFF_V2_SMOKE.md)

```text
[ ] Без захвата: сервер не может run/stop (reject), клиент полностью автономен
[ ] Захват мягкий → клиент может play/stop, edit/пауза заблокированы
[ ] Захват мягкий → жёсткий: клиент теряет управление, кнопки disabled
[ ] Клиент играет без захвата → сервер захватывает → fade-out 200ms + alert + ведомость
[ ] Emergency stop при жёстком захвате работает (fadeOutMs=0)
[ ] Release при играющем сценарии: звук продолжает играть, toast info
[ ] WS разорвана → badge «Соединение потеряно» → 5 мин → auto-release, автономия
[ ] Gateway whitelist: pause при любом захвате → 403
[ ] getScenarios(): dropdown в кабинете, select+run существующего сценария
[ ] CSR: пуск с кабинета → борд показывает «Работает», доступен Stop
[ ] CSR: Stop/Start с клиента под захватом → кабинет видит смену состояния
[ ] CSR: сопряжён-но-не-захвачен → сценарий с борда пишет журнал на сервер
[ ] CSR: пауза под захватом — кнопка disabled с подсказкой; emergency stop работает
[ ] CSR: без связи (autonomous) — полный локальный контроль, без регрессий
[ ] yarn turbo lint typecheck test build
```

---

## 12. Ссылки

| Документ | Зачем |
|----------|--------|
| [`DEVICE_BOARD_CAPTURE_TARIFF_V2_SPRINT_PROMPT.md`](./prompts/DEVICE_BOARD_CAPTURE_TARIFF_V2_SPRINT_PROMPT.md) | Фазы CT0–CT9 |
| [`CAPTURE_SHARED_RUNTIME_SPRINT_PROMPT.md`](./prompts/CAPTURE_SHARED_RUNTIME_SPRINT_PROMPT.md) | CSR1–CSR3: единый runtime + матрица кнопок (§3.4) |
| [`DEVICE_BOARD_CAPTURE_TARIFF_BRIEF.md`](./DEVICE_BOARD_CAPTURE_TARIFF_BRIEF.md) | Бриф консилиума (требования D1–D10, OQ1–OQ10) |
| [`DEVICE_BOARD_SERVER_FIRST_SPRINT_PROMPT.md`](./prompts/DEVICE_BOARD_SERVER_FIRST_SPRINT_PROMPT.md) | v1 (архив модели) |
| [`DEVICE_BOARD_VIEW_ONLY_UX_EPIC_PROMPT.md`](./prompts/DEVICE_BOARD_VIEW_ONLY_UX_EPIC_PROMPT.md) | View-only UX reuse |
