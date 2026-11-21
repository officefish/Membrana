<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-11-21T11:37:02.809Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/device-recording-sessions-m3-machine-2026-11-21.md` |
| Порядок ролей | Структурщик → Математик → Музыкант → Архитектор → Teamlead → Верстальщик |
| Повестка | `docs/meeting/device-recording-sessions/M3_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/device-recording-sessions/M3_AGENDA.md` | 5946 | `cf242e4a5e3b` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs/meeting/device-recording-sessions/M3_AGENDA.md` | 5946 · 1 п. | `cf242e4a5e3b` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --min-replies 30`

**Вопрос:**

Заседание «Политика сессий записи прибора», M3: Q3 — машина сессии

---

# Консилиум: M3 — машина сессии записи прибора

**Повестка:** Заседание «Политика сессий записи прибора», M3: Q3 — какая машина исполняет сессию (будильник, выборка, доказанное освобождение, сигнал прибору, сбой/повтор).

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Структурщик → Математик → Музыкант → Архитектор → Teamlead → Верстальщик

---

[Структурщик]: Граница уже в M2: сессия — серверная сущность media, часы — только сервер записей. Значит будильник конца сессии не выносим в office-cron по образцу ADR-0032: office там будит чужой контур уборки архива, а сессия живёт целиком в media. Словарь: `RecordingSession` (окно, state, closeReason) + runner закрытия рядом с buffer-cleanup, не внутри `PurgeGcRunner`.

[Математик]: Минимальная длительность 30 мин. Если будить раз в час — опоздание до 59 мин на закрытие, это ломает контракт окна. Частота будильника ≤ 1/10 минимума: тик раз в 1–3 минуты достаточна; предикат закрытия по сроку — `now >= openedAt + durationMinutes`, время только серверное. Идемпотентность: повтор tick на уже `closing`/`closed` не пересчитывает выборку заново без ключа прогона.

[Музыкант]: С потока прибора: удержание сейчас снимается только локальным `bufferCleared` после очистки Студией — `release('cleanup')` в wiring, сигнала «сервер освободил» в стволе нет. Машина сессии обязана закончить цепочку так, чтобы прибор узнал об пустом буфере и снял hold, иначе после `device_buffer_full` мембрана останется в удержании навсегда.

[Архитектор]: Конструкция: свой scheduler на media (причина — вердикт M2 «часы — только сервер записей» + сущность сессии там же). Office-cron ADR-0032 не расширяем: другая лемма (холодный архив), другая дверь. Закрытие — отдельный `SessionCloseRunner` в background-media: выборка → фиксация результата → plan/execute остатка → proof → confirmed → unblock next. Папку библиотеки не проектируем (M4).

[Teamlead]: Планка: без подтверждённого освобождения следующая сессия не открывается — это уже M2, не переоткрываем. Связка на вердикт: Веснин форма runner’а, Ожегов двери и модули, Дынин предикаты/идемпотентность, Курёхин канал до прибора, Родченко видимость паузы человеку. LGTM форме «будильник в media, не office».

[Верстальщик]: Человеку в кабинете/на приборе должно быть видно состояние «пауза / ждёт освобождения» и действие ручного выхода — без декора, badge + одна кнопка. M3 задаёт, *что* делает выход; пиксели — после контракта state. Не прятать mid-close за спиннером без статуса.

[Структурщик]: Выборка по критерию: в стволе уже есть `modeOrderOf` / `modeOrder` в `downgrade-archive.service.ts:151,:160`, применение `:260`. Переиспользуем ранжирование как чистый порядок буферных проб сессии; не тащим freeze/batch-словарь архива в сессию. Исполнитель закрытия — не `PurgeGcRunner`: у того журнал партий и `expiresAt`, другой инвариант.

[Математик]: «Подтверждено освобождение» численно: для каждого sampleId из остатка (состав сессии минус keep-set) исход удаления ∈ {`removed`,`already_absent`} по `blob-removal-proof.ts:22`, и после execute предикат «в `__buffer__` прибора нет проб с `prevClosedAt < createdAt ≤ closedAt` вне keep, а keep уже не в буфере». Любой `failed` → освобождение не подтверждено → state pause.

[Музыкант]: Досрочное закрытие по полному буферу: отказ `device_buffer_full` уже в `buffer-overflow-refusal.ts:45`. В момент отказа media знает deviceId — это вход в машину: поставить активной сессии closeReason=`device_buffer_full` и запустить тот же close pipeline, не дожидаясь тика срока. Прибор при этом уже в hold; снять hold можно только после confirmed clear.

[Архитектор]: Куда писать результат выборки на шаге M3: в сущность сессии (поля/таблица media) — immutable снимок `selectedSampleIds[]` + criterion + limit + closedAt + closeReason. Это ещё не папка библиотеки (M4); это вещдок «что отобрано», от которого M4 заберёт materialize. Остаток — список на delete через существующие двери buffer-cleanup.

[Teamlead]: Повтор при сбое посреди закрытия — матч, не тренировка: runner с замком «один активный close на device/session» по аналогии комментария `:16` у PurgeGcRunner, шаг journalled, tick и ручной выход бьют в один идемпотентный continue. BLOCK, если кто-то предложит «просто открыть next без proof».

[Верстальщик]: Ручной выход из паузы в UI — не «нарисовать галочку». Контракт: действие человека инициирует повтор освобождения или (если политика `enabled=false`) фиксирует отказ и показывает, что запись не идёт. Статусы: closing / pause_awaiting_release / released / failed_release — `role="status"`, без silent success.

[Структурщик]: Двери очистки уже есть: `POST .../buffer-cleanup/plan` и `.../execute` — `buffer-cleanup.controller.ts:31,:40,:53` («Delete exactly the listed samples»). Close runner строит exact list остатка и вызывает тот же execute-контур; не плодим третий delete API. Журнал уборщика purge-journal не смешиваем: либо узкий `session-close-journal`, либо run-log на самой сессии — отдельная лемма.

[Математик]: Идемпотентность close: ключ `(sessionId, closeAttempt)` либо version на state. Повтор после partial delete: keep-set уже зафиксирован — не переранжируем; rest = sessionComposition \ selected, delete again; `already_absent` считаем успехом. Открытие next: только transition `releaseConfirmedAt != null`. Пауза: `awaiting_release` пока proof неполный.

[Музыкант]: Как прибор узнаёт: нужен явный канал server→device. Фактура: сейчас `publishMediaLibraryBufferCleared` только из Студии (`mediaLibraryHubBridge.ts:230-235`). Предлагаю: media после confirmed publish’ит событие/контекст «bufferReleasedByServer» (рассылка контекста прибора — тот же класс доставки, что политика M1), клиент делает локальный clear-sync при необходимости и вызывает `release('cleanup')`. Момент — строго после confirmed, не в начале close.

[Архитектор]: Канал: не HTTP callback с прибора в закрытие; media — источник истины. Вариант с минимальной новой поверхностью — поле в device context / session status, который клиент уже тянет рассылкой контекста (M1), плюс при наличии hub — push. Снятие hold на клиенте остаётся `release('cleanup')`, но триггер события расширяем: server-confirmed empty buffer, не только «Студия сама почистила».

[Teamlead]: Боевое удаление: второй ключ у purge — `PURGE_LIVE_ENABLED` (`env.schema.ts:75`). Сессионный rest — не холодный архив. Свой ключ `SESSION_BUFFER_RELEASE_LIVE_ENABLED` (имя уточнит Ожегов), default dry/safe; не открываем session-close чужим флагом уборщика. Принимаю.

[Верстальщик]: Пауза видима человеку — на device-board/студии индикатор удержания уже есть; добавляем причину «ожидание освобождения буфера сессии» текстом, не новой метафорой. Ручной выход — primary action в этой карточке. M4-папку не рисуем.

[Структурщик]: `device_buffer_full` как вход: samples-слой при отказе эмитит/вызывает session-machine `requestEarlyClose(deviceId, reason)`. Слабая связанность: refusal не импортирует runner напрямую — через порт/events media-module. Смена политики и `enabled=false` — те же early-close входы, уже разрешённые M2.

[Математик]: Частота: фиксирую рекомендацию **каждые 60 секунд** tick scheduler’а media на due sessions (`closedAt_due <= now` или state in `closing|awaiting_release`). Относительно 30 мин это 1/30 — достаточно для срока; early close не ждёт tick. Замок процесса: один live close per sessionId.

[Музыкант]: Записи паузы приписываются следующей сессии — данность T4; машина close не должна «присваивать» pause-samples текущей выборке. Состав — строго `prevClosedAt < createdAt ≤ closedAt` по M2. Runner не трогает пробы после closedAt.

[Архитектор]: Итог формы runner’а: (1) determine close due/early (2) freeze snapshot composition (3) rank via modeOrder + selectionLimit (4) persist selection result on session (5) buffer-cleanup execute rest with proof (6) if all good → releaseConfirmed, context notify device (7) else awaiting_release. Next open только из (6). Dry-run/live — свой env-ключ.

[Teamlead]: Ручной выход из паузы — что делает: **повтор шага освобождения** (continue close / re-execute rest delete + proof), не «насильно open next», не «сброс hold на приборе в обход сервера». Если live-ключ выключен — выход показывает отказ и оставляет pause. Принимаю как норму комнаты.

[Верстальщик]: Согласен: кнопка «Повторить освобождение», не «Пропустить и писать дальше». Если нечего повторять (уже confirmed) — кнопка disabled. Это честная конструкция.

[Структурщик]: Журнал: не переиспользуем `purge-journal.store.ts` — другой агрегат. Пишем progress на `RecordingSession` (phases, lastError, proof summary) + опционально append-only close attempts. Proof удаления путей — **переиспользуем** `blob-removal-proof.ts` outcomes, это общая фактура blob, не purge-only.

[Математик]: modeOrder — переиспользование без копипасты формулы: вызов той же функции порядка, вход — samples composition сессии, выход — top N ids. Критерий из политики сессии (M1), не из tariff-downgrade UI. Численно selectionLimit режет после order.

[Музыкант]: Повтор сбоя mid-close на приборе: hold держим до event release; лишние upload’ы при full и так refusal. Главное — не слать release раньше proof, иначе прибор начнёт писать в ещё не пустой серверный буфер.

[Архитектор]: Почему не office-cron: ADR-0032 граница «office будит, media исполняет» оправдана админ-уборкой архива и panel GET. Сессия — runtime прибора, SLA минутный, entity media; свой будильник media проще и совпадает с M2 «часы — только сервер записей». Частота 60s — ops-норма, не cron office hourly.

[Teamlead]: Сводка на стол: будильник media 60s; close runner свой; modeOrder да; proof blob да; purge-journal нет; buffer-cleanup execute да; selection snapshot на session; confirmed = rest proof + empty predicate; device через context/event → release('cleanup'); early via device_buffer_full; manual = retry release; live-ключ свой. Возражения по существу — сейчас.

[Верстальщик]: Возражений по UI-контракту нет. Пауза и retry — моя зона после API state. Принимаю.

[Структурщик]: Принимаю. Модуль: `packages/background-media` session + reuse buffer-cleanup + modeOrder export/shared; client wiring расширить триггер bufferCleared/release. Циклов plugin→plugin не добавляем.

[Математик]: Принимаю. Предикаты due/confirmed/idempotent — чистые, тест без UI.

[Музыкант]: Принимаю. Канал до hold — обязательный DoD клиента, иначе full-buffer сессия мёртвая.

[Архитектор]: Принимаю. Форма закрыта; M4 заберёт selectedSampleIds → папка. ADR при реализации — граница runner vs purge.

[Teamlead]: Вердикт комнаты — LGTM. Матч: исполнить машину по таблице ниже. Папку/кольцо не трогаем.

[Верстальщик]: Принимаю итог.

[Структурщик]: Уточнение словаря export: `modeOrder`/`modeOrderOf` вынести в доступ для session-close без импорта «всего downgrade service» внутрь — фасад/pure fn, иначе слабая связанность. Это условие реализации, не смена вердикта.

[Математик]: Ещё раз «подтверждено»: zero `failed` в proof batch остатка И count(buffer samples in session window \ selected) == 0 после re-read. Иначе не confirmed — без исключений «почти».

[Музыкант]: device_buffer_full path: после early close и release event прибор снимает hold и может снова слать; next session open на сервере уже после confirmed — порядок M2 сохранён.

[Архитектор]: Early close и scheduled close — один pipeline; различается только closeReason. Смена политики/`enabled=false` — тот же вход requestEarlyClose. Единая машина.

[Teamlead]: Фиксирую. DoD — только M3. Связка на код после заседания: Ожегов+Дынин runner, Курёхин client signal, Родченко pause UI, Веснин ADR-черновик границы. Протокол готов.

[Верстальщик]: Готово с моей стороны: в вердикте вижу state pause и manual retry — этого достаточно для конструкта экрана.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Кто будит конец сессии и open next | **Свой scheduler/будильник сервера записей (media)**, не office-cron ADR-0032. Причина: M2 — часы и сущность сессии только на media; office-cron — лемма холодного архива, hourly SLA не подходит runtime сессий. |
| Частота | **Тик ≤ 60 с** (рекомендация комнаты: 60 с). Относительно минимума 30 мин — не грубее 1/30; due по `now ≥ openedAt+duration`. Early-close **не ждёт** тик. |
| Что исполняет закрытие | **`SessionCloseRunner` (новое) в background-media**. Один pipeline для due и early. |
| Ранжирование | **Переиспользовать `modeOrderOf`/`modeOrder`** (`downgrade-archive.service.ts:151,:160,:260`) как pure order; не тащить freeze/PurgeGc. |
| Журнал purge | **Не переиспользовать** `purge-journal.store` (другой агрегат). Прогресс/attempts — на сущности сессии (и при нужде узкий session-close log). |
| Proof удаления | **Переиспользовать** `blob-removal-proof.ts:22` (`removed \| already_absent \| failed`). |
| Удаление остатка | **Двери buffer-cleanup** plan/execute (`buffer-cleanup.controller.ts:31,:40,:53`) — exact list rest. |
| Куда результат выборки (M3) | **Снимок на серверной сущности сессии**: `selectedSampleIds`, criterion, limit, closedAt, closeReason. Не папка библиотеки (M4). |
| «Освобождение подтверждено» | Все rest-delete ∈ {removed, already_absent}, zero failed; re-read: в `__buffer__` нет проб окна сессии, подлежавших удалению; keep-set зафиксирован и не переранжируется при retry. |
| Next session | Только после `releaseConfirmed`; иначе `awaiting_release` (пауза), видимая человеку. |
| Как прибор снимает hold | После confirmed media **уведомляет прибор** (рассылка контекста / session status + при наличии hub push). Клиент инициирует цепочку к **`release('cleanup')`** (расширение триггера относительно только Studio `bufferCleared`; фактура: wiring.ts:36,:56; hubBridge.ts:230-235). Момент — **только после confirmed**, не в старте close. |
| Сбой и повтор | Замок одного active close на session; идемпотентный continue: selection snapshot immutable; rest delete повторяем; `already_absent` = ok. Tick и manual бьют в тот же continue. |
| `device_buffer_full` | Отказ (`buffer-overflow-refusal.ts:45`) → `requestEarlyClose(deviceId, device_buffer_full)` → тот же pipeline. |
| Ручной выход из паузы | **Повтор освобождения** (continue proof/delete), не open next в обход, не локальный release без сервера. При live off — остаёмся в pause с ошибкой. |
| Боевой ключ удаления | **Свой** env-ключ session buffer release live (не `PURGE_LIVE_ENABLED`). Default безопасный/non-live. |
| Не решает M3 | Папка сессии и кольцо (M4); поля политики (M1); правила границы окна (M2). |

**Definition of Done (M3 only):**
- Media scheduler тикает due sessions ≤60s; early-close порт от `device_buffer_full` / policy disable / policy change.
- `SessionCloseRunner`: composition → modeOrder+limit → persist selection on session → buffer-cleanup rest → blob proof → confirmed или awaiting_release.
- Идемпотентный retry; next open только post-confirm.
- Канал server→device о confirmed release; клиент снимает hold через `release('cleanup')`.
- Свой live-ключ rest-delete; тесты предикатов confirmed/idempotent; UI-контракт pause + «Повторить освобождение».
- Нет реализации папки/кольца библиотеки в этом DoD.

---

## Список посылок

1. **норма** (Данности — вердикт M2): часы и сущность сессии — сервер записей; next только после подтверждённого освобождения; пауза с ручным выходом; hold не снимается концом сессии сам.  
   [Архитектор]: «Конструкция: свой scheduler на media (причина — вердикт M2 «часы — только сервер записей» + сущность сессии там же).»

2. **норма** (Данности — T2/T4): по итогам сессии отбор N по критерию в библиотеку; буфер принадлежит сессиям; остаток удаляется; после сессии буфер пуст; pause-samples → следующей.  
   [Музыкант]: «Записи паузы приписываются следующей сессии — данность T4; машина close не должна «присваивать» pause-samples текущей выборке.»

3. **норма** (Данности — вердикт M1): политика `enabled` / `durationMinutes` [30,600] / `selectionLimit` / `criterion`; доставка в media рассылкой контекста.  
   [Архитектор]: «Вариант с минимальной новой поверхностью — поле в device context / session status, который клиент уже тянет рассылкой контекста (M1), плюс при наличии hub — push.»

4. **факт** (Фактура): ранжирование `modeOrderOf`/`modeOrder` в downgrade-archive.service.ts:151,:160,:260.  
   [Структурщик]: «Выборка по критерию: в стволе уже есть `modeOrderOf` / `modeOrder` в `downgrade-archive.service.ts:151,:160`, применение `:260`.»

5. **факт** (Фактура): PurgeGcRunner, journal, proof, PURGE_LIVE_ENABLED, office cron ADR-0032 — отдельный контур уборки архива.  
   [Архитектор]: «Office-cron ADR-0032 не расширяем: другая лемма (холодный архив), другая дверь.»

6. **факт** (Фактура): buffer-cleanup plan/execute — controller.ts:31,:40,:53.  
   [Структурщик]: «Двери очистки уже есть: `POST .../buffer-cleanup/plan` и `.../execute` — `buffer-cleanup.controller.ts:31,:40,:53` («Delete exactly the listed samples»).»

7. **факт** (Фактура): `device_buffer_full` — buffer-overflow-refusal.ts:45.  
   [Музыкант]: «Досрочное закрытие по полному буферу: отказ `device_buffer_full` уже в `buffer-overflow-refusal.ts:45`.»

8. **факт** (Фактура): `release('cleanup')` только от `bufferCleared`; Студия publish; сигнала server→device в стволе нет — wiring.ts:36,:56; mediaLibraryHubBridge.ts:230-235.  
   [Музыкант]: «С потока прибора: удержание сейчас снимается только локальным `bufferCleared` после очистки Студией — `release('cleanup')` в wiring, сигнала «сервер освободил» в стволе нет.»

9. **факт** (Фактура): proof outcomes `removed|already_absent|failed` — blob-removal-proof.ts:22.  
   [Математик]: ««Подтверждено освобождение» численно: для каждого sampleId из остатка (состав сессии минус keep-set) исход удаления ∈ {`removed`,`already_absent`} по `blob-removal-proof.ts:22`…»

10. **план** (Вопрос M3 / порядок заседания): M3 = машина; M4 = папка и кольцо; M1/M2 не переоткрывать.  
    [Teamlead]: «Папку/кольцо не трогаем.»

11. **норма** (Данности — M2 close reasons): закрытие по сроку, досрочно при buffer full, enabled=false, смене политики.  
    [Архитектор]: «Early close и scheduled close — один pipeline; различается только closeReason. Смена политики/`enabled=false` — тот же вход requestEarlyClose.»

12. **план** (Вопрос M3): свой боевой ключ vs PURGE_LIVE_ENABLED.  
    [Teamlead]: «Боевое удаление: второй ключ у purge — `PURGE_LIVE_ENABLED` (`env.schema.ts:75`). Сессионный rest — не холодный архив. Свой ключ `SESSION_BUFFER_RELEASE_LIVE_ENABLED`…»

---

*Реплик в диалоге: 54; каждый участник высказался не менее одного раза.*

---

## Полное эхо повестки (docs/meeting/device-recording-sessions/M3_AGENDA.md)

# Заседание «Политика сессий записи прибора» — M3, машина сессии

**Объединяющее задание (одно на всё заседание, дословно):** спроектировать «сессию записи» прибора от политики в кабинете до папки в библиотеке так, чтобы: политика задавалась на прибор (с общей политикой мембраны) и доходила до сервера записей; по концу сессии выборка по критерию делалась на сервере, остаток буфера доказанно освобождался, а выборка ложилась папкой в библиотеку; кольцо библиотеки удаляло только папки сессий и укладывалось в квоту хранилища. Повторно использовать то, что уже есть в стволе, если оно подходит; новое — только там, где старое не подходит, с причиной.

**Порядок заседания (утверждён владельцем 21.11):** политика (принята) → граница (принята) → **машина (эта комната)** → папка и кольцо.

## Данности (НЕ переоткрывать)

- Т2: по итогам сессии из буфера отбирается заданное число записей по одному из трёх критериев; выборка — в библиотеку.
- Т4 и слово владельца «а» (21.11): буфер целиком принадлежит сессиям; при закрытии сессии выборка берётся из её записей, всё остальное удаляется; записи паузы приписываются следующей сессии; буфер после каждой сессии действительно пуст.
- Вердикт M1 (принят): политика сессии `enabled` / `durationMinutes` [30, 600] / `selectionLimit` / `criterion`; доставка в media рассылкой контекста.
- Вердикт M2 (принят): часы — только сервер записей; сессия — новая серверная сущность (окно, состояние, причина закрытия); состав — пробы `__buffer__` прибора с `prevClosedAt < createdAt ≤ closedAt` (по `Sample.createdAt`); закрытие — по сроку, досрочно при `device_buffer_full`, `enabled=false`, смене политики; следующая сессия открывается **только после подтверждённого освобождения** остатка предыдущей; если освобождение не подтвердилось — состояние «пауза / ждёт освобождения», видимое человеку, с ручным выходом; конец сессии сам удержание не снимает — снятие только после подтверждённого освобождения.

## Фактура (ствол, с путями)

- Ранжирование буфера по критерию (отбор при понижении тарифа): `modeOrderOf` / `modeOrder` — `packages/background-media/src/modules/downgrade-archive/downgrade-archive.service.ts:151`, `:160`; применение `:260`.
- Уборщик холодного архива (ADR-0032): исполнитель `PurgeGcRunner` — `packages/background-media/src/modules/downgrade-archive/purge-gc.runner.ts:53`, `run(now, options)` — `:65`; «один активный live-прогон — замок процесса» — там же, комментарий `:16`. Журнал прогонов/заданий — `purge-journal.store.ts` (там же). Доказательство удаления пути — исходы `removed | already_absent | failed` — `packages/background-media/src/blob/blob-removal-proof.ts:22`. Второй ключ боевого удаления `PURGE_LIVE_ENABLED` — `packages/background-media/src/config/env.schema.ts:75`. Граница ADR-0032: часы офиса будят по расписанию (`@Cron(..., { timeZone: 'UTC' })` — `packages/background-office/src/modules/cold-archive-sweep/cold-archive-sweep.scheduler.ts:74`), сервер записей исполняет и пишет журнал; время — только серверное (`downgrade-archive-purge.controller.ts:115`).
- Очистка буфера по плану: двери `POST v1/devices/:deviceId/collections/:collectionId/buffer-cleanup/plan` и `.../execute` — `packages/background-media/src/modules/buffer-cleanup/buffer-cleanup.controller.ts:31`, `:40`, `:53` («Delete exactly the listed samples»).
- Отказ приёма при полном буфере: `device_buffer_full` — `packages/background-media/src/modules/samples/buffer-overflow-refusal.ts:45`.
- Снятие удержания на приборе: `release('cleanup')` вызывается только по событию `bufferCleared` — `apps/client/src/lib/device-overflow-hold/wiring.ts:36`, `:56`; это событие публикуется только когда буфер очистила сама Студия (`requestClearMediaLibraryBuffer` → `publishMediaLibraryBufferCleared`) — `apps/client/src/lib/mediaLibraryHubBridge.ts:230-235`. Сигнала «сервер освободил буфер» прибору в стволе нет.

## Вопрос M3 (ровно один)

**Q3 — Какая машина исполняет сессию: кто будит её конец (и открытие следующей), чем делается выборка по критерию и доказанное освобождение остатка, как прибор узнаёт об освобождении, чтобы снять удержание, и как это переживает сбой и повтор?**

Вердикт обязан назвать: кто будит (часы офиса по образцу уборщика ADR-0032 или свой будильник сервера записей — с причиной) и с какой частотой относительно минимальной сессии 30 мин; что исполняет закрытие (переиспользуется ли ранжирование `modeOrder`, журнал и доказательство удаления уборщика — или своё, с причиной); куда записывается результат выборки на этом шаге (не решая устройство папки — это M4); как подтверждается освобождение (что значит «подтверждено»); как прибор узнаёт об освобождении сервером и снимает удержание (`release('cleanup')`) — канал и момент; повтор и идемпотентность при сбое посреди закрытия; как машина узнаёт о досрочном закрытии по `device_buffer_full`; ручной выход из паузы — что он делает; включается ли боевое удаление тем же вторым ключом, что у уборщика, или своим.

**Чего M3 НЕ решает:** устройство папки сессии в библиотеке и кольцо (M4); поля политики (M1); правила границы (M2).

**Список посылок** — вердикт обязан нести секцию с этим заголовком: каждая посылка с типом (норма / факт / план), источником **из этой повестки** (раздел повестки) и **под каждой посылкой — дословная цитата реплики из диалога в форме `[Роль]: «…»`**. Цитата должна говорить **о предмете посылки** (цитата о данности — о самой данности). Цитата копируется из реплики символ в символ, включая регистр первой буквы, кавычки «», скобки, обратные кавычки, двоеточия и точки; пропуск — только знаком «…». Посылка без такой цитаты — не посылка; ссылка на документ вне этой повестки — не посылка.

## Требования аудита

1. Посылки — только сработавшие, каждая покрыта дословной репликой по предмету с ролью.
2. Фактура — с путём файла и строкой; чего нет в стволе, то не факт.
3. Реплик не меньше тридцати, шесть советчиков.
4. Данности и вердикты M1, M2 не переоткрываются; вопрос M4 не решается.
