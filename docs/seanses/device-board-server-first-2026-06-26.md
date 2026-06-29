# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-06-26 |
| Команда | консилиум (ручная фиксация + Perplexity research) |
| Файл | `docs/seanses/device-board-server-first-2026-06-26.md` |
| Perplexity | lease-based lock, telemetry/command split, soft vs strict follower (SCADA/IoT) |
| Связано | [`DEVICE_BOARD_SERVER_FIRST.md`](../DEVICE_BOARD_SERVER_FIRST.md) · [`DEVICE_BOARD_REALTIME_RUNTIME_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_REALTIME_RUNTIME_EPIC_PROMPT.md) · MP7b RT0–RT7 |

**Вопрос:**

Спланировать спринт **device-board server-first**: кабинет (сервер) — приоритетный источник правды при редактировании и при «захвате» runtime; полевой клиент — follower. Режимы захвата **мягкий** / **строгий**; управление run/pause/stop/mode с **Узлов**; прослушивание последнего трека журнала с карточки узла.

**Контекст (факты репо):**

- MP7b: канал `runtime` зарезервирован; `run`/`stop`/`setMode` частично в `NodesPage` + `useCabinetNodeRuntime`; **pause** в wire-контракте нет.
- Cabinet `DeviceBoardPage`: fullscreen editor, `showRunControls={false}`, persist через REST.
- View-only UX (`isScenarioViewOnly`) — для `system-preview`; не покрывает «кабинет редактирует → поле смотрит».
- `db-h2d-cabinet-sync` archived; bidirectional sync v1 был, server-first lease — новый слой.
- DB3H-S4 (детекторы) — **не открываем**.

---

# Консилиум: Device-board server-first

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

---

[Teamlead]: Фиксирую продуктовый принцип **server-first**: если кабинет держит **edit lease** на сценарий узла — полевой клиент **не мутирует** граф (view-only структуры). Если кабинет инициировал **capture** (runtime authority = cabinet) — поле исполняет сценарий, но UI follower. Детекторы и DL-3 Studio — вне спринта. Эпик L, фазы SF0–SF9.

[Структурщик]: Архитектурно три оси, не один флаг: (1) **edit lease** — документ сценария; (2) **runtime authority** — кто инициировал run; (3) **follower mode** soft/strict — что полю разрешено в UI. Контракты в `@membrana/core` (ветка `vesnin`), fan-out в `background-cabinet`, UI в `device-board` + `apps/client` + `apps/cabinet`. Не смешивать с `journal` каналом.

[Математик]: Инварианты: (I1) в один момент не более одного edit lease на `(membraneId, deviceId)`; (I2) при `authority=cabinet` поле не вызывает `runtime.start()` локально; (I3) `setMode` идемпотентен; (I4) `pause` не снимает authority. State machine: `idle → running → paused → running → stopped`. Версия документа + lease generation в каждом save.

[Музыкант]: Захват — не про mic capture format, а про **операционный захват runtime** (SCADA command path). Аудио по-прежнему на поле через `audio-engine`; кабинет шлёт только команды. Soft: оператор на поле может **остановить** runaway — pause/stop/mode; strict: только смотрит граф, звук слушает с карточки узла (последний трек). Мониторинг-окно — backlog.

[Верстальщик]: UX: badge «Редактирует кабинет» / «Захват: мягкий|строгий» на device-board; на `NodesPage` — кнопки Пуск/Пауза/Стоп + переключатель normal/alarm + ▶ последний трек. Strict: скрыть run cluster на поле, оставить pan/zoom. DESIGN.md: warning для strict, info для soft.

[Teamlead]: Perplexity: для server-authoritative диаграмм — **lease с TTL**, single writer; для SCADA — разделение telemetry vs command, acknowledged commands. Мы берём lease (не OT/CRDT) для редактирования. Follower soft/strict — как advisory vs safety-critical.

[Структурщик]: Предлагаю канал `board` в MP7 envelope (рядом с `runtime`): `board.edit-lease`, `board.capture-state`. Альтернатива — расширить `runtime.state` полями `authority`, `followerMode`, `leaseHolder`. Голосую за **отдельный `board` channel** — меньше путаницы с tick/phase.

[Математик]: `RuntimeStatePayload` расширить: `isPaused`, `authority: 'cabinet'|'field'`, `followerMode: 'soft'|'strict'|null`. Команды: `pause`, `resume` (опционально v1 только toggle pause). Edit lease payload: `{ holder: 'cabinet'|'field', sessionId, expiresAt, revision }`.

[Музыкант]: При cabinet run с journal-writing сценарием последний трек появляется на узле через существующий `journal.append` — preview на `NodesPage` читает **live journal cache** кабинета (`useCabinetLiveJournal`), не тянет blob по WS. Нужен `readBlob` или signed URL — проверить media REST.

[Верстальщик]: Карточка узла: inline mini-player (HTML audio) для `lastTrack.sampleId` если есть в journal state. Disabled если offline. Не автоплей — кнопка «Прослушать последний трек».

[Teamlead]: Редактирование в кабинете: при входе в `DeviceBoardPage` — `POST .../edit-lease/acquire`; при выходе — release. Поле подписано на WS → `isSessionReadOnly=true` + reason `cabinet-edit`. Конфликт с локальным dirty — autosave reject + toast.

[Структурщик]: Lease храним в `background-cabinet` (Postgres row или Redis backlog — v1 Postgres `NodeScenarioEditLease`). Не в `background-media`. REST + WS broadcast. Field client не acquire lease в v1 — только cabinet edits on server.

[Математик]: Soft follower: разрешённые действия = `{ pause, stop, setMode }` ∩ wire whitelist. Strict: ∅. Проверка в `deviceBoardRuntimeController` и shell `showRunControls` props. Unit matrix на `resolveServerFirstFlags()`.

[Музыкант]: Pause уже в `ScenarioRuntime.pause()` — не хватает wire `pause` command и `isPaused` в state payload. RT2 частично сделан — этот спринт **дополняет** MP7b, не дублирует RT6 layout.

[Верстальщик]: Cabinet board: при активном lease показываем «Вы редактируете»; save enabled. Field: palette hidden, inspector read-only — переиспользуем DB-VO флаги с новым source `cabinet-edit-lease`.

[Teamlead]: Спор: strict блокирует pause на поле? **Да** — только кабинет/NodesPage. Soft — поле может pause/stop/mode. Run с поля при cabinet authority — **запрещён** в обоих режимах.

[Структурщик]: Capture initiation: `runtime.command` с `{ action: 'run', authority: 'cabinet', followerMode: 'soft'|'strict' }` — default soft. Field autonomous (Studio offline) — `authority: 'field'`, followerMode null.

[Математик]: При потере WS lease expires → field может acquire edit (backlog v2). v1: TTL 15 min, renew on cabinet heartbeat в board channel.

[Музыкант]: Smoke: cabinet Run soft → field видит running, может Stop; cabinet Run strict → field run cluster disabled; cabinet edit lease → field view-only; Nodes pause → `isPaused` true на обоих.

[Верстальщик]: NodesPage: добавить **Пауза** между Пуск и Стоп; `resume` = повторный Пуск или отдельная кнопка «Продолжить» когда paused. aria-live на смену mode.

[Teamlead]: Зависимости спринта: **SF1** core после консилиума; параллельно закрыть DB3H-S5 CLOSURE отдельно; **не** стартовать DB3H-S4. MP7b RT0 желателен до SF1 (или SF1 = RT0 расширение).

[Структурщик]: Фазы: SF0 canon → SF1 core → SF2 gateway board → SF3 cabinet lease API → SF4 client follower → SF5 device-board flags → SF6 nodes controls → SF7 last track → SF8 tests → SF9 docs.

[Математик]: Принимаю. DoD SF8: unit + gateway mock + manual smoke checklist в runbook.

[Музыкант]: Принимаю. Out of scope: monitoring window, field-acquire lease, CRDT co-edit.

[Верстальщик]: Принимаю. Copy на русском в runbook и badges.

[Teamlead]: Финал — единая таблица. Спринт `db-server-first-2026-06-26`, реестр `device-board-server-first`.

---

## Итоговое решение

| # | Вопрос | Решение |
|---|--------|---------|
| 1 | Принцип | **Server-first**: кабинет приоритетен для edit + capture authority |
| 2 | Edit lock | **Lease** на `(membraneId, deviceId)`; holder=cabinet → поле **view-only** структуры |
| 3 | Capture | **Runtime authority** `cabinet` \| `field`; не путать с mic capture |
| 4 | Follower soft | Поле: view scenario + **pause/stop/setMode**; run локально запрещён |
| 5 | Follower strict | Поле: **только просмотр** графа; runtime UI скрыт; monitor window — backlog |
| 6 | Wire | Канал **`board`** (lease) + расширить **`runtime`** (pause, authority, followerMode, isPaused) |
| 7 | Хранение lease | `background-cabinet` + REST acquire/release + WS fan-out |
| 8 | NodesPage | Пуск / **Пауза** / Стоп / normal-alarm + **▶ последний трек** журнала |
| 9 | UI reuse | `resolveServerFirstFlags()` поверх DB-VO view-only |
| 10 | MP7b | Спринт **дополняет** RT0–RT2; layout RT6 — отдельно |
| 11 | Out of scope | Детекторы S4, strict monitor window, field edit lease, OT/CRDT |
| 12 | Perplexity | Lease + TTL; telemetry/command split; strict = safety-critical follower |

### Perplexity (кратко)

| Практика | Применение |
|----------|------------|
| Single writer + lease | Edit lease в кабинете |
| Version on save | `revision` в lease + document |
| Command path gated | runtime commands только через WS + ACL |
| Soft vs strict follower | Advisory vs read-only command surface |

---

## Следующий шаг

1. LGTM → [`DEVICE_BOARD_SERVER_FIRST.md`](../DEVICE_BOARD_SERVER_FIRST.md) v1.0  
2. Спринт OPEN + task prompt + registry `device-board-server-first`  
3. SF1 в ветке `vesnin` (core contracts)
