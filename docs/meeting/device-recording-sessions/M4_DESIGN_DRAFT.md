# M4 — проект папки сессии и кольца библиотеки (черновик)

Ствол `42d78fdb` (`Membrana-tooling`), строки сверены чтением. **BM**=`packages/background-media/src`, **P**=`packages/background-media/prisma/schema.prisma`, **S**=`BM/modules/samples/samples.service.ts`, **C**=`BM/modules/collections/collections.service.ts`, **Q**=`BM/modules/devices/devices.service.ts`, **ML**=`packages/services/media-library/src`, **F**=`packages/background-cabinet/src/modules/pair/membrane-context-fanout.service.ts`. M3 (П1–П14) принят; M4 он оставил папку, кольцо и место перед переносом (`M3_DESIGN_DRAFT.md:78`). «новое» — нет в стволе.

Опора. Коллекция: ключ `(deviceId, id)`, `kind buffer|user|system`, `systemKey String?` (`P:17-21`, `P:137-150`). Ось `userStorage` — строки `user` и `system` кроме тарифного набора (`Q:254-262`), её же судит перенос (`BM/modules/samples/buffer-overflow-refusal.ts:77-87`). Лимит `Device.userStorageQuotaBytes` (`P:66`) — из тарифа (`packages/background-cabinet/prisma/schema.prisma:54`) рассылкой (`F:99`).

## 1. Папка сессии
Коллекция прибора `kind='system'`, `systemKey='recording-session'` (новый литерал; поле есть, `P:143`), **одна на сессию**. Почему не `user`: дверь `DELETE …/collections/:id` (`BM/modules/collections/collections.controller.ts:83-95`) сносит `user` строкой (`C:53-55`) каскадом проб (`P:157`) **без файлов** — сервис блобов не знает (`C:25`): сироты вне доказательства. `system` эта дверь отвергает (`C:50-52`), при этом `system` в квоте (`Q:258`) и годна цели `moveBatch` (`S:399-411`, `S:569-573`). Не общая папка прибора: имя уникально в коллекции (`P:172`), перенос — один `updateMany` (`S:428-431`); папка-на-сессию наследует уникальность буфера.
Id детерминирован: `session-<RecordingSession.id>` (новое) — повтор после сбоя вторую не заводит (ключ `P:148`). Имя по Т7: `Сессия №<seq> · <startedAt>–<closedAt> UTC · <N> из <M> · <criterion>`; N = выбрано + помечено, M = проб окна — известны после фазы `select`. Создаёт исполнитель закрытия M3 новой фазой `folder` (после `select`, до переноса), повтор — no-op; `RecordingSession.folderCollectionId` (новое) пишется в той же транзакции. Сухой ход (М3 П11) папку не создаёт.

## 2. Строгий признак
Кольцо перебирает не коллекции, а строки `RecordingSession` прибора с `folderCollectionId`, и снимает коллекцию только при двойном совпадении: id из строки сессии **и** `kind='system' ∧ systemKey='recording-session'`. Имя не читается; буфер, `user` и тарифный набор (`BM/lib/collection-ids.ts:4`) не попадают по построению.

## 3. Политика кольца
Граница — **байты существующей оси `userStorage`**: кольцо срабатывает, когда выборка новой сессии не влезает (Т5). Своего бюджета байт нет: второй лимит внутри той же квоты разошёлся бы с отказом `moveBatch` (`S:371-373`). Плюс одно поле (новое) `ringMaxSessions: int | null`, умолч. `null` (только байты), [1, 1000] — «не больше K последних папок». Носитель — тот же, что у политики сессии M1: колонка на `Device` рядом с `sessionPolicy*` и поле `MembraneSessionPolicy` под тем же `binding` (вердикт M1, `docs/seanses/device-recording-sessions-m1-policy-2026-11-21.md:126-127`); доставка — тот же контекст (`F:96-104` → `Q:188-210`). Поля M1 не меняются. Выключателя нет: по Т5 кольцо — свойство библиотеки.
**Крючок докупки** (только имя): докупленные байты прибавляются к `userStorageQuotaBytes` в кабинете до рассылки (`F:99`); media видит больший `limitBytes` (`Q:267-270`, `BM/modules/devices/device-limits.ts:35-38`) — кольцо не меняется.

## 4. Когда работает
Только фазой `ring` закрытия M3; своего расписания нет (будит тик М3 П1). Фазы: `select → folder → ring → move → delete → verify`. `need = Σ sizeBytes(pinned ∪ selected)`, `free = limitBytes − usedBytes` (`Q:267-270`). Жертвы — закрытые сессии прибора с папкой, кроме текущей, по возрастанию `closedAt`, пока `need > free` или папок больше `ringMaxSessions`. План жертв пишется в задание до удаления. На паузе `no_space` (М3 П10) тик повторяет `ring` и `move`.

