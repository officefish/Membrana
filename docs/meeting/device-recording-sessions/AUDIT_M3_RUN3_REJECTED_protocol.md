<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-11-21T14:28:17.736Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/device-recording-sessions-m3-machine-2026-11-21.md` |
| Порядок ролей | Математик → Верстальщик → Архитектор → Структурщик → Teamlead → Музыкант |
| Повестка | `docs/meeting/device-recording-sessions/M3_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/device-recording-sessions/M3_AGENDA.md` | 5775 | `b759e364875f` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs/meeting/device-recording-sessions/M3_AGENDA.md` | 5775 · 1 п. | `b759e364875f` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --min-replies 30`

**Вопрос:**

Заседание «Политика сессий записи прибора», M3 прогон 3: Q3 — машина сессии

---

# Консилиум: M3 Q3 — машина сессии записи прибора (прогон 3)

**Повестка:** Заседание «Политика сессий записи прибора», M3 прогон 3: какая машина исполняет сессию — будильник конца/открытия, выборка, вынос, доказанное освобождение остатка, сигнал прибору, сбои/гонки/отказы.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Математик → Верстальщик → Архитектор → Структурщик → Teamlead → Музыкант

---

[Математик]: Инвариант закрытия — не «буфер = 0». Вердикт M2: после T4 буфер либо пуст, либо держит только пробы паузы для следующей. Предикат «освобождение подтверждено» = ∀ sample ∈ buffer: sessionId(sample) ≠ closedSessionId; пробы с меткой следующей/паузы законны. Часы — `Sample.createdAt` на сервере записей.

[Верстальщик]: Прибору не нужен новый push-канал. Удержание снимается опросом `GET /quota` (тик 30 с / опрос 60 с при hold). UI паузы — честный статус + одно ручное действие выхода, не вечный spinner. Поле квоты одно, числовое, `tabular-nums`.

[Архитектор]: Машина — серверная. Будильник в office (`@Cron` UTC), исполнение в media: media владеет байтами и строками. В media своих `@Cron` нет — факт ствола. Форма: `SessionCloseRunner` в background-media; office только будит internal-дверью, как cold-archive-sweep. M4 (папка/кольцо) не трогаем: целевой набор — «папка сессии» как чёрный ящик moveBatch.

[Структурщик]: Словарь жёсткий. Не `buffer-cleanup`: ключ прибора, план oldest|newest×N, показ человеку, отказ помеченным — `buffer-cleanup.controller.ts:32`, `buffer-cleanup.service.ts:78-83`, `:10-13`, `:139-141`. Вынос только `samples.move` / `samples.moveBatch` (`samples.service.ts:324`, `:384`). Удаление с доказательством — только `removeWithProof` (`blob-storage.service.ts:73-74`), не `blobs.delete`.

[Teamlead]: Планка прогона 3: без buffer-cleanup, без «буфер=0», без вечной паузы, без выдуманных каналов. Минимальная сессия 30 мин → будильник office не реже 1 раз / 5 мин (достаточно поймать deadline; 1 мин — запас). Связка: Веснин форма → Ожегов API → Дынин предикаты → Курёхин порядок blob → Родченко статус паузы. Исполнение закрытия — media.

[Музыкант]: Поток артефактов: сначала замер/ранжирование набора сессии, потом moveBatch выборки+«хранить» в папку сессии, потом removeWithProof остатка closed-session. Порядок как у GC: строка/доказательство до rm. `device_buffer_full` — отказ приёма на полном буфере (`buffer-overflow-refusal.ts:45`); в паузе прибор не пишет в closed, только копит в «пауза→следующая».

[Математик]: Выборка переиспользует `modeOrderOf`/`modeOrder` (`downgrade-archive.service.ts:151`, `:160`) и `handlers.measureSampleSet` (`:238-252`). Отказ замера всегда на весь набор: `empty-set | floor-not-measured | nothing-decodable` (`executor.ts:59`). По слову владельца 21.11 («А»): при полном отказе — последние N по `createdAt`, сессия → «выборка без замера», остаток удаляется, дежурство не встаёт.

[Верстальщик]: Состояния машины для человека: `active` / `closing` / `paused_release` / `paused_no_space` / `paused_close_failed` / `ready_next`. Каждая пауза — кнопка «повторить закрытие» или «снять паузу после ручной очистки», `aria-busy` на closing, `role="status"` на текст причины. Не метафора — факт.

[Архитектор]: Гонка входов закрытия: (1) срок сессии, (2) серия `device_buffer_full` как сигнал «буфер не принимает», (3) ручной повтор из паузы. Один singleflight на `deviceId+sessionId`: второй вход становится no-op или join. Открытие следующей — только после confirmed release; иначе пауза с ручным выходом — норма M2, не переоткрываем.

[Структурщик]: Второй ключ боевого удаления: `PURGE_LIVE_ENABLED` (`env.schema.ts:75`). Сессионный closer при live-rm обязан читать тот же ключ, что purge-gc; иначе два контура «боевого rm». Замок уборщика — in-process; ADR-0032 Р2/Д1: при боевом удалении вторая реплика media запрещена. Несколько процессов media + live removeWithProof = BLOCK конфигурации, не «распределённый lock».

[Teamlead]: Владелец 21.11: «включение сессии дает разрешение на удаление» — closer не ходит в UI-confirm buffer-cleanup. Правило показа списка остаётся только для ручной очистки. Принимаю: авто-остаток closed-session → removeWithProof без human list.

[Музыкант]: Прибор узнаёт об освобождении только через тело `GET /quota`. Канала мгновенной доставки у media нет — факт. `release('cleanup')` в wiring — событие собственной очистки Студии; серверный closer Студию не шлёт. Значит hold с серверного освобождения снимает **опрос квоты**, не выдуманный WS.

[Математик]: ОДНО поле `/quota`, снимающее удержание: **`bufferFreeBytes`** (уже в семье полей сверх квоты). Предикат на клиенте: hold снят, когда `bufferFreeBytes > 0`. Верно при пробах паузы: пауза занимает байты, но не обязательно заполняет буфер до отказа; «пусто» не требуется. Альтернатива `sampleCount===0` ломает M2. Не `usedBytes===0`.

[Верстальщик]: В wiring hold закрывает только запись пробы (`wiring.ts:49`). Индикатор: badge «буфер держит» vs «можно писать» от `bufferFreeBytes`, без требования «0 проб». Пауза сессии — отдельная плашка на device-board, не путать с overflow-hold Студии.

[Архитектор]: `no-space` на `moveBatch` (`samples.service.ts:358-373`) — не ретрай-в-цикле до вечности. Исход: сессия → `paused_no_space`, выборка не частично « conceals success»; rollback транзакции переноса или не коммитить close. Выход: освободить место в библиотеке/кольце (M4) или ручной retry; closer не открывает next.

[Структурщик]: Переиспользование с причиной: (а) ranking+measure из downgrade-archive — те же три критерия/замер, (б) moveBatch — единственный вынос из буфера, (в) removeWithProof + исходы `removed|already_absent|failed` (`blob-removal-proof.ts:22`) — единственное доказательство, (г) office `@Cron` — единственные часы-будильник. Новое: сущность Session + SessionCloseRunner + internal wake из office + предикат release ≠ buffer-empty.

[Teamlead]: Серия `device_buffer_full`: N отказов подряд (порог: 3 в окне 2 мин или первый отказ при already past soft-deadline) → вход «закрыть по полному буферу», тот же singleflight. Отказ `device_buffer_full` **в паузе**: не стартовать close повторно от каждого upload-fail; пауза уже non-accepting для next — копить отказы в счётчик, retry close только по ручному/будильнику office.

[Музыкант]: Сбой mid-close: если measure упал целиком — ветка владельца, не дежурство. Если moveBatch `no-space` — пауза. Если removeWithProof `failed` на элементе — не confirmed release; сессия `paused_close_failed`; next не открыть. `already_absent` = успех идемпотентности. Повтор close идемпотентен: выборка уже в папке не двигается дважды (idemp-ключ closeRunId).

[Математик]: Частота будильника: min session 30 мин. Cron office `*/5 * * * *` UTC (как класс cold-archive hourly, но чаще) сканирует sessions where status=active AND (endsAt<=now OR closeRequested). Открытие next: отдельный тик того же cron — candidates status=ready_to_open AFTER releaseConfirmedAt IS NOT NULL. Не media-cron.

[Верстальщик]: Ручной выход из паузы: первичная кнопка «Повторить закрытие», вторичная «Открыть буфер / ручная очистка» (существующий buffer-cleanup UI). Текст паузы дословный причине: нет места в библиотеке / не удалось удалить остаток / жду освобождения. Без «что-то пошло не так».

[Архитектор]: Граница M2/M3: T4 = close pipeline до releaseConfirmed. Пробы, принятые после close-start с меткой pause/next, не входят в remainder closed и не удаляются. Буфер «держит только пробы паузы» — success path, не error. M1 поля политики не переоткрываем; критерий и N уже на сессии.

[Структурщик]: Internal API office→media: `POST /internal/session-close/tick` (или wake per device), auth как sweep. Не приборный ключ. Runner в том же процессе media, что blob; live rm под `PURGE_LIVE_ENABLED`. Dual media replica: конфиг/ops запрет, runner при старте может fail-fast если detection replica>1 — но это ops-след ADR-0032, не distributed lock.

[Teamlead]: Вердикт собираю. Кто будит — office cron ≤5 мин. Кто исполняет — media SessionCloseRunner. Выборка — measure+modeOrder, отказ→last N. Вынос — moveBatch в папку сессии; no-space→пауза. Остаток — removeWithProof. Release — предикат «нет проб closed-session», не zero. Поле — `bufferFreeBytes`. Gонки — singleflight. Паузы — с retry. Ключ — PURGE_LIVE_ENABLED. Одна media на live rm.

[Музыкант]: Помеченные «хранить» уходят moveBatch вместе с выборкой, сверх N — слово владельца. Остаток без mark и вне выборки — в removeWithProof. Не freeze-архив: это не tariff path, не путать с DowngradeArchiveBatch.

[Математик]: Идемпотентность remainder: для каждого storageRef closed\selection: proof ∈ {removed, already_absent}; failed→не confirm. Confirmed release ⇔ (all proofs ok) ∧ (count buffer samples with closedSessionId == 0). Pause samples: sessionId=nextDraft|null-pause, не closed.

[Верстальщик]: Принимаю `bufferFreeBytes` как единственный сигнал снятия hold с сервера. Не плодим второе поле «sessionReleased». Клиент не интерпретирует session state для overflow-hold — только квоту; session pause — отдельный баннер.

[Архитектор]: Форма закрыта. Цена альтернативы «cron в media» — нарушение факта «в media своих @Cron нет» и дублирование часов office. Цена «push на прибор» — нет канала. Цена buffer-cleanup — нет proof, не тот ключ. Рекомендация: office wake + media runner, без ADR-паузы если укладываемся в ADR-0032.

[Структурщик]: Принимаю. Публичные имена: `SessionCloseRunner`, `releaseConfirmed`, `closeRunId`; не `BufferCleanupSession`, не `purgeSessionBuffer` без proof-типа. Зависимость: media → plugin-handlers measure (как downgrade), office → HTTP media internal.

[Teamlead]: LGTM на форму машины. M4 не колонизируем. DoD — только Q3. Прогон 1–2 ошибки названы и закрыты конструкцией. Принимаю.

[Музыкант]: Принимаю порядок потока и ветку pause на full buffer. Дежурство при measure-refuse — не встаёт, по владельцу.

[Математик]: Принимаю предикаты release и last-N ветку.

[Верстальщик]: Принимаю. UI-обязательства паузы — в DoD презентационно минимальны: статусы и одно поле квоты.

[Архитектор]: Принимаю.

[Структурщик]: Принимаю.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Кто будит конец и open next | **Office** `@Cron` UTC, период **≤ 5 мин** (min session 30 мин). Media **не** вводит `@Cron`. Тик: active с `endsAt≤now` / `closeRequested` / порог series `device_buffer_full`; отдельно candidates на open после `releaseConfirmed`. |
| Что исполняет закрытие | **background-media `SessionCloseRunner`** (internal wake от office). Не buffer-cleanup, не кабинет, не клиент. |
| Что переиспользуется (причина) | **measureSampleSet + modeOrderOf/modeOrder** — те же критерии/замер; **samples.moveBatch** — единственный вынос из буфера; **BlobStorageService.removeWithProof** (+ исходы proof) — единственное доказанное rm; **office cron-паттерн** — единственный будильник; **PURGE_LIVE_ENABLED** — тот же второй ключ live-rm, что у purge-gc. |
| Выборка | Ранжирование набора сессии; N по политике. **Отказ замера целиком** → последние N по `Sample.createdAt`, статус сессии «выборка без замера», остаток удаляется, **дежурство не встаёт**. |
| Вынос + «хранить» | `moveBatch` выборки **и** помеченных «хранить» в **папку сессии** (устройство папки — M4). |
| Отказ `no-space` | Close **не** confirmed; статус `paused_no_space`; next **не** открывать; ручной/последующий retry после места; без вечного auto-spin. |
| Удаление остатка | Только **removeWithProof** по остатку closed-session (не selection, не keep, не pause/next). `blobs.delete` / buffer-cleanup — запрещены для этого контура. |
| «Освобождение подтверждено» (M2) | **Не** «буфер=0». Предикат: в буфере **нет** проб closed session; пробы **паузы/следующей** законны. Далее open next. |
| Одно поле `/quota` | **`bufferFreeBytes`**: hold записи снимается при `bufferFreeBytes > 0`. Верно при пробах паузы (занятость ≠ полная блокировка места). Не count=0. |
| Как прибор узнаёт | Опрос `GET /quota` (30/60 с при hold). **Нет** мгновенного media→device канала. `release('cleanup')` — только локальная очистка Студии, не серверный closer. |
| Гонка входов close | Singleflight на device+session: срок, full-buffer trigger, ручной повтор — один runner; остальные join/no-op. |
| Серия `device_buffer_full` | Порог (рекоменд. ≥3 в ~2 мин или policy) → `closeRequested`. **В паузе** upload-fail не размножает parallel close; retry — cron/ручной. |
| Паузы | `paused_no_space` / `paused_close_failed` / `paused_release` (ждём confirm) — у каждой **исполнимый выход**: retry close, ручная очистка buffer-cleanup UI, ожидание `bufferFreeBytes>0` + повтор tick. Не вечные. |
| Сбой mid-pipeline | Идемпотентный `closeRunId`; partial move не открывает next; proof `failed` → pause; `already_absent` OK. |
| Несколько процессов media | При live rm **вторая реплика media запрещена** (ADR-0032 Р2/Д1); замок in-process. |
| Не решает M3 | Папка/кольцо (M4), поля политики (M1), правила границы T* (M2) — **не переоткрыты**. |

### Список посылок

1. **норма** · Данности · Вердикт M2  
   [Архитектор]: «Открытие следующей — только после confirmed release; иначе пауза с ручным выходом — норма M2, не переоткрываем.»  
   [Математик]: «Вердикт M2: после T4 буфер либо пуст, либо держит только пробы паузы для следующей.»

2. **норма** · Данности · Слово владельца «а» (буфер/пауза)  
   [Музыкант]: «в паузе прибор не пишет в closed, только копит в «пауза→следующая».»  
   [Архитектор]: «Пробы, принятые после close-start с меткой pause/next, не входят в remainder closed и не удаляются.»

3. **норма** · Данности · Т2 выборка в библиотеку  
   [Teamlead]: «Выборка — measure+modeOrder, отказ→last N. Вынос — moveBatch в папку сессии;»

4. **норма** · Данности · Владелец 21.11 разрешение на удаление  
   [Teamlead]: «Владелец 21.11: «включение сессии дает разрешение на удаление» — closer не ходит в UI-confirm buffer-cleanup.»

5. **норма** · Данности · Владелец 21.11 («А») «хранить» сверх N  
   [Музыкант]: «Помеченные «хранить» уходят moveBatch вместе с выборкой, сверх N — слово владельца.»

6. **норма** · Данности · Владелец 21.11 («А») отказ замера  
   [Математик]: «По слову владельца 21.11 («А»): при полном отказе — последние N по `createdAt`, сессия → «выборка без замера», остаток удаляется, дежурство не встаёт.»

7. **факт** · Фактура · ранжирование и замер  
   [Математик]: «Выборка переиспользует `modeOrderOf`/`modeOrder` (`downgrade-archive.service.ts:151`, `:160`) и `handlers.measureSampleSet` (`:238-252`).»  
   [Математик]: «Отказ замера всегда на весь набор: `empty-set | floor-not-measured | nothing-decodable` (`executor.ts:59`).»

8. **факт** · Фактура · removeWithProof  
   [Структурщик]: «Удаление с доказательством — только `removeWithProof` (`blob-storage.service.ts:73-74`), не `blobs.delete`.»  
   [Математик]: «для каждого storageRef closed\selection: proof ∈ {removed, already_absent}; failed→не confirm.»

9. **факт** · Фактура · buffer-cleanup непригоден  
   [Структурщик]: «Не `buffer-cleanup`: ключ прибора, план oldest|newest×N, показ человеку, отказ помеченным — `buffer-cleanup.controller.ts:32`, `buffer-cleanup.service.ts:78-83`, `:10-13`, `:139-141`.»

10. **факт** · Фактура · move / moveBatch / no-space  
    [Структурщик]: «Вынос только `samples.move` / `samples.moveBatch` (`samples.service.ts:324`, `:384`).»  
    [Архитектор]: «`no-space` на `moveBatch` (`samples.service.ts:358-373`) — не ретрай-в-цикле до вечности.»

11. **факт** · Фактура · device_buffer_full  
    [Музыкант]: «`device_buffer_full` — отказ приёма на полном буфере (`buffer-overflow-refusal.ts:45`);»

12. **факт** · Фактура · прибор /quota / hold  
    [Верстальщик]: «Удержание снимается опросом `GET /quota` (тик 30 с / опрос 60 с при hold).»  
    [Музыкант]: «Канала мгновенной доставки у media нет — факт.»  
    [Математик]: «ОДНО поле `/quota`, снимающее удержание: **`bufferFreeBytes`**»

13. **факт** · Фактура · будильник office, не media  
    [Архитектор]: «В media своих `@Cron` нет — факт ствола.»  
    [Математик]: «Cron office `*/5 * * * *` UTC … Не media-cron.»

14. **факт** · Фактура · PURGE_LIVE_ENABLED и одна реплика  
    [Структурщик]: «Второй ключ боевого удаления: `PURGE_LIVE_ENABLED` (`env.schema.ts:75`).»  
    [Структурщик]: «при боевом удалении вторая реплика media запрещена.»

15. **план** · Вопрос M3 · машина  
    [Teamlead]: «Кто будит — office cron ≤5 мин. Кто исполняет — media SessionCloseRunner.»  
    [Архитектор]: «Форма: `SessionCloseRunner` в background-media; office только будит internal-дверью, как cold-archive-sweep.»

16. **норма** · Данности · часы Sample.createdAt, сессия серверная  
    [Математик]: «Часы — `Sample.createdAt` на сервере записей.»

---

**Definition of Done (Q3 only):**

1. Office scheduler (UTC cron ≤5 мин) будит internal close/open tick media; в media нет нового `@Cron` сессий.
2. `SessionCloseRunner` в media: singleflight close; ветки measure+modeOrder / last-N без дежурства; moveBatch selection+keep → папка сессии; remainder только `removeWithProof` под `PURGE_LIVE_ENABLED`.
3. `releaseConfirmed` = нет проб closed-session в буфере (pause samples допустимы); next session только после него.
4. Документирован клиентский предикат hold: одно поле **`bufferFreeBytes > 0`** из `GET /quota`; без нового push-канала.
5. Паузы `no-space` / proof-failed / await-release — с retry или ручным выходом; series `device_buffer_full` не плодит parallel close.
6. Ops: live rm при >1 media replica = запрет (ADR-0032); тесты идемпотентности closeRun и предиката release ≠ buffer empty.
7. **Не** в DoD: схема папки/кольца (M4), поля политики (M1), пересмотр T-границ (M2).

---

*Реплик в диалоге: 60; каждый участник высказался не менее одного раза.*
