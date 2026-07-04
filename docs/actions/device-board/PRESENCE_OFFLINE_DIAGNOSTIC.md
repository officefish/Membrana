# Диагностика persistent-offline (PCB1)

> Спринт [`presence-capture-board`](../../prompts/PRESENCE_CAPTURE_BOARD_SPRINT_PROMPT.md) · консилиум [`presence-capture-board-2026-07-04.md`](../../seanses/presence-capture-board-2026-07-04.md)

Инструментация WS-жизненного цикла узла для поиска корня: клиент «связан», кабинет держит offline.

## Где смотреть логи

- **Клиент (браузер, песочница 1573):** DevTools Console, префикс `[node-ws]`: `connecting` → `open` → `close {code}` / `reconnect-scheduled`.
- **Сервер (background-cabinet):** серверные логи, события `node-ws-connect` / `node-ws-authenticate` / `node-ws-register` (+ `... FAIL` на `error`-уровне).

## Как читать (маппинг на гипотезы)

| Симптом в логах | Гипотеза | Что значит |
|-----------------|----------|------------|
| Клиент: `close {code: 4401, authFail: true}`, повторяется; сервер: `node-ws-authenticate FAIL` | **H1** | Сессия сопряжения истекла/отозвана. Клиент «связан» по localStorage, но auth на сервере падает → `registerNode` не вызван → кабинету узел не виден. **Фикс: PCB2 (баннер «пересопрячь») + пере-пейринг.** |
| Сервер: есть `node-ws-register`, но кабинет всё равно offline; кабинет подключён **после** узла | остаточный H2 | Проверить presence-снапшот (PL1) доходит; если узел зарегистрировался до рестарта сервера — in-memory обнулился. **Фикс: PCB3 (lastSeenAt на registerNode + bootstrap).** |
| Сервер: `node-ws-register SKIPPED (no mediaDeviceId — H3)` | **H3** | Устройство без `mediaDeviceId` — узел не попадает в `nodeSockets`. Проблема пейринга/устройства. |
| Клиент: только `connecting`, нет `open`; нет `close 4401` | **H4 / сеть** | WS не доходит: неверный dev WS-URL (`getCabinetApiBase`), сервер недоступен, CORS. Не auth. |
| Клиент: `open` есть, но при HMR частые `close {code: 1006}` → `reconnect-scheduled` | H4 (HMR) | Vite hot-reload рвёт WS; при быстром реконнекте кабинет мигает offline. **Фикс: PCB2 дебаунс + PCB3 «виден Ns назад».** |

## Процедура

1. Открыть кабинет (страница «Узлы») и клиент (1573, paired) рядом.
2. Перезагрузить клиент, наблюдать `[node-ws]` в консоли клиента и события на сервере.
3. Сопоставить с таблицей → зафиксировать гипотезу здесь (дата, вывод) для PCB2/PCB3.

**Итог диагностики (заполнить после прогона на связке):** _—_