## 5. Как удаляет
Новая таблица `SessionFolderEviction` (жертва, задание закрытия, `sampleIds`, `storageRefs`, `status`, `attempt`, `nextAttemptAt`, `leaseUntil`, `outcomes`) — по форме `ColdArchivePurgeJob` (`P:390-406`), не он: тот привязан к прогону и партии (`P:392-396`). Порядок уборщика (`BM/modules/downgrade-archive/purge-gc.runner.ts:6-9`): снимок id и путей → `deleteMany` проб `where {id ∈ снимок, collectionId = папка}` (вторая проверка, как `S:428-429`) → строка коллекции → `removeWithProof` (`BM/blob/blob-storage.service.ts:73-75`) по пути, **на который не ссылается ни одна строка `Sample`** (новое, п.8) → `decideAfterAttempt` (`BM/modules/downgrade-archive/purge-retry-policy.ts:107-123`). Строки раньше файлов: квота — строки (`Q:239-262`). Затем `episodes.release(deviceId,'userStorage')` (как `S:561-566`). Строка сессии-жертвы остаётся следом с `folderEvictedAt` (новое). Ключ — тот же `SESSION_PURGE_LIVE_ENABLED` (М3 П11): выкл. → план и снимки пишутся, удаления нет (как сухой прогон уборщика, `purge-gc.runner.ts:21-22`).

## 6. Помеченные в старых папках
Папки держат помеченные по построению (М3 П3–П4). **Рекомендация:** кольцо пропускает папку, где есть проба `isPinnedByHuman` (`ML/buffer-cleanup.ts:89-95`), и берёт следующую; удаляет только целиком (Т7). Пропуск редок: прибор шлёт `label: 'unlabeled'` (`apps/client/src/plugins/mic-buffer-recorder/micBufferRecorderPlugin.ts:154`), помечает человек. Цена — кольцо может не освободить место. Тогда — пауза `no_space` M3 без нового состояния; выходы те же (`retry` | `drop_unplaced`), плюс человек выносит помеченные в свой набор (`samples.move`, `S:324-347`) — папка становится жертвой, `retry`. Пропущенные пишутся в задание (`ringSkipped`, новое).

## 7. Что видит человек
Дверь М3 П10 `GET …/recording-sessions/current` (новая в M3) добавляет `ring: { evicted, skippedPinned, deadLetter }` (новое). Списки наборов уже несут `kind` и `systemKey` (`BM/lib/sample-dto.ts:76-95`), но клиент чужой `systemKey` отбрасывает (`ML/backends/server-storage-backend.ts:116`; тип `ML/types.ts:26`), кабинет на любую `system` пишет «системный датасет» (`apps/cabinet/src/components/sample-library/SampleLibraryMainPanel.tsx:191-192`), а «только чтение» — одно правило Студии и кабинета (`ML/buffer-cleanup.ts:192-207`). Новое (UI): литерал в тип, подпись «папка сессии», вынос проб из неё — иначе у п.6 нет рук.

## 8. Гонки
С M3: кольцо — фаза того же задания под тем же лизом (М3 П8); закрытие прибора одно за раз (М3 П6). Человек удаляет папку — дверь отвергает `system` (`C:50-52`). Удаляет пробу (`S:313-322`, разрешено кроме тарифа) — путь даёт `already_absent` (`BM/blob/blob-removal-proof.ts:10`). Выносит пробу — `S:338-344` меняет `collectionId`: условие `collectionId = папка` её не удалит, проверка «путь без ссылок» не тронет файл (Т7: «вынесенные записи не трогает»). Внос чужих проб в папку API не запрещён (`S:217`, `S:334`, `S:400` отбивают только тариф) — новое: отказ публичных `move`/`move-batch`/загрузки в `recording-session`, исполнителю — внутренний вызов.

## 9. Процессы и сбой
Как М3 П12–П13: всё в БД; задания жертв берутся условным `updateMany` по лизу (`BM/modules/downgrade-archive/purge-journal.store.ts:40`, `:267-273`). Рестарт: план в задании, повтор `deleteMany` — no-op, пути — `already_absent`. `ring → move` — когда у всех жертв сняты строки (файлы — долгом). Замка в памяти нет; ADR-0032 Р2 (`docs/adr/ADR-0032-archive-gc-journal-boundary.md:57`) в силе.

## Открытые вопросы владельцу
1. Помеченные в старой папке: (а) пропускать папку — **рекомендация**, цена: кольцо может встать в `no_space`; (б) удалять целиком с помеченными — Т7 буквально, пометка живёт срок кольца; (в) кольцо выносит их в автонабор «Хранимое» (новое; риск совпадения имён `P:172`).
2. `ringMaxSessions` в v1 или граница только байтами? Рекомендация: поле есть, умолч. `null`.
3. Удаление папки сессии человеком: сейчас нельзя (`C:50-52`). Рекомендация: в v1 нет; позже — дверь через путь п.5.

## Что НЕ решает проект
Цена и учёт докупки; экран кольца в кабинете; понижение тарифа ниже занятого (архив понижения трогает только буфер, `BM/modules/downgrade-archive/downgrade-archive.service.ts:229-231`); поля M1, машина M3.
