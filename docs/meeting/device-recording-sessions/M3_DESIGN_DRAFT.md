# M3 — проект машины сессии записи (черновик)

Ствол `42d78fdb` (`Membrana-tooling`), строки сверены чтением. Пути: **BM**=`packages/background-media/src`, **P**=`packages/background-media/prisma/schema.prisma`, **DA**=`BM/modules/downgrade-archive`, **S**=`BM/modules/samples/samples.service.ts`, **CL**=`apps/client/src/lib`, **ML**=`packages/services/media-library/src`, **H**=`CL/device-overflow-hold`. Данности (`M3_AGENDA.md:9-16`), M1, M2 не переоткрываются. «новое» — нет в стволе.

Опора: у media нет `@Cron`/`setInterval`/WebSocket (поиск по `BM` пуст); у office есть `@Cron(…, { timeZone: 'UTC' })` (`packages/background-office/src/modules/cold-archive-sweep/cold-archive-sweep.scheduler.ts:74`). Буфер для квоты — **строки** `Sample` вида `buffer` (`BM/modules/devices/devices.service.ts:239-258`), не файлы. Политики сессии в media ещё нет (моделей нет, `P:59-415`) — её хранение исполняет M1 по образцу `devices.service.ts:188-193`.

## 1. Кто будит
Office, новый cron раз в **1 мин** → новая служебная дверь media `POST /v1/internal/recording-sessions/tick` под `ApiTokenGuard` (как `DA/downgrade-archive-purge.controller.ts:91-92`). Причина: «будит только office … Отдельного cron у media нет» (ADR-0032 Р2, `docs/adr/ADR-0032-archive-gc-journal-boundary.md:53-54`). 1 мин ≤ 3,3 % от минимальной сессии; граница окна от частоты не зависит (п.8). Дверь захватывает работу и отвечает сразу, работа идёт под лизом в БД (новое; таймаут office 60 с — `cold-archive-sweep.client.ts:64`). Флаг office `RECORDING_SESSIONS_TICK_ENABLED` (новое, умолч. выкл., «выключено = тишина» как `cold-archive-sweep.scheduler.ts:96-98`).

## 2. Исполнитель и что переиспользуем
Новое: `RecordingSessionCloseRunner` в media; таблицы `RecordingSession` (прибор, `seq` с `@@unique([deviceId, seq])`, состояние M2, `startedAt`, `closedAt`, `closeReason`, снимок политики, `selectionMode`, `pauseReason`, `releaseConfirmedAt`) и `RecordingSessionCloseJob` (фаза, `selectedIds`, `pinnedIds`, `storageRefs`, `status`, `attempt`, `nextAttemptAt`, `leaseUntil`, `outcomes`). Не `ColdArchivePurgeJob`: он привязан к прогону уборщика `runId` (`P:390-393`).

| Берём | Где | Почему |
| --- | --- | --- |
| `measureSampleSet` | `DA/downgrade-archive.service.ts:238` | те же критерии |
| `modeOrder`/`modeOrderOf` | `:160`/`:151`, сборка `:249-260` | детерминирован (`:141-143`); сборку вынести в общую функцию |
| `isPinnedByHuman` | `ML/buffer-cleanup.ts:89-95` | один предикат с `DA/…service.ts:266` |
| `moveBatch` | `S:384` | единственный вынос из буфера; повтор идемпотентен (`S:378-382`) |
| `removeWithProof` | `BM/blob/blob-storage.service.ts:73-75`; исходы `blob-removal-proof.ts:22` | доказательство stat до/после |
| `decideAfterAttempt` | `DA/purge-retry-policy.ts:107-123` | повтор путей идемпотентен (`:104-105`) |
| лиз условным `updateMany` | `DA/purge-journal.store.ts:40`, `:267-273` | замок в БД |
| `stopDecision` | `ML/buffer-stop.ts:26` (0,95), экспорт `ML/index.ts:142`; пакет уже грузится `DA/…service.ts:46` | порог стража прибора |

Не берём buffer-cleanup: ключ прибора (`BM/modules/buffer-cleanup/buffer-cleanup.controller.ts:31-32`), `oldest|newest` (`buffer-cleanup.service.ts:78-84`), показ списка (`:10-13`), удаление без доказательства (`:144` → `S:318`).

## 3. Выборка
Окно: буфер прибора, `prevClosedAt < createdAt ≤ closedAt` (M2, `docs/seanses/device-recording-sessions-m2-boundary-2026-11-21.md:130`; `createdAt` — `P:170`). Помеченные `isPinnedByHuman` с `createdAt ≤ closedAt` — `pinned`, сверх объёма. Непомеченные окна: замер → `modeOrder(criterion)` → первые `selectionLimit`. Пропущенные замером (не раскодированы `packages/plugin-handlers/src/chart-list-measure/executor.ts:182`, тише порога `:215`) ранга не имеют и не выбираются. Отказ целиком (`executor.ts:59`) → последние `selectionLimit` по `createdAt`, `selectionMode='unmeasured'` («выборка без замера», новое), закрытие идёт дальше (у понижения тут отказ, `DA/…service.ts:241-243`). Выборка пишется в задание до переноса и не пересчитывается.

