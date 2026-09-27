# ADR-0030 — Вещдок прогона scenario trace

> **Статус:** DRAFT · 2026-09-27
> **merge файла ≠ принятие решения** пока статус DRAFT — решения действуют после LGTM владельца.

## Контекст

Issue #2476: после живого прогона 26.09 владелец всё ещё видит фризы при остановке записи или выходе из борда. #2339 уже схлопнул пробуждения подписчиков до кадра и помог потоку в установившемся режиме: 2.5 часа наполнения буфера прошли без жалоб на отзывчивость. Оставшаяся гипотеза — не поток, а одноразовая разборка накопленного вещдока в конце.

Обстановка замера владельца: 1057 проб, 486.7/512 МБ, trace упёрт в потолок 10 000 строк в обоих снимках. Граница этого ADR: продуктовый код клиента не меняется; фиксируется измерительный прибор, факты кода и развилка устройства trace.

## Замер

Прибор: `node scripts/measure-scenario-trace-teardown.mjs --repeats 120 --warmup 12 --subscribers 1`. Он синтетически наполняет модель текущего `scenarioTraceBuffer` теми же операциями (`push`, cap через `splice`, snapshot через `slice`, text через `join`, sync sink через `flushScenarioTrace`) и мерит финальную разборку. Проверка прибора: `node --test scripts/scenario-trace-teardown-measure.test.mjs`.

Среда: Node v25.6.1, Windows x64. Важно: это нижняя оценка renderer-cost; реальный Electron IPC/FS в `window.electronAPI.shellLog.flushScenarioTrace` может добавить хвост.

| Строк | stop recording median/p95 ms | exit/unload persist median/p95 ms | clear median/p95 ms | snapshot median/p95 ms | persist bytes |
|------:|-----------------------------:|----------------------------------:|-------------------:|----------------------:|--------------:|
| 100 | 0.012 / 0.028 | 0.011 / 0.026 | 0.001 / 0.006 | 0.001 / 0.005 | 12104 |
| 1 000 | 0.170 / 0.711 | 0.188 / 0.611 | 0.006 / 0.013 | 0.004 / 0.009 | 122088 |
| 10 000 | 3.975 / 7.998 | 4.791 / 12.620 | 0.012 / 0.041 | 0.027 / 3.054 | 1230913 |

Вывод замера: стоимость финального persist линейно растёт с числом строк. Сам `clear` дешёвый, но остановка записи и unload-путь синхронно собирают весь trace в одну строку. Потолок 10 000 не устраняет цену; он только назначает верхнюю цену и объём утраты.

## Наблюдаемое состояние (подтверждено кодом)

| Факт | Где (файл:строка @ 2026-09-27) |
|------|--------------------------------|
| Trace живёт в renderer singleton как `string[]`; комментарий прямо называет его in-memory buffer for copy/download. | `apps/client/src/modules/device-board/scenarioTraceBuffer.ts:1` |
| Потолок равен 10 000 строк. | `apps/client/src/modules/device-board/scenarioTraceBuffer.ts:6` |
| При переполнении кольцо молча вытесняет старые строки через `lines.splice(0, lines.length - MAX_TRACE_LINES)`. Начало долгого прогона теряется. | `apps/client/src/modules/device-board/scenarioTraceBuffer.ts:41` |
| Любая мутация сбрасывает snapshot и будит подписчиков. | `apps/client/src/modules/device-board/scenarioTraceBuffer.ts:14` |
| `getScenarioTraceLines()` копирует весь массив через `lines.slice()` при первом чтении после мутации. | `apps/client/src/modules/device-board/scenarioTraceBuffer.ts:65` |
| `getScenarioTraceText()` синхронно склеивает весь буфер через `lines.join('\n')`. | `apps/client/src/modules/device-board/scenarioTraceBuffer.ts:73` |
| INFO включён по умолчанию. Значит trace копится без явного включения пользователем. | `apps/client/src/modules/device-board/scenarioRuntimeInfoGate.ts:12` |
| Каждый INFO при включённом флаге добавляет строку в trace и пишет в logger. | `apps/client/src/modules/device-board/scenarioRuntimeInfoGate.ts:31` |
| Runtime host отдаёт наружу count/lines/copy/download/clear/subscribe; это уже контракт между `packages/device-board` и клиентом. | `apps/client/src/modules/device-board/createScenarioRuntimeHost.ts:318` и `packages/device-board/src/runtime/host.ts:256` |
| На `scenario-run-start` trace очищается. | `apps/client/src/modules/device-board/createScenarioRuntimeHost.ts:324` |
| На `scenario-run-stop` и `scenario-runtime error` клиент вызывает `persistScenarioTraceToDisk(id)`. | `apps/client/src/modules/device-board/createScenarioRuntimeHost.ts:341` |
| `persistScenarioTraceToDisk()` в Electron mode синхронно вызывает `getScenarioTraceText()` до `window.electronAPI.shellLog.flushScenarioTrace(text, id)`. | `apps/client/src/lib/electronScenarioTracePort.ts:7` |
| `beforeunload` тоже вызывает `persistScenarioTraceToDisk()`. | `apps/client/src/lib/electronScenarioTracePort.ts:23` |
| Нажатие “выйти из доски” при работающем runtime вызывает `graph.stopScenario('system')`, затем выходит из board mode / отдаёт `onRequestExit`. | `packages/device-board/src/components/device-board-shell.tsx:727` |
| Сам `ScenarioRuntime.stop()` только ставит stop state и abort; финальная тяжёлая точка приходит позже в `finishStopped()`. | `packages/device-board/src/runtime/scenario-runtime.ts:296` |
| `finalizeRun()` всегда доходит до `finishStopped()`. | `packages/device-board/src/runtime/scenario-runtime.ts:1035` |
| `finishStopped()` логирует `scenario-run-stop`, что в клиентском host запускает persist всего trace. | `packages/device-board/src/runtime/scenario-runtime.ts:1078` |
| Overflow path “вывезти в коллекцию” закрывает окно, выходит из board mode и выбирает библиотеку; сам trace не чистит и не сериализует. | `apps/client/src/lib/overflow-window/OverflowWindowHost.tsx:96` |
| Правый sidebar получает trace-порты даже когда вкладка trace не активна; count-подписка существует отдельно от вкладки. | `packages/device-board/src/components/device-board-shell.tsx:1884` и `packages/device-board/src/context/device-board-graph-context.tsx:607` |

