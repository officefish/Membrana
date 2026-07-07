# Диагностика persistent-offline (PCB1)

> Спринт [`presence-capture-board`](../../prompts/PRESENCE_CAPTURE_BOARD_SPRINT_PROMPT.md) · консилиум [`presence-capture-board-2026-07-04.md`](../../seanses/presence-capture-board-2026-07-04.md)

Инструментация WS-жизненного цикла узла для поиска корня: клиент «связан», кабинет держит offline.

## Где смотреть логи

- **Клиент-узел (браузер, песочница 1573):** DevTools Console, префикс `[node-ws]`: `connecting` → `open` → `close {code}` / `reconnect-scheduled`.
- **Кабинет (браузер):** DevTools Console, префикс `[cabinet-ws]`: `connecting` → `open` → `presence.snapshot {onlineDeviceIds, count}` / `presence.nodeOnline {deviceId}` / `presence.nodeOffline` / `close {code}`.
- **Сервер (background-cabinet):** серверные логи, события `node-ws-connect` / `node-ws-authenticate` / `node-ws-register` (+ `... FAIL` на `error`-уровне).

> **Первый прогон (2026-07-04, owner):** клиент-узел показал `connecting → open` без `close`/reconnect — **узел подключается и регистрируется, H1/H3/H4 опровергнуты**. Проблема на стороне отражения в кабинете → смотрим `[cabinet-ws]` (таблица ниже).

## Как читать (маппинг на гипотезы)

| Симптом в логах | Гипотеза | Что значит |
|-----------------|----------|------------|
| Клиент: `close {code: 4401, authFail: true}`, повторяется; сервер: `node-ws-authenticate FAIL` | **H1** | Сессия сопряжения истекла/отозвана. Клиент «связан» по localStorage, но auth на сервере падает → `registerNode` не вызван → кабинету узел не виден. **Фикс: PCB2 (баннер «пересопрячь») + пере-пейринг.** |
| Сервер: есть `node-ws-register`, но кабинет всё равно offline; кабинет подключён **после** узла | остаточный H2 | Проверить presence-снапшот (PL1) доходит; если узел зарегистрировался до рестарта сервера — in-memory обнулился. **Фикс: PCB3 (lastSeenAt на registerNode + bootstrap).** |
| Сервер: `node-ws-register SKIPPED (no mediaDeviceId — H3)` | **H3** | Устройство без `mediaDeviceId` — узел не попадает в `nodeSockets`. Проблема пейринга/устройства. |
| Клиент: только `connecting`, нет `open`; нет `close 4401` | **H4 / сеть** | WS не доходит: неверный dev WS-URL (`getCabinetApiBase`), сервер недоступен, CORS. Не auth. |
| Клиент: `open` есть, но при HMR частые `close {code: 1006}` → `reconnect-scheduled` | H4 (HMR) | Vite hot-reload рвёт WS; при быстром реконнекте кабинет мигает offline. **Фикс: PCB2 дебаунс + PCB3 «виден Ns назад».** |

## Кабинетная сторона (когда узел `open`, но кабинет offline)

| Симптом `[cabinet-ws]` | Причина | Что значит / фикс |
|------------------------|---------|-------------------|
| Нет логов `[cabinet-ws]` вообще | Кабинет не поднял WS | `membraneId` null (данные не загрузились) / страница не монтирует `useCabinetNodeRuntime`. |
| `connecting`, нет `open` | WS кабинета не открывается | Токен/сервер/URL кабинета. |
| `open` + `presence.snapshot {count: 0}`, хотя узел `open` | **Сервер** | Узел зарегистрирован под **другим `membraneId`** (fanOut не совпал), ИЛИ запущенный сервер — **старая сборка без PL1-снапшота**, ИЛИ `registerNode` не выполнился. Сверить `node-ws-register` в серверных логах и membraneId обеих сторон. |
| `presence.snapshot {onlineDeviceIds: [<deviceId узла>]}` или `presence.nodeOnline`, но UI offline | **Фронт кабинета** | Снапшот дошёл, но `onlineDeviceIds`/рендер не совпал (id) — или запущенный фронт кабинета старой сборки. Обновить сборку/страницу. |
| `open`, но ни `snapshot`, ни `nodeOnline` | Сервер не шлёт присутствие | Старая серверная сборка (до PL1) или узел подключился к другому серверу/инстансу. |

**Частая причина после мёржа:** запущенные dev-сборки **сервера и/или фронта кабинета устарели** (стартовали до PL1/PCB1). Перезапустить `background-cabinet` и `apps/cabinet`, затем повторить.

## Процедура

1. Открыть кабинет (страница «Узлы») и клиент (1573, paired) рядом.
2. Перезагрузить клиент, наблюдать `[node-ws]` в консоли клиента и события на сервере.
3. Сопоставить с таблицей → зафиксировать гипотезу здесь (дата, вывод) для PCB2/PCB3.

**Итог диагностики (заполнить после прогона на связке):** _—_