## 4. Перенос
Цель — «папка сессии» (M4): коллекция прибора (`S:399`), не буфер (`S:401-407`), в квоте (`S:408-411`). Вызовы `moveBatch`: сначала `pinned`, потом выборка, куски ≤ 2000 (`BM/modules/samples/move-batch-plan.ts:50`). `not-in-buffer`/`not-found` (`move-batch-plan.ts:53`) — уже не в буфере. `no-space` → `pause`, `pauseReason='no_space'` (новое), следующая не открывается; остаток (п.5) удаляется всё равно.

## 5. Удаление остатка
Снимок: буфер прибора, `createdAt ≤ closedAt`, `id ∉ selected ∪ pinned`, с повторной проверкой пометки (как `buffer-cleanup.service.ts:138-141`; помеченная добавляется в перенос). Id и пути — в задание **до** удаления (`DA/purge-gc.runner.ts:6-9`). Строки — `deleteMany` с условием «ещё в буфере» (как `S:425-431`), затем `episodes.release(deviceId,'buffer')` (как `S:447`). Файлы — `removeWithProof`; `removed`/`already_absent` — успех, `failed` → `retry`/`dead_letter` (`purge-retry-policy.ts:116-123`). Долг файлов сессию не держит: квота — строки, они сняты; уборщик тоже снимает строки до файлов (`purge-gc.runner.ts:6-7`). `dead_letter` виден в двери п.10.

## 6. «Освобождение подтверждено»
`confirmed(k)` ⇔ в буфере нет строк с `createdAt ≤ closedAt_k` вне `selected ∪ pinned` **и** ни одна из `selected ∪ pinned` не в буфере. Пробы паузы (`createdAt > closedAt_k`) не смотрятся — «буфер после T4 либо пуст, либо держит только пробы паузы» (`M3_AGENDA.md:13`), без «буфер = 0». Граница `≤ closedAt_k` для k>1 совпадает с M2 (старших строк после k−1 нет), для k=1 даёт А1. Поздняя вставка `≤ closedAt` → новый снимок, не подтверждение. Итог: `closed`/`closed_early` (M2 `:127`), номер очистки прибора +1.

## 7. Поле `/quota`
Новое поле корня `GET :deviceId/quota` (`BM/modules/devices/devices.controller.ts:176-186`; DTO `devices.service.ts:28-43`, `devices.dto.ts:166-186`, рядом с `bufferPolicy` `devices.service.ts:286`): `sessionCleanup: { seq, sessionId, confirmedAt } | null` — последняя подтверждённая очистка; `seq` +1 на подтверждение. `bufferFreeBytes` в стволе нет.
**Почему верно при пробах паузы:** снятие — событием очистки, не местом: тот же `release('cleanup')`, что у очистки Студии (`H/wiring.ts:55-57`, `CL/mediaLibraryHubBridge.ts:229-234`), словарь `'human' | 'cleanup'` (`H/types.ts:97`). Канон «авто-возобновления по освобождению места нет» (`H/deviceOverflowHold.ts:120`, `H/localGuard.ts:21-23`) цел: поле о байтах молчит. Если пробы паузы держат ≥ 95 %, удержание вернёт страж в том же цикле: сырой `/quota` читается перед публикацией квоты (`mediaLibraryHubBridge.ts:62-65`), страж судит каждую публикацию (`apps/client/src/plugins/mic-buffer-recorder/micBufferRecorderPlugin.ts:361-373`).
**Клиент (новое):** `getQuota()` поле отбрасывает (`ML/backends/server-storage-backend.ts:397-411`); читаем то же тело `getQuotaRaw()` (`:393-395`), что уже идёт каждым циклом через мост политики (`CL/buffer-policy-bridge.ts:35`, `:39-41`; цикл `mediaLibraryHubBridge.ts:75-77`; 30/60 с `:141-147`). Источник моста отдаёт тело двум читателям — политике и новому `sessionCleanupSignal` в `H/`. Правило: `seq > lastSeenSeq` ∧ эпизод есть ∧ `reason==='device_buffer_full'` → `hold.release('cleanup')`, затем `lastSeenSeq=seq` (ключ localStorage рядом с эпизодом, `H/deviceOverflowHold.ts:53-80`). Первое чтение без `lastSeenSeq` — только запоминание. Проводка — рядом с `offCleared` (`H/wiring.ts:55-57`).