## Ответы на четыре вопроса

1. **Зачем trace живёт в отрисовщике.** Сегодня он живёт там ради UX во время работы и быстрых действий после: count badge, вкладка trace, copy/download. Кодовой причины хранить полный вещдок прогона именно в renderer не найдено. Во время работы человеку нужен live tail; после работы нужен полный evidence artifact. Это разные носители.

2. **Почему потолок 10 000 и что происходит при упоре.** В коде есть только константа `MAX_TRACE_LINES = 10_000`; обоснования рядом нет. При упоре старые строки молча вытесняются, поэтому длинный прогон теряет начало именно тогда, когда полный вещдок ценнее всего.

3. **Что делает остановка.** Кнопочный `stop()` дешёвый, но финализация runtime логирует `scenario-run-stop`, а клиентский host на этот лог синхронно делает `persistScenarioTraceToDisk()`. В Electron mode это синхронный `join` всего буфера и синхронная передача строки в shell port на главном renderer-пути.

4. **Нужен ли trace включённым по умолчанию.** Сегодня да: `infoLoggingEnabled = true`, и строки копятся даже когда вкладка trace закрыта. Закрытая вкладка снижает постоянную цену snapshot/render, но не отменяет накопление и финальную сериализацию.

## Решение

Пока решения нет; ниже развилка для владельца. Так как минимум Р2 меняет контракт `ScenarioRuntimeHost` между `packages/device-board` и `apps/client`, принимать её единолично через ADR нельзя. Нужен `yarn consilium` перед реализацией, если владелец выбирает вынос полного вещдока из renderer.

### Р1 — Renderer tail + async/chunked persist

Оставить текущий renderer buffer как источник UX, но заменить финальный sync persist на deferred/chunked путь: например, сначала снять snapshot, затем отдавать запись после выхода из критического UI-такта, с back-pressure и явным статусом “trace сохранён/не сохранён”.

Цена: минимальная архитектурная перестройка, можно делать маленьким PR после решения. Что ломает: если кто-то рассчитывает на немедленную запись trace прямо внутри `scenario-run-stop`/`beforeunload`, этот контракт станет best-effort. Не решает потерю начала прогона при 10 000 строках и не освобождает renderer от хранения полного вещдока.

### Р2 — Live tail в renderer, полный вещдок в run-evidence sink

Разделить носители: renderer держит короткий live tail для человека во время работы, а полный trace пишется инкрементально в отдельный sink прогона (Electron file stream / IndexedDB / worker-backed store). Copy/download читают не renderer singleton, а artifact текущего run. Остановка записи только закрывает/финализирует sink, не склеивает 10 000 строк на renderer main path.

Цена: новый/изменённый контракт `ScenarioRuntimeHost` и новая ответственность клиента за run evidence lifecycle. Что ломает: текущую простую модель “весь trace = массив строк в UI”; тесты и UX copy/download надо перевести на artifact/tail. Плюс нужен ответ, где живёт evidence вне Electron mode.

### Р3 — Trace opt-in / diagnostic mode

По умолчанию копить только счётчики/последний tail, а полный trace включать явно: diagnostic toggle, per-run recording, или авто-включение при ошибке/долгом прогоне.

Цена: меньше фоновой памяти и ниже teardown-cost в обычной работе. Что ломает: привычку “после любого прогона есть полный trace”; расследование багов без заранее включённого режима может потерять данные. Сам по себе Р3 не отвечает, куда складывать полный вещдок, когда он включён.

## Предпочтение черновика

Технически самый честный путь — Р2 + часть Р3: live tail в renderer, полный вещдок инкрементально вне renderer и включение полного evidence либо по явному diagnostic mode, либо по политике прогона. Но из-за контракта `ScenarioRuntimeHost` это не “маленькая починка”; следующий шаг — consilium по границе runtime/client/evidence.

## Definition of Done (для будущей реализации)

- [ ] После выбранного решения повторно запустить `node scripts/measure-scenario-trace-teardown.mjs --repeats 120 --warmup 12 --subscribers 1`; таблица 100 / 1 000 / 10 000 должна показать отсутствие линейной цены на UI-критическом пути остановки/выхода.
- [ ] Длинный прогон не теряет начало полного evidence artifact при достижении renderer tail cap.
- [ ] Закрытая вкладка “Трейс” не создаёт постоянной цены snapshot/render; открытая вкладка честно показывает live tail.
- [ ] Ошибка/остановка/выход из board mode имеют явный статус сохранения trace: saved / skipped / failed.
- [ ] Тесты прибора и затронутых runtime/client пакетов зелёные; границы пакетов не нарушены.

## Out of scope / открытые задачи

- Исправление продуктового кода клиента в этом PR.
- Выбор формата долговременного artifact до решения владельца.
- Смена политики INFO-логов без отдельного решения о диагностическом режиме.

## Ссылки

- Issue: #2476
- Прибор: `scripts/measure-scenario-trace-teardown.mjs`
- Тест прибора: `scripts/scenario-trace-teardown-measure.test.mjs`