## 8. Гонка
Входы (полный буфер, выключение, смена политики) только **просят**: `updateMany where {state:'running', closeRequestReason:null}` — первая причина побеждает. Захват — тик: `updateMany where {id, state:'running'}` → `pause` («ждёт освобождения», M2 `:134`), `closedAt = startedAt+durationMinutes` по сроку, иначе время просьбы; `count≠1` → no-op (как `purge-journal.store.ts:267-273`). Работа — под лизом 10 мин (`:40`); ручной повтор и тик берут тот же лиз. Открытие — вставка `seq=last+1` под `@@unique`, только тиком, при `enabled` и подтверждённой предыдущей (M2 `:129`).

## 9. Полный буфер без серии отказов
Удержание гасит отправку (`H/wiring.ts:49`), а страж входит в него на 95 % без отказа сервера (`H/localGuard.ts:16-19`). Поэтому два сигнала, оба в БД: (1) **сам отказ** — на ветке отказа оси `buffer` в `uploadOrRefuse` (`S:224-231`) просьба `device_buffer_full` (новое; одного достаточно); эпизод в памяти процесса (`BM/modules/samples/overflow-episode-registry.ts:12-16`) и снимается переносом (`S:447`) — сигналом не служит. (2) **тик**: `stopDecision(getQuota().buffer, {policy:'stop'}).action==='stop'` — функция стража (`H/localGuard.ts:18`). Это «полный буфер / отказ» M2 (`:124`). Отказ в паузе: `running` нет — no-op.

## 10. Паузы и выходы
Новые двери под `MediaDeviceAccessGuard` (внутр. токен или ключ прибора, `BM/common/guards/media-device-access.guard.ts:31-37`): `GET v1/devices/:deviceId/recording-sessions/current` и `POST …/:id/resolve {action}`. Двери очистки не участвуют.

| `pauseReason` | Авто | Ручной `action` |
| --- | --- | --- |
| `awaiting_release` | лиз истёк → тик продолжает | — |
| `close_failed` (попытки исчерпаны) | — | `retry` (сброс попыток) |
| `no_space` | тик повторяет перенос | `retry`; `drop_unplaced` — невлезшие непомеченные удалить по п.5; помеченные человек выносит `samples.move` (`S:324`), затем `retry` |
| `live_off` | включение ключа → тик продолжает | — |

Отказ замера паузы не даёт (п.3).

## 11. Боевой ключ
Новый `SESSION_PURGE_LIVE_ENABLED` в env media, разбор как `PURGE_LIVE_ENABLED` (`BM/config/env.schema.ts:69-78`), умолч. выкл. Чужой не берём: он ключ одной двери `purge-expired` (`DA/downgrade-archive-purge.controller.ts:112-113`). Выкл. — сухой ход: выборка и снимок в задание, переноса и удаления нет, `pause/live_off`, `seq` не растёт. Два ключа как ADR-0032 Р20.4 (`:109`).

## 12. Несколько процессов media
Состояния в памяти процесса нет: захват, лиз, открытие, сигнал — в БД. Долг Д1 (`ADR-0032…md:84`; замок в памяти `purge-gc.runner.ts:56`, `:69-72`) не расширяется; условие Р2 для уборщика (`:57`) в силе.

## 13. Сбой посреди закрытия
Фазы `select → move → delete → verify` в задании; рестарт — лиз истёк, тик продолжает с фазы. До записи выборки — пересчёт (детерминирован). Между переносом и удалением — повтор `moveBatch` даёт `not-in-buffer`. Между строками и файлами — пути в снимке, повтор даёт `already_absent` (`blob-removal-proof.ts:10`). До `confirmed` следующая не открывается.

## 14. Первая сессия и А1
Media ставит `sessionEnabledAt` (новое) при приёме `enabled false→true`; тик открывает первую с `startedAt=sessionEnabledAt` (M2 `:130`: «первая: от `enabledAt`/`startedAt`»). Ранжируются пробы с `createdAt > startedAt`; удаление `createdAt ≤ closedAt_1` сносит и до-включения (А1), помеченные из них переносятся. После `enabled=false` машина в буфер не ходит.

## Открытые вопросы владельцу
1. Помеченные среди проб до включения: проект переносит их (слово «А»), а не удаляет (А1). Верно?
2. `isPinnedByHuman` считает помеченной и пробу с меткой не `unlabeled` (`ML/buffer-cleanup.ts:95`) — они тоже уйдут сверх объёма. Согласны?

## Что НЕ решает проект
Папка сессии, кольцо, место перед переносом — M4. Поля, носитель, доставка политики — M1. Граница, словарь состояний, пробы паузы — M2 (`pauseReason`/`selectionMode` — поля, не состояния). Пробы после выключения сессий — уточнение эпика (`MEETING_ACTIVE.md`).
